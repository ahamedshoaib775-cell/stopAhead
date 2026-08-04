// osmService.js - OpenStreetMap (Nominatim + Leaflet + OpenRouteService) integration service

/**
 * Get optional OpenRouteService API key from environment variable
 */
export function getOpenRouteServiceKey() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_OPENROUTESERVICE_API_KEY || import.meta.env.OPENROUTESERVICE_API_KEY || '';
  }
  return '';
}

/**
 * Nominatim Free Geocoding Search (OpenStreetMap)
 * Searches for bus stops, train stations, metro stations, and public transit places.
 * Supports locationBias ({ lat, lng, delta, bounded })
 */
/**
 * Nominatim Free Geocoding Search (OpenStreetMap)
 * Searches for bus stops, train stations, metro stations, and public transit places.
 * Supports hard location bounding (bounded=1)
 */
export async function searchNominatimPlaces(query, locationBias = null) {
  if (!query || query.trim().length < 2) return [];

  try {
    let searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&addressdetails=1&limit=10`;

    if (locationBias && locationBias.lat && locationBias.lng) {
      // Tight bounding box: delta = 0.12 (~12-15km radius around user)
      const delta = locationBias.delta || 0.12;
      const minLon = (locationBias.lng - delta).toFixed(4);
      const maxLat = (locationBias.lat + delta).toFixed(4);
      const maxLon = (locationBias.lng + delta).toFixed(4);
      const minLat = (locationBias.lat - delta).toFixed(4);
      const viewboxStr = `${minLon},${maxLat},${maxLon},${minLat}`;
      // Force bounded=1 (hard filter) unless explicitly overridden
      const boundedStr = locationBias.bounded === false ? '0' : '1';
      searchUrl += `&viewbox=${viewboxStr}&bounded=${boundedStr}`;
    }

    const response = await fetch(searchUrl, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'StopAheadTransitApp/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((item) => ({
      id: `osm-${item.place_id}`,
      name: item.display_name.split(',')[0],
      description: item.display_name.split(',').slice(1, 3).join(',').trim(),
      code: item.display_name.slice(0, 3).toUpperCase(),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      isOsmPlace: true
    }));
  } catch (err) {
    console.warn('Nominatim API search error:', err.message);
    return [];
  }
}

/**
 * Overpass API Live OpenStreetMap Query for nearby transit stops filtered by transport mode
 */
export async function fetchOverpassNearbyStops(lat, lng, radiusMeters = 2500, transportMode = 'bus') {
  if (!lat || !lng) return [];

  let modeFilter = '';
  if (transportMode === 'metro') {
    modeFilter = `node["railway"="station"]["station"="subway"](around:${radiusMeters},${lat},${lng});node["railway"="subway_entrance"](around:${radiusMeters},${lat},${lng});node["station"="subway"](around:${radiusMeters},${lat},${lng});`;
  } else if (transportMode === 'train') {
    modeFilter = `node["railway"="station"](around:${radiusMeters},${lat},${lng});node["public_transport"="station"]["train"="yes"](around:${radiusMeters},${lat},${lng});`;
  } else if (transportMode === 'local_train') {
    modeFilter = `node["railway"="halt"](around:${radiusMeters},${lat},${lng});node["railway"="station"](around:${radiusMeters},${lat},${lng});node["public_transport"="station"](around:${radiusMeters},${lat},${lng});`;
  } else {
    // Default 'bus'
    modeFilter = `node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});node["amenity"="bus_station"](around:${radiusMeters},${lat},${lng});node["public_transport"="platform"](around:${radiusMeters},${lat},${lng});`;
  }

  const overpassQuery = `[out:json][timeout:15];(${modeFilter});out body 30;`;

  try {
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.elements && data.elements.length > 0) {
        const R = 6371; // km
        const seenNames = new Set();

        const stops = data.elements
          .map((el) => {
            const itemLat = el.lat || el.center?.lat;
            const itemLng = el.lon || el.center?.lon;
            if (!itemLat || !itemLng) return null;

            const tags = el.tags || {};
            const stopName = tags.name || tags['name:en'] || tags.operator || (tags.ref ? `Stop ${tags.ref}` : null);
            if (!stopName) return null;

            // Distance calculation
            const dLat = ((itemLat - lat) * Math.PI) / 180;
            const dLon = ((itemLng - lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat * Math.PI) / 180) *
                Math.cos((itemLat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distKm = parseFloat((R * c).toFixed(1));

            const typeLabels = {
              bus: tags.amenity === 'bus_station' ? 'Bus Station' : 'Bus Stop',
              train: 'Railway Station',
              metro: tags.railway === 'subway_entrance' ? 'Metro Entrance' : 'Metro Station',
              local_train: tags.railway === 'halt' ? 'Suburban Halt' : 'Local Railway Station'
            };

            const typeLabel = typeLabels[transportMode] || 'Transit Stop';

            return {
              id: `overpass-${el.id}`,
              name: stopName,
              description: `${typeLabel} • ${tags.operator || tags.network || 'OpenStreetMap Transit'}`,
              lat: itemLat,
              lng: itemLng,
              distKm,
              transportMode,
              isOsmPlace: true
            };
          })
          .filter((s) => {
            if (!s) return false;
            const key = `${s.name.toLowerCase()}-${s.distKm}`;
            if (seenNames.has(key)) return false;
            seenNames.add(key);
            return true;
          })
          .sort((a, b) => a.distKm - b.distKm);

        if (stops.length > 0) {
          return stops;
        }
      }
    }
  } catch (err) {
    console.warn('Overpass API error, falling back to Nominatim live search:', err.message);
  }

  // Fallback to Nominatim live transit query if Overpass is unavailable
  return fetchNearbyTransitStops(lat, lng, transportMode);
}

/**
 * Automatically fetch nearby public transit stops/stations around coordinates (within ~2 km)
 */
export async function fetchNearbyTransitStops(lat, lng) {
  if (!lat || !lng) return [];

  try {
    const delta = 0.025; // ~2.5 km viewbox
    const minLon = (lng - delta).toFixed(4);
    const maxLat = (lat + delta).toFixed(4);
    const maxLon = (lng + delta).toFixed(4);
    const minLat = (lat - delta).toFixed(4);
    const viewboxStr = `${minLon},${maxLat},${maxLon},${minLat}`;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=bus+stop+station+transit&addressdetails=1&limit=12&viewbox=${viewboxStr}&bounded=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'StopAheadTransitApp/1.0'
      }
    });

    if (!response.ok) return [];
    const data = await response.json();

    const R = 6371; // Earth radius in km
    return data.map((item) => {
      const itemLat = parseFloat(item.lat);
      const itemLng = parseFloat(item.lon);
      const dLat = ((itemLat - lat) * Math.PI) / 180;
      const dLon = ((itemLng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((itemLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distKm = parseFloat((R * c).toFixed(1));

      return {
        id: `nearby-osm-${item.place_id}`,
        name: item.display_name.split(',')[0],
        description: item.display_name.split(',').slice(1, 3).join(',').trim(),
        lat: itemLat,
        lng: itemLng,
        distKm
      };
    }).sort((a, b) => a.distKm - b.distKm);
  } catch (err) {
    console.warn('Failed to fetch nearby transit stops:', err);
    return [];
  }
}

/**
 * Reverse Geocode Latitude/Longitude to detect City/Town/Locality Name
 */
export async function reverseGeocodeLocation(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'StopAheadTransitApp/1.0'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const address = data.address || {};
    const city = address.city || address.town || address.village || address.suburb || address.county || address.state;
    return city || 'Nearby Area';
  } catch (e) {
    console.warn('Reverse geocoding failed:', e);
    return null;
  }
}

/**
 * Geocode Manual City Name to Lat/Lng Coordinates
 */
export async function geocodeCity(cityName) {
  if (!cityName || !cityName.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      cityName
    )}&limit=1&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'StopAheadTransitApp/1.0'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.length > 0) {
      const item = data[0];
      return {
        name: item.display_name.split(',')[0] || cityName,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      };
    }
  } catch (e) {
    console.warn('Geocoding city failed:', e);
  }
  return null;
}

/**
 * Calculate Route Polyline & Distance between Coordinates (Free OSRM / OpenRouteService)
 */
export async function fetchOSRMRoute(startLat, startLng, endLat, endLng, transportMode = 'bus') {
  const modeSpeedKmH = {
    bus: 25,
    metro: 40,
    local_train: 45,
    train: 65
  }[transportMode] || 30;

  try {
    const key = getOpenRouteServiceKey();
    let url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    if (key) {
      url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${key}&start=${startLng},${startLat}&end=${endLng},${endLat}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('OSRM routing network error');
    }

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distKm = (route.distance || route.summary.distance) / 1000;
      // Tailor ETA to the selected vehicle type speed profile
      const durationMins = Math.max(1, Math.ceil((distKm / modeSpeedKmH) * 60));
      const coordinates = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]); // [lat, lng]

      return {
        success: true,
        distKm: parseFloat(distKm.toFixed(1)),
        durationMins,
        transportMode,
        coordinates
      };
    }
  } catch (err) {
    console.warn('OSRM routing error, using straight-line calculation:', err.message);
  }

  // Fallback straight-line calculation
  const R = 6371;
  const dLat = ((endLat - startLat) * Math.PI) / 180;
  const dLon = ((endLng - startLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((startLat * Math.PI) / 180) *
      Math.cos((endLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distKm = parseFloat((R * c).toFixed(1));

  return {
    success: true,
    distKm,
    durationMins: Math.max(1, Math.ceil((distKm / modeSpeedKmH) * 60)),
    transportMode,
    coordinates: [
      [startLat, startLng],
      [endLat, endLng]
    ]
  };
}

/**
 * City GTFS Feed Loader & Fallback Parser
 */
export async function loadCityGTFSFeed(cityCode = 'demo') {
  // Try fetching public GTFS feed endpoint or fallback to local dataset
  try {
    if (cityCode === 'demo') {
      return { success: true, isMock: true, feedName: 'OpenStreetMap Mock Transit Database' };
    }
  } catch (e) {
    console.warn('GTFS feed unavailable for city, falling back to manual tracking:', e);
  }
  return { success: false, isMock: true, feedName: 'Manual Transit Mode' };
}
