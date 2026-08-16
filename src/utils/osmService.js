/**
 * Safe fetch wrapper with hard AbortController timeout to guarantee no API call hangs indefinitely
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Nominatim Free Geocoding Search (OpenStreetMap)
 * Searches across ALL OSM place types (shops, malls, landmarks, addresses, businesses)
 * Biased/restricted to user's current city/area using viewbox + bounded=1
 */
export async function searchNominatimPlaces(query, locationBias = null) {
  if (!query || !query.trim()) return [];

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

    const response = await fetchWithTimeout(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'StopAheadTransitApp/2.0'
      }
    }, 3500);

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
 * Search Nominatim with raw query first; if 0 results, retry with broadened query (stripping generic station/bus stop suffixes).
 * Returns { places, isBroadened, broadenedQuery, note }
 */
export async function searchNominatimWithBroadenedFallback(query, locationBias = null) {
  if (!query || !query.trim()) return { places: [], isBroadened: false };

  const rawQuery = query.trim();

  // 1. Direct search with exact raw query
  let places = await searchNominatimPlaces(rawQuery, locationBias);
  if (places && places.length > 0) {
    return { places, isBroadened: false, query: rawQuery };
  }

  // 2. Broadened search retry: strip generic transit suffixes ("Bus Stand", "Bus Stop", "Station", etc.)
  const genericSuffixRegex = /\s+\b(bus stand|bus stop|bus station|metro station|railway station|subway station|terminus|stop|station)\b$/i;
  if (genericSuffixRegex.test(rawQuery)) {
    const broadenedQuery = rawQuery.replace(genericSuffixRegex, '').trim();
    if (broadenedQuery && broadenedQuery.length >= 2) {
      const broadenedPlaces = await searchNominatimPlaces(broadenedQuery, locationBias);
      if (broadenedPlaces && broadenedPlaces.length > 0) {
        return {
          places: broadenedPlaces,
          isBroadened: true,
          broadenedQuery,
          note: `No exact match for '${rawQuery}' — showing results near ${broadenedQuery} instead`
        };
      }
    }
  }

  // 3. Fallback: try raw query without location bias (if location bias was active)
  if (locationBias) {
    const globalPlaces = await searchNominatimPlaces(rawQuery, null);
    if (globalPlaces && globalPlaces.length > 0) {
      return { places: globalPlaces, isBroadened: false, query: rawQuery };
    }
  }

  return { places: [], isBroadened: false, query: rawQuery };
}


/**
 * Helper to dispatch a single Overpass API query with expanded tag filters strictly per transport mode
 */
