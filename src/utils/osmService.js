// osmService.js - OpenStreetMap (Nominatim + Leaflet + Overpass + OSRM) integration service

/**
 * Nominatim Free Geocoding Search (OpenStreetMap)
 * Restricted to location search bias with hard bounding box support
 */
export async function searchNominatimPlaces(query, locationBias = null) {
  if (!query || query.trim().length < 2) return [];

  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`;

    if (locationBias && locationBias.lat && locationBias.lng) {
      const delta = locationBias.delta || 0.12; // ~12 km bounding box
      const minLng = locationBias.lng - delta;
      const maxLng = locationBias.lng + delta;
      const minLat = locationBias.lat - delta;
      const maxLat = locationBias.lat + delta;

      url += `&viewbox=${minLng},${maxLat},${maxLng},${minLat}`;
      if (locationBias.bounded) {
        url += '&bounded=1';
      }
    }

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'StopAheadTransitApp/2.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.statusText}`);
    }

    const data = await response.json();

    return data.map((item) => {
      const mainName = item.name || item.display_name.split(',')[0];
      const details = item.display_name.split(',').slice(1, 3).join(',').trim();

      return {
        id: item.place_id ? String(item.place_id) : `osm-${item.lat}-${item.lon}`,
        name: mainName,
        description: details || item.type || 'OpenStreetMap Location',
        code: mainName.slice(0, 3).toUpperCase(),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        isOsm: true
      };
    });
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

  try {
    let filterTag = '[highway=bus_stop]';
    if (transportMode === 'train') filterTag = '[railway=station]';
    else if (transportMode === 'metro' || transportMode === 'subway') filterTag = '[railway~"station|subway_entrance"]';
    else if (transportMode === 'ferry') filterTag = '[amenity=ferry_terminal]';

    const overpassQuery = `
      [out:json][timeout:12];
      (
        node${filterTag}(around:${radiusMeters},${lat},${lng});
      );
      out body 25;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.elements && data.elements.length > 0) {
      const parsedStops = data.elements
        .filter((node) => node.tags && (node.tags.name || node.tags['name:en']))
        .map((node) => {
          const stopLat = node.lat;
          const stopLng = node.lon;

          // Calculate distance in km
          const radlat1 = (Math.PI * lat) / 180;
          const radlat2 = (Math.PI * stopLat) / 180;
          const theta = lng - stopLng;
          const radtheta = (Math.PI * theta) / 180;
          let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
          dist = Math.min(1, dist);
          dist = Math.acos(dist);
          dist = (dist * 180) / Math.PI;
          dist = dist * 60 * 1.1515 * 1.609344;

          const stopName = node.tags.name || node.tags['name:en'] || 'Transit Stop';

          return {
            id: `overpass-${node.id}`,
            name: stopName,
            description: node.tags.operator || node.tags.network || `${transportMode.toUpperCase()} Node`,
            lat: stopLat,
            lng: stopLng,
            distKm: parseFloat(dist.toFixed(1)),
            transportMode
          };
        })
        .sort((a, b) => a.distKm - b.distKm);

      if (parsedStops.length > 0) return parsedStops;
    }

    // Fallback to Nominatim search if Overpass returns 0 results
    const fallbackQuery = `${transportMode} station`;
    const locationBias = { lat, lng, delta: 0.12, bounded: true };
    const fallbackPlaces = await searchNominatimPlaces(fallbackQuery, locationBias);
    return fallbackPlaces.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      lat: p.lat,
      lng: p.lng,
      distKm: 1.5,
      transportMode
    }));
  } catch (err) {
    console.warn('Overpass API error, falling back to Nominatim:', err.message);
    return [];
  }
}

/**
 * Reverse geocode coordinates to find city / locality name using Nominatim
 */
export async function reverseGeocodeLocation(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'StopAheadTransitApp/2.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const cityName = addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Current Location';
      return cityName;
    }
    return 'Detected Location';
  } catch (err) {
    return 'Detected Location';
  }
}

/**
 * Geocode city name to lat/lng coordinates using Nominatim
 */
export async function geocodeCity(cityName) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'StopAheadTransitApp/2.0'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data[0]) {
        return {
          name: data[0].display_name.split(',')[0] || cityName,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Calculate Route Polyline & Distance between Coordinates (Free OSRM)
 */
export async function fetchOSRMRoute(startLat, startLng, endLat, endLng, transportMode = 'bus') {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('OSRM routing network error');
    }

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distKm = parseFloat((route.distance / 1000).toFixed(1));

      // Speed profile multiplier based on transit vehicle mode
      let speedKmH = 30; // default bus speed
      if (transportMode === 'metro' || transportMode === 'subway') speedKmH = 45;
      else if (transportMode === 'train') speedKmH = 55;
      else if (transportMode === 'walk') speedKmH = 5;

      const durationMins = Math.max(2, Math.ceil((distKm / speedKmH) * 60));

      const coordinates = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);

      return {
        success: true,
        distKm,
        durationMins,
        coordinates
      };
    }
    throw new Error('No route polyline returned from OSRM');
  } catch (err) {
    console.warn('OSRM routing error, using straight-line calculation:', err.message);

    // Fallback: Straight-Line Segment
    const radlat1 = (Math.PI * startLat) / 180;
    const radlat2 = (Math.PI * endLat) / 180;
    const theta = startLng - endLng;
    const radtheta = (Math.PI * theta) / 180;
    let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.min(1, dist);
    dist = Math.acos(dist);
    dist = (dist * 180) / Math.PI;
    dist = dist * 60 * 1.1515 * 1.609344;
    const fallbackDist = parseFloat(dist.toFixed(1));

    return {
      success: true,
      distKm: fallbackDist,
      durationMins: Math.max(2, Math.ceil(fallbackDist * 2.2)),
      coordinates: [[startLat, startLng], [endLat, endLng]]
    };
  }
}
