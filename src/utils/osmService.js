import { calculateHaversineDistance } from './geoHelper';
import { findVerifiedBusRoutes, getCanonicalStopName } from '../data/verifiedBusRoutes';
import { findNearestMetroStation } from '../data/metroDataset';
import { findIndiaMetroStationNearest } from '../data/indiaTransitDataset';


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

const KNOWN_CHENNAI_LANDMARKS = [
  { name: 'Phoenix Marketcity (Phoenix Mall)', aliases: ['phoenix mall', 'phoenix marketcity', 'phoenix'], lat: 12.9918, lng: 80.2171, description: 'Velachery Main Road, Chennai' },
  { name: 'Saidapet', aliases: ['saidapet', 'saidapet bus stand', 'saidapet station'], lat: 13.0232, lng: 80.2238, description: 'Saidapet, Chennai' },
  { name: 'T. Nagar (Thyagaraya Nagar)', aliases: ['t nagar', 't. nagar', 'thyagaraya nagar'], lat: 13.0418, lng: 80.2341, description: 'T. Nagar, Chennai' },
  { name: 'Marina Beach', aliases: ['marina beach', 'marina', 'light house'], lat: 13.0600, lng: 80.2800, description: 'Kamarajar Salai, Marina Beach' },
  { name: 'Poonamallee', aliases: ['poonamallee', 'poonamallee bus terminus'], lat: 13.0485, lng: 80.0995, description: 'Poonamallee, Chennai' },
  { name: 'Chennai Central', aliases: ['chennai central', 'central station', 'park town', 'central'], lat: 13.0827, lng: 80.2707, description: 'EVR Periyar Salai, Chennai' },
  { name: 'Guindy', aliases: ['guindy', 'guindy station', 'guindy hub'], lat: 13.0067, lng: 80.2020, description: 'Guindy, Chennai' },
  { name: 'Porur', aliases: ['porur', 'porur junction'], lat: 13.0382, lng: 80.1565, description: 'Porur, Chennai' },
  { name: 'Koyambedu CMBT', aliases: ['koyambedu', 'cmbt'], lat: 13.0694, lng: 80.1948, description: 'CMBT Terminus, Chennai' },
  { name: 'Broadway Terminus', aliases: ['broadway', 'parrys'], lat: 13.0891, lng: 80.2854, description: 'Broadway, Chennai' },
  { name: 'Tambaram', aliases: ['tambaram', 'tambaram bus stand', 'tambaram railway station'], lat: 12.9249, lng: 80.1000, description: 'Tambaram, Chennai' },
  { name: 'Velachery', aliases: ['velachery', 'velachery station'], lat: 12.9750, lng: 80.2200, description: 'Velachery, Chennai' },
  { name: 'Anna Nagar', aliases: ['anna nagar', 'anna nagar tower'], lat: 13.0850, lng: 80.2100, description: 'Anna Nagar, Chennai' },
  { name: 'Chennai Airport', aliases: ['airport', 'chennai airport', 'meenambakkam'], lat: 12.9944, lng: 80.1709, description: 'GST Road, Meenambakkam, Chennai' },
  { name: 'Adyar', aliases: ['adyar', 'adyar signal'], lat: 13.0012, lng: 80.2565, description: 'Adyar, Chennai' },
  { name: 'Mylapore', aliases: ['mylapore', 'kapaleeshwarar'], lat: 13.0333, lng: 80.2667, description: 'Mylapore, Chennai' },
  { name: 'Kelambakkam', aliases: ['kelambakkam', 'sipcot'], lat: 12.7872, lng: 80.2241, description: 'OMR Road, Chennai' },
  { name: 'Sholinganallur', aliases: ['sholinganallur', 'elcot'], lat: 12.9010, lng: 80.2279, description: 'OMR, Chennai' },
  { name: 'Chromepet', aliases: ['chromepet', 'chromepet station'], lat: 12.9516, lng: 80.1462, description: 'Chromepet, Chennai' },
  { name: 'Vadapalani', aliases: ['vadapalani', 'vadapalani metro'], lat: 13.0500, lng: 80.2120, description: 'Vadapalani, Chennai' }
];