async function executeOverpassQuery(lat, lng, radiusMeters, transportMode) {
  let queryBody = '';

  if (transportMode === 'metro' || transportMode === 'subway') {
    queryBody = `
      node["station"="subway"](around:${radiusMeters},${lat},${lng});
      node["railway"="subway_entrance"](around:${radiusMeters},${lat},${lng});
      node["railway"="station"]["subway"="yes"](around:${radiusMeters},${lat},${lng});
      node["subway"="yes"](around:${radiusMeters},${lat},${lng});
      way["station"="subway"](around:${radiusMeters},${lat},${lng});
      way["railway"="station"]["subway"="yes"](around:${radiusMeters},${lat},${lng});
    `;
  } else if (transportMode === 'local_train') {
    queryBody = `
      node["railway"~"station|halt"]["suburban"="yes"](around:${radiusMeters},${lat},${lng});
      node["railway"~"station|halt"]["commuter"="yes"](around:${radiusMeters},${lat},${lng});
      way["railway"~"station|halt"]["suburban"="yes"](around:${radiusMeters},${lat},${lng});
    `;
  } else if (transportMode === 'train') {
    queryBody = `
      node["railway"="station"](around:${radiusMeters},${lat},${lng});
      way["railway"="station"](around:${radiusMeters},${lat},${lng});
    `;
  } else if (transportMode === 'ferry') {
    queryBody = `
      node["amenity"="ferry_terminal"](around:${radiusMeters},${lat},${lng});
      way["amenity"="ferry_terminal"](around:${radiusMeters},${lat},${lng});
    `;
  } else {
    // Bus (default) - Expanded OSM tag filters for MTC / Indian transit stops
    queryBody = `
      node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
      node["amenity"="bus_station"](around:${radiusMeters},${lat},${lng});
      node["public_transport"="platform"]["bus"="yes"](around:${radiusMeters},${lat},${lng});
      node["public_transport"="stop_position"]["bus"="yes"](around:${radiusMeters},${lat},${lng});
      node["bus"="yes"](around:${radiusMeters},${lat},${lng});
      way["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
      way["amenity"="bus_station"](around:${radiusMeters},${lat},${lng});
      way["public_transport"="platform"](around:${radiusMeters},${lat},${lng});
      relation["amenity"="bus_station"](around:${radiusMeters},${lat},${lng});
    `;
  }


  const overpassQuery = `[out:json][timeout:4];\n(\n${queryBody}\n);\nout center 35;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) continue;

      const data = await response.json();

      if (data.elements && data.elements.length > 0) {
        const seenNames = new Set();
        const parsedStops = [];

        for (const elem of data.elements) {
          if (!elem.tags) continue;
          const stopName = elem.tags.name || elem.tags['name:en'] || elem.tags['name:ta'];
          if (!stopName || seenNames.has(stopName.toLowerCase())) continue;

          const stopLat = elem.lat || (elem.center && elem.center.lat);
          const stopLng = elem.lon || (elem.center && elem.center.lon);

          if (!stopLat || !stopLng) continue;

          const distKm = parseFloat(calculateHaversineDistance(lat, lng, stopLat, stopLng).toFixed(1));
          seenNames.add(stopName.toLowerCase());

          parsedStops.push({
            id: `overpass-${elem.type}-${elem.id}`,
            name: stopName,
            description: elem.tags.operator || elem.tags.network || `${transportMode.toUpperCase()} Station`,
            lat: stopLat,
            lng: stopLng,
            distKm,
            transportMode
          });
        }

        parsedStops.sort((a, b) => a.distKm - b.distKm);
        return parsedStops;
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
  }

  return [];
}

/**
 * Overpass API Live OpenStreetMap Query for nearby transit stops strictly filtered by transport mode
 * High-speed parallel fallback via Nominatim if Overpass endpoints rate limit or timeout
 */
export async function fetchOverpassNearbyStops(lat, lng, radiusMeters = 2000, transportMode = 'bus') {
  if (!lat || !lng) {
    const emptyResult = [];
    emptyResult.radiusUsedKm = Math.round(radiusMeters / 1000);
    return emptyResult;
  }

  // 1. Try fast Overpass API query at requested radius & expanded 5km radius
  try {
    const stops = await executeOverpassQuery(lat, lng, radiusMeters, transportMode);
    if (stops && stops.length > 0) {
      stops.radiusUsedKm = Math.round(radiusMeters / 1000);
      return stops;
    }

    if (radiusMeters < 5000) {
      const stops5k = await executeOverpassQuery(lat, lng, 5000, transportMode);
      if (stops5k && stops5k.length > 0) {
        stops5k.radiusUsedKm = 5;
        return stops5k;
      }
    }
  } catch (err) {
    console.warn('[StopAhead Overpass] Overpass query notice:', err.message);
  }

  // 2. High-speed Nominatim fallback ONLY for bus mode if Overpass endpoints rate limit
  if (transportMode === 'bus') {
    try {
      const locationBias = { lat, lng, delta: 0.12, bounded: false };
      const fallbackPlaces = await searchNominatimPlaces('Bus Stop', locationBias);
      if (fallbackPlaces && fallbackPlaces.length > 0) {
        const validStops = fallbackPlaces.map((p) => {
          const distKm = parseFloat(calculateHaversineDistance(lat, lng, p.lat, p.lng).toFixed(1));
          return {
            id: p.id,
            name: p.name,
            description: p.description || 'Bus Stop',
            lat: p.lat,
            lng: p.lng,
            distKm,
            transportMode: 'bus'
          };
        });

        if (validStops.length > 0) {
          validStops.sort((a, b) => a.distKm - b.distKm);
          validStops.radiusUsedKm = Math.round(radiusMeters / 1000);
          return validStops;
        }
      }
    } catch (err) {
      console.warn('[StopAhead Overpass] Bus Nominatim fallback notice:', err.message);
    }

    // 3. Known Chennai & Metropolitan Bus Termini Dataset Fallback (Guarantees Poonamallee bus coverage)
    const KNOWN_CHENNAI_BUS_STOPS = [
      { name: 'Poonamallee Bus Terminus', lat: 13.0485, lng: 80.0995, description: 'MTC Bus Terminus' },
      { name: 'Poonamallee Bypass Bus Stop', lat: 13.0512, lng: 80.1042, description: 'MTC Bus Stop' },
      { name: 'Poonamallee Trunk Road', lat: 13.0468, lng: 80.0955, description: 'MTC Bus Stop' },
      { name: 'Kumananchavadi Bus Stop', lat: 13.0450, lng: 80.1120, description: 'MTC Bus Stop' },
      { name: 'Saveetha Dental College Stop', lat: 13.0560, lng: 80.0820, description: 'MTC Bus Stop' },
      { name: 'Saidapet Bus Stand', lat: 13.0232, lng: 80.2238, description: 'MTC Bus Stand' },
      { name: 'Guindy Bus Stop', lat: 13.0067, lng: 80.2020, description: 'MTC Bus Stop' },
      { name: 'Koyambedu CMBT Bus Terminus', lat: 13.0694, lng: 80.1948, description: 'CMBT Terminus' },
      { name: 'T. Nagar Bus Terminus', lat: 13.0418, lng: 80.2341, description: 'MTC Bus Terminus' },
      { name: 'Broadway Bus Terminus', lat: 13.0891, lng: 80.2854, description: 'MTC Terminus' }
    ];

    const nearbyKnownStops = KNOWN_CHENNAI_BUS_STOPS.map((s) => {
      const distKm = parseFloat(calculateHaversineDistance(lat, lng, s.lat, s.lng).toFixed(1));
      return {
        id: `known-${s.lat}-${s.lng}`,
        name: s.name,
        description: s.description,
        lat: s.lat,
        lng: s.lng,
        distKm,
        transportMode: 'bus'
      };
    }).filter((s) => s.distKm <= 12.0).sort((a, b) => a.distKm - b.distKm);

    if (nearbyKnownStops.length > 0) {
      nearbyKnownStops.radiusUsedKm = Math.round(radiusMeters / 1000);
      return nearbyKnownStops;
    }
  }

  const emptyStops = [];
  emptyStops.radiusUsedKm = Math.round(radiusMeters / 1000);
  return emptyStops;
}




/**
 * Fast batched real-time check of transit mode availability (bus, train, metro, local_train)
 * Checks whether stops/stations of each mode exist within radiusMeters of user's coordinates.
 */
const availabilityCache = new Map();

export async function fetchMultiModeAvailability(lat, lng, radiusMeters = 3000) {
  if (!lat || !lng) {
    return {
      bus: { available: true, message: '' },
      train: { available: false, message: 'No train station within 3km' },
      metro: { available: false, message: 'No Metro station within 3km' },
      local_train: { available: false, message: 'No local train station within 3km' }
    };
  }

  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}_${radiusMeters}`;
  if (availabilityCache.has(cacheKey)) {
    return availabilityCache.get(cacheKey);
  }

  const result = {
    bus: { available: true, message: '' },
    train: { available: false, message: 'No train station within 3km' },
    metro: { available: false, message: 'No Metro station within 3km' },
    local_train: { available: false, message: 'No local train station within 3km' }
  };

  const overpassBatchQuery = `[out:json][timeout:4];
(
  node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
  node["amenity"="bus_station"](around:${radiusMeters},${lat},${lng});
  node["railway"~"station|halt|platform|subway_entrance|subway"](around:${radiusMeters},${lat},${lng});
  node["station"="subway"](around:${radiusMeters},${lat},${lng});
);
out tags 60;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassBatchQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) continue;

      const data = await response.json();
      if (data.elements) {
        let hasBus = false;
        let hasTrain = false;
        let hasMetro = false;
        let hasLocalTrain = false;

        for (const elem of data.elements) {
          if (!elem.tags) continue;
          const tags = elem.tags;
          const name = (tags.name || '').toLowerCase();
          const railway = tags.railway || '';
          const highway = tags.highway || '';
          const amenity = tags.amenity || '';
          const station = tags.station || '';
          const subway = tags.subway || '';

          if (highway === 'bus_stop' || amenity === 'bus_station') {
            hasBus = true;
          }
          if (railway === 'subway_entrance' || railway === 'subway' || station === 'subway' || subway === 'yes' || name.includes('metro')) {
            hasMetro = true;
          }
          if (railway === 'station' || railway === 'halt' || railway === 'platform') {
            if (tags.suburban === 'yes' || tags.commuter === 'yes') {
              hasLocalTrain = true;
            } else {
              hasTrain = true;
            }
          }
        }

        result.bus = { available: hasBus, message: hasBus ? '' : 'No bus stop within 3km' };
        result.train = { available: hasTrain, message: hasTrain ? '' : 'No train station within 3km' };
        result.metro = { available: hasMetro, message: hasMetro ? '' : 'No Metro station within 3km' };
        result.local_train = { available: hasLocalTrain, message: hasLocalTrain ? '' : 'No local train station within 3km' };

        availabilityCache.set(cacheKey, result);
        return result;
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
  }

  availabilityCache.set(cacheKey, result);
  return result;
}


/**
 * Query Overpass API for intermediate stations along a Metro / Local Train line between origin and destination coordinates
 */
export async function fetchOsmLineStationSequence(origLat, origLng, destLat, destLng, mode = 'metro') {
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

    // Return null if no real transit stop exists in OSM for this mode — NEVER fabricate a fake stop!
    return null;
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
  if (!startLat || !startLng || !endLat || !endLng) {
    return { success: false, error: 'Invalid start/end coordinates for routing' };
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
  console.log(`[StopAhead OSRM Routing URL]: ${url}`);

  try {
    const response = await fetchWithTimeout(url, {}, 3500);
    if (!response.ok) {
      throw new Error(`OSRM HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('[StopAhead OSRM Routing Payload]:', data);

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
    throw new Error('No route geometry returned from OSRM endpoint');
  } catch (err) {
    console.warn('[StopAhead OSRM] API network error, using straight-line fallback:', err.message);

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
      isFallback: true,
      distKm: fallbackDist,
      durationMins: Math.max(2, Math.ceil(fallbackDist * 2.2)),
      coordinates: [[startLat, startLng], [endLat, endLng]]
    };
  }
}

