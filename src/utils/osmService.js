// osmService.js - OpenStreetMap (Nominatim + Leaflet + Overpass + OSRM) integration service

/**
 * Nominatim Free Geocoding Search (OpenStreetMap)
 * Searches across ALL OSM place types (shops, malls, landmarks, addresses, businesses)
 * Biased/restricted to user's current city/area using viewbox + bounded=1
 */
export async function searchNominatimPlaces(query, locationBias = null) {
  if (!query || query.trim().length < 2) return [];

  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`;

    if (locationBias && locationBias.lat && locationBias.lng) {
      const delta = locationBias.delta || 0.15; // ~15 km bounding box around user's live coordinates
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
        description: details || item.type || 'OpenStreetMap Place',
        code: mainName.slice(0, 3).toUpperCase(),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type || item.class || 'place',
        isOsm: true,
        isPlace: true
      };
    });
  } catch (err) {
    console.warn('Nominatim API search error:', err.message);
    return [];
  }
}

/**
 * Overpass API Live OpenStreetMap Query for nearby transit stops strictly filtered by transport mode
 */
export async function fetchOverpassNearbyStops(lat, lng, radiusMeters = 2500, transportMode = 'bus') {
  if (!lat || !lng) return [];

  try {
    let filterTag = '[highway=bus_stop]';
    if (transportMode === 'train') filterTag = '[railway~"station|halt"]';
    else if (transportMode === 'metro' || transportMode === 'subway') filterTag = '[railway~"station|subway_entrance"][station=subway]';
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
            description: node.tags.operator || node.tags.network || `${transportMode.toUpperCase()} Station`,
            lat: stopLat,
            lng: stopLng,
            distKm: parseFloat(dist.toFixed(1)),
            transportMode
          };
        })
        .sort((a, b) => a.distKm - b.distKm);

      if (parsedStops.length > 0) return parsedStops;
    }

    // Fallback query for mode-specific stations
    let fallbackQuery = `${transportMode} station`;
    if (transportMode === 'metro') fallbackQuery = 'metro station';
    else if (transportMode === 'train') fallbackQuery = 'railway station';
    else if (transportMode === 'bus') fallbackQuery = 'bus stop';

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
 * Query Overpass API for intermediate stations along a Metro / Local Train line between origin and destination coordinates
 */
export async function fetchMetroLineStops(originLat, originLng, destLat, destLng, transportMode = 'metro') {
  if (!originLat || !destLat) return [];

  try {
    let filterTag = '[railway~"station|subway_entrance"]';
    if (transportMode === 'train') filterTag = '[railway~"station|halt"]';

    const minLat = Math.min(originLat, destLat) - 0.05;
    const maxLat = Math.max(originLat, destLat) + 0.05;
    const minLng = Math.min(originLng, destLng) - 0.05;
    const maxLng = Math.max(originLng, destLng) + 0.05;

    const overpassQuery = `
      [out:json][timeout:12];
      (
        node${filterTag}(${minLat},${minLng},${maxLat},${maxLng});
      );
      out body 30;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.elements && data.elements.length > 0) {
        const stations = data.elements
          .filter((n) => n.tags && (n.tags.name || n.tags['name:en']))
          .map((n) => ({
            id: `metro-line-node-${n.id}`,
            name: n.tags.name || n.tags['name:en'],
            lat: n.lat,
            lng: n.lon
          }));

        if (stations.length > 0) return stations;
      }
    }
  } catch (err) {
    console.warn('Overpass metro line query error:', err.message);
  }

  return [];
}

/**
 * Automatically fetch the nearest transit stop to a given target coordinate (e.g. store, mall, landmark)
 * Expands search radius from 1.5 km up to 10 km if needed
 */
export async function fetchNearestTransitStopToPoint(targetLat, targetLng, transportMode = 'bus') {
  if (!targetLat || !targetLng) return null;

  try {
    // 1. Try tight 1.5 km radius
    let stops = await fetchOverpassNearbyStops(targetLat, targetLng, 1500, transportMode);

    // 2. Expand to 5 km if nothing found
    if (!stops || stops.length === 0) {
      stops = await fetchOverpassNearbyStops(targetLat, targetLng, 5000, transportMode);
    }

    // 3. Expand to 10 km if still nothing found
    if (!stops || stops.length === 0) {
      stops = await fetchOverpassNearbyStops(targetLat, targetLng, 10000, transportMode);
    }

    if (stops && stops.length > 0) {
      const nearestStop = stops[0];
      const gapKm = parseFloat(nearestStop.distKm.toFixed(1));
      const walkingMins = Math.max(1, Math.round(gapKm * 12)); // ~12 mins per km walking speed

      return {
        nearestStop,
        gapKm,
        walkingMins,
        isFarGap: gapKm > 1.5,
        isVeryFarGap: gapKm > 5.0
      };
    }

    return {
      nearestStop: {
        id: `resolved-stop-${targetLat}-${targetLng}`,
        name: `Nearest ${transportMode.toUpperCase()} Station`,
        description: `Closest Transit Point`,
        lat: targetLat,
        lng: targetLng,
        distKm: 0.1,
        transportMode
      },
      gapKm: 0.1,
      walkingMins: 1,
      isFarGap: false,
      isVeryFarGap: true
    };
  } catch (err) {
    return null;
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

      let speedKmH = 30;
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