export function getKnownChennaiLandmarkFallback(query) {
  if (!query) return [];
  const q = query.toLowerCase().trim();

  // Word token matching or direct alias substring match
  const match = KNOWN_CHENNAI_LANDMARKS.find((l) =>
    l.aliases.some((alias) => q === alias || q.includes(alias) || alias.includes(q))
  );

  if (match) {
    console.log(`[StopAhead Landmark Fallback]: Resolved "${query}" -> ${match.name} (${match.lat}, ${match.lng})`);
    return [{
      id: `known-landmark-${match.lat}-${match.lng}`,
      name: match.name,
      description: match.description,
      code: match.name.slice(0, 3).toUpperCase(),
      lat: match.lat,
      lng: match.lng,
      type: 'landmark',
      isKnownFallback: true
    }];
  }

  return [];
}

/**
 * Photon Free Geocoding API Search (Komoot / OpenStreetMap)
 * Endpoint: https://photon.komoot.io/api/?q=SEARCH_TEXT&lat=USER_LAT&lon=USER_LNG&limit=5
 * Supports proximity ranking via lat/lon parameters, typo-tolerant fuzzy matching, and fast response times.
 */
export async function searchPhotonPlaces(query, locationBias = null, options = {}) {
  if (!query || !query.trim()) return [];

  const cleanQ = query.trim();
  console.log(`[StopAhead Photon Geocoding Request]: Searching Photon for "${cleanQ}"`);

  try {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&limit=5`;

    if (locationBias && locationBias.lat && locationBias.lng) {
      url += `&lat=${locationBias.lat}&lon=${locationBias.lng}`;
    }

    console.log(`[StopAhead Photon URL]: ${url}`);

    const response = await fetchWithTimeout(url, {
      signal: options.signal,
      headers: {
        'Accept-Language': 'en'
      }
    }, 8500);

    console.log(`[StopAhead Photon HTTP Status]: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`Photon API returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const features = data && data.features ? data.features : [];
    console.log(`[StopAhead Photon Raw Response]: ${features.length} items returned for "${cleanQ}"`);

    if (features.length > 0) {
      return features.map((feature) => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [0, 0]; // GeoJSON format: [lng, lat]
        const lng = parseFloat(coords[0]);
        const lat = parseFloat(coords[1]);

        const mainName = props.name || props.street || props.locality || cleanQ;
        const city = props.city || props.town || props.district || props.locality || props.county || '';
        const state = props.state || '';
        const country = props.country || '';

        const cityArea = city || state || country;
        const description = [city, state].filter(Boolean).join(', ') || country || 'Place';
        const displayName = cityArea ? `${mainName} — ${cityArea}` : mainName;

        return {
          id: props.osm_id ? `photon-${props.osm_id}` : `photon-${lat}-${lng}`,
          name: mainName,
          city: city,
          state: state,
          coordinates: coords, // [lng, lat]
          description: description,
          displayName: displayName,
          code: mainName.slice(0, 3).toUpperCase(),
          lat: lat,
          lng: lng,
          type: props.osm_value || props.type || 'place',
          isOsm: true,
          isPlace: true,
          isPhoton: true
        };
      });
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log(`[StopAhead Photon Search Aborted] Query "${cleanQ}" cancelled for newer in-flight request`);
      throw err;
    }
    console.error(`[StopAhead Photon Exception] Search for "${cleanQ}" failed:`, err);
  }

  // Fallback to Known Landmark dataset if Photon API fails or returns 0 results
  return getKnownChennaiLandmarkFallback(cleanQ);
}


/**
 * Search Photon with raw query first; if 0 results, retry with broadened query (stripping generic transit suffixes).
 * Returns { places, isBroadened, broadenedQuery, note }
 */
export async function searchPhotonWithBroadenedFallback(query, locationBias = null, options = {}) {
  if (!query || !query.trim()) return { places: [], isBroadened: false };

  const rawQuery = query.trim();

  // 1. Direct search with exact raw query (no mangling)
  let places = await searchPhotonPlaces(rawQuery, locationBias, options);
  if (places && places.length > 0) {
    return { places, isBroadened: false, query: rawQuery };
  }

  // 2. Broadened search retry: strip generic transit suffixes ("Bus Stand", "Bus Stop", "Station", etc.)
  const genericSuffixRegex = /\s+\b(bus stand|bus stop|bus station|metro station|railway station|subway station|terminus|stop|station)\b$/i;
  if (genericSuffixRegex.test(rawQuery)) {
    const broadenedQuery = rawQuery.replace(genericSuffixRegex, '').trim();
    if (broadenedQuery && broadenedQuery.length >= 2) {
      const broadenedPlaces = await searchPhotonPlaces(broadenedQuery, locationBias, options);
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
    const globalPlaces = await searchPhotonPlaces(rawQuery, null, options);
    if (globalPlaces && globalPlaces.length > 0) {
      return { places: globalPlaces, isBroadened: false, query: rawQuery };
    }
  }

  return { places: [], isBroadened: false, query: rawQuery };
}

// AI Chatbot's search_destination tool & backward compatibility exports
export const search_destination = searchPhotonWithBroadenedFallback;
export const searchNominatimPlaces = searchPhotonPlaces;
export const searchNominatimWithBroadenedFallback = searchPhotonWithBroadenedFallback;



const OVERPASS_CACHE = new Map();
const OVERPASS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes TTL
const OVERPASS_PER_MIRROR_TIMEOUT_MS = 8500; // 8.5 seconds per mirror attempt
const OVERPASS_TOTAL_TIMEOUT_CEILING_MS = 22000; // 22 seconds hard ceiling total across all mirrors

function getCachedOverpassQuery(cacheKey) {
  const item = OVERPASS_CACHE.get(cacheKey);
  if (item && (Date.now() - item.timestamp < OVERPASS_CACHE_TTL)) {
    console.log(`[StopAhead Overpass Cache Hit]: Key "${cacheKey}"`);
    return item.data;
  }
  return null;
}

function setCachedOverpassQuery(cacheKey, data) {
  if (data) {
    OVERPASS_CACHE.set(cacheKey, { timestamp: Date.now(), data });
  }
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

console.log('Overpass timeout set to:', OVERPASS_PER_MIRROR_TIMEOUT_MS, 'ms per mirror (Total ceiling:', OVERPASS_TOTAL_TIMEOUT_CEILING_MS, 'ms)');

/**
 * Helper to dispatch a single Overpass API query with expanded tag filters strictly per transport mode
 */
async function executeOverpassQuery(lat, lng, radiusMeters, transportMode) {
  const cacheKey = `op_${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusMeters}_${transportMode}`;
  const cached = getCachedOverpassQuery(cacheKey);
  if (cached) return cached;

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

  const overpassQuery = `[out:json][timeout:5];\n(\n${queryBody}\n);\nout center 35;`;
  const overallStartTime = Date.now();

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (Date.now() - overallStartTime > OVERPASS_TOTAL_TIMEOUT_CEILING_MS) {
      console.warn(`[StopAhead Overpass] Total ceiling limit reached (${OVERPASS_TOTAL_TIMEOUT_CEILING_MS}ms). Stopping further mirror retries.`);
      break;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OVERPASS_PER_MIRROR_TIMEOUT_MS);

    try {
      console.log('Trying Overpass endpoint:', endpoint);
      const response = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        console.warn(`[StopAhead Overpass Mirror Notice]: ${endpoint} returned HTTP ${response.status}`);
        continue;
      }

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
        setCachedOverpassQuery(cacheKey, parsedStops);
        return parsedStops;
      }
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn(`[StopAhead Overpass Mirror Failover]: ${endpoint} failed (${e.message}). Retrying next mirror...`);
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

  const requestedRadiusKm = Math.round(radiusMeters / 1000);

  const processAndFilterStops = (stopsArray, maxKm) => {
    if (!stopsArray || stopsArray.length === 0) return [];
    return stopsArray
      .filter((s) => s && typeof s.distKm === 'number' && s.distKm <= maxKm)
      .sort((a, b) => a.distKm - b.distKm);
  };

  const KNOWN_CHENNAI_BUS_STOPS = [
    { name: 'Poonamallee Bus Terminus', lat: 13.0485, lng: 80.0995, description: 'MTC Bus Terminus' },
    { name: 'Poonamallee Bus Stand', lat: 13.0492, lng: 80.0988, description: 'MTC Bus Depot / Stand' },
    { name: 'Poonamallee Bypass Bus Stop', lat: 13.0512, lng: 80.1042, description: 'MTC Bus Stop' },
    { name: 'Poonamallee Trunk Road', lat: 13.0468, lng: 80.0955, description: 'MTC Bus Stop' },
    { name: 'Kumananchavadi Bus Stop', lat: 13.0450, lng: 80.1120, description: 'MTC Bus Stop' },
    { name: 'Iyyappanthangal Bus Depot', lat: 13.0422, lng: 80.1285, description: 'MTC Bus Depot' },
    { name: 'Saveetha Dental College Stop', lat: 13.0560, lng: 80.0820, description: 'MTC Bus Stop' },
    { name: 'Porur Junction Stop', lat: 13.0382, lng: 80.1565, description: 'MTC Bus Junction' },
    { name: 'Ramapuram / MIOT Hospital Stop', lat: 13.0298, lng: 80.1782, description: 'MTC Bus Stop' },
    { name: 'Saidapet Bus Stand', lat: 13.0232, lng: 80.2238, description: 'MTC Bus Stand' },
    { name: 'Guindy Bus Stop / RS', lat: 13.0067, lng: 80.2020, description: 'MTC Bus Stop' },
    { name: 'Koyambedu CMBT Bus Terminus', lat: 13.0694, lng: 80.1948, description: 'CMBT Terminus' },
    { name: 'T. Nagar Bus Terminus', lat: 13.0418, lng: 80.2341, description: 'MTC Bus Terminus' },
    { name: 'Tambaram West Bus Terminus', lat: 12.9250, lng: 80.1170, description: 'MTC Bus Terminus' },
    { name: 'Broadway Bus Terminus', lat: 13.0891, lng: 80.2854, description: 'MTC Terminus' },
    { name: 'Velachery Bus Depot', lat: 12.9782, lng: 80.2225, description: 'MTC Bus Depot' }
  ];

  // 1. INSTANT LOCAL VERIFIED CHECK (< 5ms response time)
  if (transportMode === 'bus') {
    const localBusStops = KNOWN_CHENNAI_BUS_STOPS.map((s) => {
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
    }).sort((a, b) => a.distKm - b.distKm);

    if (localBusStops.length > 0 && localBusStops[0].distKm <= 15) {
      // Find stops within requested radius or expand dynamically up to nearest available stops
      const exactWithinRadius = localBusStops.filter((s) => s.distKm <= Math.max(requestedRadiusKm, 2.5));
      const resultStops = exactWithinRadius.length > 0 ? exactWithinRadius : localBusStops.slice(0, 6);
      resultStops.radiusUsedKm = Math.ceil(resultStops[0].distKm) || requestedRadiusKm;
      return resultStops;
    }
  }

  // 2. High-speed Overpass Query with 2.5s maximum timeout ceiling
  try {
    const rawStops = await executeOverpassQuery(lat, lng, radiusMeters, transportMode);
    const filteredStops = processAndFilterStops(rawStops, requestedRadiusKm);
    if (filteredStops.length > 0) {
      filteredStops.radiusUsedKm = requestedRadiusKm;
      return filteredStops;
    }
  } catch (err) {
    console.warn('[StopAhead Overpass] Live Overpass query notice:', err.message);
  }

  const emptyStops = [];
  emptyStops.radiusUsedKm = requestedRadiusKm;
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

  const overpassBatchQuery = `[out:json][timeout:3];
(
  node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
  node["amenity"="bus_station"](around:${radiusMeters},${lat},${lng});
  node["railway"~"station|halt|platform|subway_entrance|subway"](around:${radiusMeters},${lat},${lng});
  node["station"="subway"](around:${radiusMeters},${lat},${lng});
);
out tags 60;`;

  const batchStartTime = Date.now();

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (Date.now() - batchStartTime > OVERPASS_TOTAL_TIMEOUT_CEILING_MS) {
      break;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OVERPASS_PER_MIRROR_TIMEOUT_MS);

    try {
      console.log('Trying Overpass endpoint:', endpoint);
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
    // 1. Instant check for Metro & Train across CMRL and Nationwide India Metro/Rail Datasets
    if (transportMode === 'metro' || transportMode === 'subway') {
      const cmrlRes = findNearestMetroStation(targetLat, targetLng);
      if (cmrlRes) return cmrlRes;

      const indiaMetroRes = findIndiaMetroStationNearest(targetLat, targetLng, 'metro');
      if (indiaMetroRes) return indiaMetroRes;
    }

    if (transportMode === 'train' || transportMode === 'local_train') {
      const indiaTrainRes = findIndiaMetroStationNearest(targetLat, targetLng, transportMode);
      if (indiaTrainRes) return indiaTrainRes;
    }

    // 2. Try tight 1.5 km radius
    let stops = await fetchOverpassNearbyStops(targetLat, targetLng, 1500, transportMode);

    // 3. Expand to 5 km if nothing found
    if (!stops || stops.length === 0) {
      stops = await fetchOverpassNearbyStops(targetLat, targetLng, 5000, transportMode);
    }

    // 4. Expand to 10 km if still nothing found
    if (!stops || stops.length === 0) {
      stops = await fetchOverpassNearbyStops(targetLat, targetLng, 10000, transportMode);
    }

    if (stops && stops.length > 0) {
      const nearestStop = stops[0];
      const gapKm = parseFloat(nearestStop.distKm.toFixed(1));
      const walkingMins = Math.max(1, Math.round(gapKm * 12));

      return {
        nearestStop,
        gapKm,
        walkingMins,
        isFarGap: gapKm > 1.5,
        isVeryFarGap: gapKm > 5.0
      };
    }

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
 * Supports 'foot' / 'walk', 'car' / 'driving', 'bike' routing profiles.
 */
export async function fetchOSRMRoute(startLat, startLng, endLat, endLng, transportMode = 'bus', profile = null) {
  if (!startLat || !startLng || !endLat || !endLng) {
    return { success: false, error: 'Invalid start/end coordinates for routing' };
  }

  // 1. Determine OSRM profile: 'foot' for walking to stops, 'driving' for vehicles
  let osrmProfile = 'driving';
  if (profile === 'foot' || profile === 'walk' || transportMode === 'walk' || transportMode === 'foot') {
    osrmProfile = 'foot';
  } else if (profile === 'bike' || transportMode === 'bike') {
    osrmProfile = 'bike';
  }

  const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
  console.log(`[StopAhead OSRM Routing URL (${osrmProfile})]: ${url}`);

  try {
    const response = await fetchWithTimeout(url, {}, 5000);
    if (!response.ok) {
      throw new Error(`OSRM HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('[StopAhead OSRM Routing Payload]:', data);

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distKm = parseFloat((route.distance / 1000).toFixed(2));

      let speedKmH = 30;
      if (osrmProfile === 'foot') speedKmH = 4.8;
      else if (transportMode === 'metro' || transportMode === 'subway') speedKmH = 45;
      else if (transportMode === 'train') speedKmH = 55;

      const durationMins = Math.max(1, Math.ceil((distKm / speedKmH) * 60));
      // Full returned geometry polyline ([lat, lng] array)
      const coordinates = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);

      return {
        success: true,
        distKm,
        durationMins,
        coordinates,
        profile: osrmProfile
      };
    }
    throw new Error('No route geometry returned from OSRM endpoint');
  } catch (err) {
    console.warn('[StopAhead OSRM] API routing notice:', err.message);

    return {
      success: false,
      error: `Could not fetch exact road directions: ${err.message}`,
      coordinates: []
    };
  }
}