/**
 * Curated Local OSM Route Relation dataset for major Chennai corridors & lines
 * Used as instant high-speed fallback if live Overpass relation query times out
 */
export const LOCAL_OSM_ROUTE_RELATIONS = [
  { ref: '19B', mode: 'bus', operator: 'MTC', name: '19B: Saidapet ↔ Kelambakkam', corridors: ['saidapet', 'adyar', 'omr', 'kelambakkam', 'navaluru', 'sipcot'] },
  { ref: '5C', mode: 'bus', operator: 'MTC', name: '5C: T. Nagar ↔ Broadway', corridors: ['t nagar', 'saidapet', 'guindy', 'broadway', 'central'] },
  { ref: '7M', mode: 'bus', operator: 'MTC', name: '7M: T. Nagar ↔ Broadway', corridors: ['t nagar', 'broadway', 'mount road'] },
  { ref: '14M', mode: 'bus', operator: 'MTC', name: '14M: NGO Colony ↔ Mount', corridors: ['ngo colony', 'st thomas mount', 'central'] },
  { ref: '15B', mode: 'bus', operator: 'MTC', name: '15B: Broadway ↔ Koyambedu', corridors: ['broadway', 'koyambedu', 'anna nagar'] },
  { ref: '27D', mode: 'bus', operator: 'MTC', name: '27D: Foreshore Estate ↔ Villivakkam', corridors: ['foreshore estate', 'villivakkam', 'triplicane', 'kilpauk'] },
  { ref: '48A', mode: 'bus', operator: 'MTC', name: '48A: Velachery ↔ Ambattur', corridors: ['velachery', 'ambattur', 'guindy'] },
  { ref: '51', mode: 'bus', operator: 'MTC', name: '51: Tambaram ↔ Velachery', corridors: ['tambaram', 'velachery', 'medavakkam'] },
  { ref: '21G', mode: 'bus', operator: 'MTC', name: '21G: Broadway ↔ Tambaram', corridors: ['broadway', 'tambaram', 'guindy', 'saidapet'] },
  { ref: '47A', mode: 'bus', operator: 'MTC', name: '47A: Besant Nagar ↔ ICF', corridors: ['besant nagar', 't nagar', 'icf'] },
  { ref: 'Blue Line', mode: 'metro', operator: 'CMRL', name: 'Metro Blue Line: Airport ↔ Washermanpet', corridors: ['airport', 'meenambakkam', 'guindy', 'saidapet', 'nandanam', 'central', 'washermanpet', 'wimco nagar'] },
  { ref: 'Green Line', mode: 'metro', operator: 'CMRL', name: 'Metro Green Line: St. Thomas Mount ↔ Central', corridors: ['st thomas mount', 'alandur', 'egmore', 'koyambedu', 'vadapalani', 'central'] },
  { ref: 'Suburban South', mode: 'train', operator: 'Southern Railway', name: 'Suburban: Beach ↔ Tambaram ↔ Chengalpattu', corridors: ['beach', 'fort', 'park', 'egmore', 'chetpet', 'nungambakkam', 'kodambakkam', 'mambalam', 'saidapet', 'guindy', 'st thomas mount', 'tambaram', 'chengalpattu'] },
  { ref: 'Suburban West', mode: 'train', operator: 'Southern Railway', name: 'Suburban: Central ↔ Arakkonam', corridors: ['central', 'perambur', 'villivakkam', 'ambattur', 'avadi', 'tiruvallur', 'arakkonam'] },
  { ref: 'MRTS', mode: 'local_train', operator: 'Southern Railway', name: 'MRTS Light Rail: Beach ↔ Velachery', corridors: ['beach', 'fort', 'park town', 'chepauk', 'triplicane', 'light house', 'thirumayilai', 'mandaveli', 'greenways road', 'kotturpuram', 'kasturba nagar', 'indira nagar', 'taramani', 'perungudi', 'velachery'] }
];

/**
 * Query Overpass API for route relations (bus, subway, train) connecting origin and destination points.
 * Returns array of route objects with ref, name, operator, mode.
 */
export async function fetchOsmRouteRelationsBetweenPoints(origLat, origLng, destLat, destLng, mode = 'bus', originName = '', destName = '') {
  if (!origLat || !origLng || !destLat || !destLng) return [];

  const osmRouteType = (mode === 'metro' || mode === 'subway')
    ? 'subway|light_rail'
    : (mode === 'train' || mode === 'local_train')
    ? 'train|railway|suburban'
    : 'bus';

  const overpassQuery = `[out:json][timeout:5];
(
  relation["type"="route"]["route"~"${osmRouteType}"](around:2500,${origLat},${origLng});
)->.orig_routes;
(
  relation["type"="route"]["route"~"${osmRouteType}"](around:2500,${destLat},${destLng});
)->.dest_routes;
(
  rel.orig_routes.dest_routes;
);
out tags 20;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) continue;

      const data = await response.json();
      if (data.elements && data.elements.length > 0) {
        const routes = [];
        const seenRefs = new Set();

        for (const elem of data.elements) {
          if (!elem.tags) continue;
          const ref = elem.tags.ref || elem.tags.route_ref || elem.tags.name;
          if (!ref || seenRefs.has(ref.toLowerCase())) continue;

          seenRefs.add(ref.toLowerCase());
          routes.push({
            id: `relation-${elem.id}`,
            ref,
            name: elem.tags.name || `${mode.toUpperCase()} Route ${ref}`,
            operator: elem.tags.operator || (mode === 'metro' ? 'Metro Rail' : mode === 'train' ? 'Railway' : 'MTC Bus'),
            from: elem.tags.from || 'Origin',
            to: elem.tags.to || 'Destination',
            mode
          });
        }

        if (routes.length > 0) return routes;
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
  }

  // Fallback corridor matching against local dataset
  const origClean = (originName || '').toLowerCase();
  const destClean = (destName || '').toLowerCase();

  const matchedLocal = LOCAL_OSM_ROUTE_RELATIONS.filter(r => {
    if (r.mode !== mode && !(r.mode === 'bus' && mode === 'bus')) return false;
    const matchOrig = !origClean || r.corridors.some(c => origClean.includes(c) || c.includes(origClean));
    const matchDest = !destClean || r.corridors.some(c => destClean.includes(c) || c.includes(destClean));
    return matchOrig || matchDest;
  });

  return matchedLocal.map(r => ({
    id: `local-${r.ref}`,
    ref: r.ref,
    name: r.name,
    operator: r.operator,
    from: r.corridors[0],
    to: r.corridors[r.corridors.length - 1],
    mode: r.mode
  }));
}