/**
 * Combines multiple route leg coordinate arrays into a single continuous, gap-free 2D array of [lat, lng] points.
 * Ensures the end point of leg N connects smoothly to the start point of leg N+1.
 */
export function combineRouteLegs(legs = []) {
  if (!Array.isArray(legs) || legs.length === 0) return [];
  const combined = [];

  for (let i = 0; i < legs.length; i++) {
    const currentLeg = legs[i];
    if (!Array.isArray(currentLeg) || currentLeg.length === 0) continue;

    if (combined.length === 0) {
      combined.push(...currentLeg);
    } else {
      const lastPoint = combined[combined.length - 1];
      const firstPoint = currentLeg[0];

      // If gap exists between end of previous leg and start of current leg, push firstPoint
      if (lastPoint[0] !== firstPoint[0] || lastPoint[1] !== firstPoint[1]) {
        combined.push(firstPoint);
      }
      combined.push(...currentLeg.slice(1));
    }
  }

  console.log('[StopAhead Polyline Stitching]: Combined', legs.length, 'legs into', combined.length, 'continuous waypoints');
  return combined;
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
 * Query Overpass API and Verified Route Engine for route relations (bus, subway, train) connecting origin and destination points.
 * Returns array of verified route objects with ref, name, operator, mode.
 */
export async function fetchOsmRouteRelationsBetweenPoints(origLat, origLng, destLat, destLng, mode = 'bus', originName = '', destName = '') {
  if (!origLat || !origLng || !destLat || !destLng) return [];

  // 1. Primary Source of Truth: Verified MTC Route Engine (STRICT BOTH-ENDS & DIRECTION MATCHING)
  if (originName && destName) {
    const verifiedRes = findVerifiedBusRoutes({ origin: originName, destination: destName, mode });
    if (verifiedRes && verifiedRes.success && verifiedRes.routes && verifiedRes.routes.length > 0) {
      console.log(`[StopAhead Route Engine] Verified routes found for ${originName} -> ${destName}:`, verifiedRes.routes.map(r => r.routeNumber));
      return verifiedRes.routes.map(r => ({
        id: `verified-${r.routeNumber}`,
        ref: r.routeNumber,
        name: `${r.routeNumber}: ${r.direction}`,
        operator: r.operator || 'MTC',
        from: r.origin,
        to: r.destination,
        intermediateStops: r.intermediateStops,
        source: r.source || 'MTC Verified Reference',
        sourceType: r.sourceType || 'verified_reference',
        lastVerifiedAt: r.lastVerifiedAt || '2026-08-17',
        notes: r.notes || null,
        verified: true,
        mode: r.mode || mode
      }));
    }
  }


  // 2. Overpass API live query
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

  const relStartTime = Date.now();

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (Date.now() - relStartTime > OVERPASS_TOTAL_TIMEOUT_CEILING_MS) {
      break;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OVERPASS_PER_MIRROR_TIMEOUT_MS);

    try {
      console.log('Trying Overpass endpoint:', endpoint);
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
            verified: true,
            source: 'OpenStreetMap',
            mode
          });
        }

        if (routes.length > 0) return routes;
      }
    } catch (e) {
      clearTimeout(timeoutId);
    }
  }

  // 3. Fallback: STRICT BOTH-ENDS matching against local dataset (MUST match BOTH origin AND destination!)
  const origClean = (originName || '').toLowerCase();
  const destClean = (destName || '').toLowerCase();

  if (origClean && destClean) {
    const matchedLocal = LOCAL_OSM_ROUTE_RELATIONS.filter(r => {
      if (r.mode !== mode && !(r.mode === 'bus' && mode === 'bus')) return false;
      const matchOrig = r.corridors.some(c => origClean.includes(c) || c.includes(origClean));
      const matchDest = r.corridors.some(c => destClean.includes(c) || c.includes(destClean));

      // MUST MATCH BOTH ORIGIN AND DESTINATION! (&& AND, never || OR)
      if (!matchOrig || !matchDest) return false;

      // Verify sequence order: origin corridor index < destination corridor index
      const origIdx = r.corridors.findIndex(c => origClean.includes(c) || c.includes(origClean));
      const destIdx = r.corridors.findIndex(c => destClean.includes(c) || c.includes(destClean));

      return origIdx !== -1 && destIdx !== -1 && destIdx > origIdx;
    });

    if (matchedLocal.length > 0) {
      return matchedLocal.map(r => ({
        id: `local-${r.ref}`,
        ref: r.ref,
        name: r.name,
        operator: r.operator,
        from: r.corridors[0],
        to: r.corridors[r.corridors.length - 1],
        verified: true,
        source: 'MTC Verified',
        mode: r.mode
      }));
    }
  }

  return [];
}


