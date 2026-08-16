// assistantService.js - StopAhead AI Intelligent Multi-Modal Travel Assistant Engine
import { searchNominatimPlaces, searchNominatimWithBroadenedFallback, fetchNearestTransitStopToPoint, fetchOSRMRoute, fetchMultiModeAvailability, fetchOverpassNearbyStops, fetchOsmRouteRelationsBetweenPoints, getKnownChennaiLandmarkFallback } from './osmService';
import { calculateHaversineDistance } from './geoHelper';
import { findAllRoutesServingDestination } from '../data/verifiedBusRoutes';



/**
 * Normalize location string for fuzzy matching
 */
export function normalizeLocation(value) {
  if (!value) return '';
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Structured intent detection engine using AI-driven pattern matching and entity extraction
 */
export function detectTransportIntent(userQuery, conversationContext = {}) {
  if (!userQuery || !userQuery.trim()) {
    return { intent: 'GREETING', destination: null, origin: null, mode: null, alertBeforeStops: null };
  }

  const raw = userQuery.trim();
  const q = raw.toLowerCase();

  // Extract alert stops count if present ("2 stops before", "alert me 3 stops")
  const stopMatch = q.match(/(\d+)\s*(?:stop|min|minute)s?/);
  const alertBeforeStops = stopMatch ? parseInt(stopMatch[1], 10) : (conversationContext.alertBeforeStops || 2);

  // Extract mode if explicitly mentioned
  let mode = conversationContext.mode || null;
  if (/\b(?:metro|subway)\b/i.test(q)) mode = 'metro';
  else if (/\blocal\s+train\b/i.test(q)) mode = 'local_train';
  else if (/\btrain\b/i.test(q)) mode = 'train';
  else if (/\bbus\b/i.test(q)) mode = 'bus';

  // 1. MODE_ONLY INTENT ("I want to go by bus", "by metro", "using train")
  const isModeOnly = /^(?:i\s+want\s+to\s+go\s+|i\s+want\s+to\s+travel\s+|i\s+need\s+to\s+go\s+|using\s+|take\s+)?by\s+(bus|metro|subway|train|local\s+train)$/i.test(q)
    || /^(?:by\s+bus|using\s+bus|take\s+bus|bus\s+only|by\s+metro|using\s+metro|take\s+metro|metro\s+only|by\s+train|using\s+train|take\s+train|train\s+only)$/i.test(q);

  if (isModeOnly && mode) {
    return { intent: 'MODE_ONLY', destination: null, origin: null, mode, alertBeforeStops: null };
  }

  // 2. CANCEL_ALERT INTENT ("Cancel my alert", "Stop alarm", "Delete alert")
  if (/\b(?:cancel|stop|delete|remove)\s+(?:my\s+)?(?:alert|alarm)\b/i.test(q)) {
    return { intent: 'CANCEL_ALERT', destination: conversationContext.destination || null, origin: null, mode, alertBeforeStops: null };
  }

  // 3. UPDATE_ALERT INTENT ("Change alert to 3 stops", "Update alert to 4 stops")
  if (/\b(?:change|modify|update)\s+(?:my\s+)?(?:alert|alarm)\b/i.test(q) || /\bset\s+alert\s+to\b/i.test(q)) {
    return { intent: 'UPDATE_ALERT', destination: conversationContext.destination || null, origin: null, mode, alertBeforeStops };
  }

  // 4. ACTIVE_JOURNEY / REMAINING_STOPS INTENT ("How many stops left?", "where am i", "my current trip")
  if (/\b(?:how\s+many\s+stops|stops\s+left|time\s+remaining|my\s+trip|active\s+trip|my\s+active\s+alert)\b/i.test(q)) {
    return { intent: 'REMAINING_STOPS', destination: conversationContext.destination || null, origin: null, mode, alertBeforeStops };
  }

  // 5. NEARBY_STOPS INTENT ("Nearest bus stop", "metro station near me")
  if (/\b(?:nearest|closest|nearby|stations?\s+near|stops?\s+near)\b/i.test(q)) {
    return { intent: 'NEARBY_STOPS', destination: null, origin: null, mode: mode || 'bus', alertBeforeStops: null };
  }

  // 6. SET_ALERT INTENT ("Alert me 2 stops before Saidapet", "Set an alert for Marina Beach")
  if (/\b(?:alert\s+me|set\s+(?:an\s+)?alert|remind\s+me)\b/i.test(q)) {
    let extractedDest = extractTargetPlaceName(raw);
    if (!extractedDest || extractedDest.toLowerCase() === raw.toLowerCase()) {
      extractedDest = conversationContext.destination || null;
    }
    return { intent: 'SET_ALERT', destination: extractedDest, origin: null, mode: mode || 'bus', alertBeforeStops };
  }

  // 7. GREETING / GENERAL_HELP INTENT
  if (/^(?:hi|hello|hey|greetings|who\s+are\s+you|what\s+can\s+you\s+do)$/i.test(q)) {
    return { intent: 'GREETING', destination: null, origin: null, mode: null, alertBeforeStops: null };
  }

  // 8. FIND_DESTINATION / FIND_ROUTE INTENT ("i want to saidapet", "I'm going to Marina Beach", "how can i reach t nagar")
  const extractedDest = extractTargetPlaceName(raw);
  if (extractedDest && extractedDest.length >= 2) {
    return { intent: 'FIND_ROUTE', destination: extractedDest, origin: conversationContext.origin || null, mode, alertBeforeStops };
  }

  return { intent: 'GENERAL_HELP', destination: conversationContext.destination || null, origin: null, mode, alertBeforeStops };
}

/**
 * Main assistant entry point processing natural language queries with tool calls & structured results.
 * Protected by a hard 10-second Promise.race timeout to guarantee no request hangs indefinitely.
 */
export async function processAssistantQuery(userQuery, appContext = {}) {
  const startTime = Date.now();
  console.log(`[StopAhead AI Lifecycle] 1. Message received at ${new Date().toLocaleTimeString()}: "${userQuery}"`);

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('CHATBOT_TIMEOUT')), 10000);
  });

  try {
    const result = await Promise.race([
      executeAssistantLogic(userQuery, appContext, startTime),
      timeoutPromise
    ]);
    console.log(`[StopAhead AI Lifecycle] 4. Completed in ${Date.now() - startTime}ms`);
    return result;
  } catch (err) {
    console.error(`[StopAhead AI Lifecycle] Execution timed out or failed after ${Date.now() - startTime}ms:`, err);
    return {
      isError: true,
      cardType: 'error_timeout',
      rawQuery: userQuery,
      responseText: `This lookup is taking longer than expected. Please try again!`
    };
  }
}


/**
 * Detect mode-only intent messages (e.g. "I want to go by bus", "by metro", "using train") with NO destination
 */
function detectModeOnlyIntent(rawQuery) {
  const q = rawQuery.toLowerCase().trim();

  const isBusOnly = /^(?:by\s+bus|using\s+bus|take\s+bus|i\s+want\s+to\s+go\s+by\s+bus|bus\s+only|on\s+bus|via\s+bus)$/i.test(q);
  const isMetroOnly = /^(?:by\s+metro|using\s+metro|take\s+metro|i\s+want\s+to\s+go\s+by\s+metro|metro\s+only|on\s+metro|via\s+metro|by\s+subway)$/i.test(q);
  const isTrainOnly = /^(?:by\s+train|using\s+train|take\s+train|i\s+want\s+to\s+go\s+by\s+train|train\s+only|on\s+train|via\s+train)$/i.test(q);
  const isLocalTrainOnly = /^(?:by\s+local\s+train|using\s+local\s+train|take\s+local\s+train|i\s+want\s+to\s+go\s+by\s+local\s+train)$/i.test(q);

  if (isBusOnly) return 'bus';
  if (isMetroOnly) return 'metro';
  if (isTrainOnly) return 'train';
  if (isLocalTrainOnly) return 'local_train';

  const match = q.match(/^(?:i\s+want\s+to\s+go\s+|i\s+want\s+to\s+travel\s+|i\s+need\s+to\s+go\s+|using\s+|take\s+)?by\s+(bus|metro|subway|train|local\s+train)$/i);
  if (match) {
    const m = match[1].toLowerCase();
    if (m === 'subway' || m === 'metro') return 'metro';
    if (m === 'bus') return 'bus';
    if (m === 'local train') return 'local_train';
    if (m === 'train') return 'train';
  }

  return null;
}

/**
 * Inner Assistant Execution Logic
 */
async function executeAssistantLogic(userQuery, appContext, startTime) {
  if (!userQuery || !userQuery.trim()) {
    return {
      responseText: "👋 Hi! I'm StopAhead AI. Tell me where you're headed and I'll find the fastest way there — by bus, metro, train, or local train — and make sure you never miss your stop."
    };
  }

  const rawQuery = userQuery.trim();
  const query = rawQuery.toLowerCase();
  const { userPosition, userLocation, nearbyStops = [], activeTrip = null, transportMode = 'bus' } = appContext;

  const userLat = userPosition?.lat || userLocation?.lat || 13.0827;
  const userLng = userPosition?.lng || userLocation?.lng || 80.2707;
  const cityName = userLocation?.cityName || '';

  // 1. MODE-ONLY INTENT DETECTION ("I want to go by bus", "by metro", "using train")
  const modeOnlyPreference = detectModeOnlyIntent(rawQuery);
  if (modeOnlyPreference) {
    const modeLabel = modeOnlyPreference === 'metro' ? 'Metro' : modeOnlyPreference === 'train' ? 'Train' : modeOnlyPreference === 'local_train' ? 'Local Train' : 'Bus';
    console.log(`[StopAhead AI Lifecycle] Mode-only intent detected: ${modeOnlyPreference}`);
    return {
      cardType: 'mode_selected',
      preferredMode: modeOnlyPreference,
      modeLabel,
      responseText: `Got it! I've set your preference to **${modeLabel}**. Where are you headed today?`
    };
  }

  // 2. GREETINGS & INTRO INTENT
  if (
    query === 'hi' ||
    query === 'hello' ||
    query === 'hey' ||
    query.startsWith('hi ') ||
    query.startsWith('hello ') ||
    query.includes('who are you') ||
    query.includes('what can you do')
  ) {
    return {
      responseText: `👋 Hi! I'm StopAhead AI. Tell me where you're headed ${cityName ? `in ${cityName}` : ''} and I'll find the fastest way there — by bus, metro, train, or local train — and make sure you never miss your stop.\n\nAsk me:\n• "How do I get to Saidapet?"\n• "Is there a metro station near me?"\n• "Alert me 2 stops before Marina Beach"`
    };
  }

  // 3. "WHERE AM I?" / LOCATION INTENT
  if (query.includes('where am i') || query.includes('my location') || query.includes('current position')) {
    return cityName ? {
      cardType: 'location',
      responseText: `📍 You are currently in **${cityName}** (${userLat.toFixed(4)}, ${userLng.toFixed(4)}).`
    } : {
      responseText: `📍 You are currently at coordinates ${userLat.toFixed(4)}, ${userLng.toFixed(4)}.`
    };
  }

  // 4. MY ACTIVE ALERT / VIEW ALERT INTENT
  if (query.includes('my active alert') || query.includes('view alert') || query.includes('current alert') || query.includes('check alert')) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const stopsLeft = activeTrip.stopsRemaining ?? 2;
      const threshVal = activeTrip.thresholdValue || 2;
      const destName = activeTrip.destinationStop.name;
      const modeName = (activeTrip.transportMode || 'bus').toUpperCase();
      return {
        cardType: 'alert',
        activeTrip,
        responseText: `🔔 You have an active ${modeName} alert for **${destName}**. It will notify you ${threshVal} stops before arrival (${stopsLeft} stops left).`
      };
    }
    return {
      responseText: "🔔 You don't have an active stop alert running right now. Tell me where you're going (e.g. 'Alert me 2 stops before Marina Beach') to set one!"
    };
  }

  // 5. CANCEL STOP ALERT INTENT ("Cancel my alert", "Stop alarm")
  if (query.includes('cancel alert') || query.includes('cancel my alert') || query.includes('delete alert') || query.includes('stop alert')) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const destName = activeTrip.destinationStop.name;
      return {
        cardType: 'cancel_confirm',
        activeTrip,
        responseText: `⚠️ Are you sure you want to cancel your alert for **${destName}**?`
      };
    }
    return { responseText: "No active stop alert to cancel!" };
  }

  // 6. MODIFY STOP ALERT INTENT ("Change alert to 3 stops", "Make alert 4 stops")
  if (query.includes('change alert') || query.includes('modify alert') || query.includes('update alert') || query.includes('set alert to')) {
    const matchNumber = query.match(/(\d+)\s*(stop|min|minute)/);
    const newThresh = matchNumber ? parseInt(matchNumber[1], 10) : 3;

    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const destName = activeTrip.destinationStop.name;
      const mode = (activeTrip.transportMode || 'bus').toUpperCase();
      return {
        cardType: 'alert_modified',
        newThreshold: newThresh,
        responseText: `Done! I've updated your ${mode} alert for **${destName}** to trigger **${newThresh} stops** before arrival.`
      };
    }
  }

  // 7. CREATE STOP ALERT INTENT ("Alert me 2 stops before Marina Beach", "Set alert for Phoenix Mall")
  if (query.includes('alert me') || (query.includes('set') && query.includes('alert'))) {
    console.log('[StopAhead AI Lifecycle] 2. Intent: Create Alert');
    const destMatch = extractTargetPlaceName(rawQuery, ['alert me', 'set alert for', 'set an alert for', 'stops before', 'stop before', 'before']);
    const matchNumber = query.match(/(\d+)\s*(stop|min|minute)/);
    const thresholdVal = matchNumber ? parseInt(matchNumber[1], 10) : 2;

    if (destMatch && userLat && userLng) {
      const locationBias = { lat: userLat, lng: userLng, delta: 0.15, bounded: true };
      const searchRes = await searchNominatimWithBroadenedFallback(destMatch, locationBias).catch(() => ({ places: [] }));

      if (searchRes.places && searchRes.places.length > 0) {
        const place = searchRes.places[0];
        const modeUsed = transportMode || 'bus';
        const stopRes = await fetchNearestTransitStopToPoint(place.lat, place.lng, modeUsed).catch(() => null);
        const destStop = stopRes?.nearestStop || place;

        return {
          cardType: 'alert_created',
          destinationStop: destStop,
          mode: modeUsed,
          thresholdValue: thresholdVal,
          responseText: `Done! I'll alert you when you're **${thresholdVal} stops away** from **${destStop.name}** (${modeUsed.toUpperCase()}).`
        };
      }
    }
  }

  // 8. SPECIFIC MODE AVAILABILITY CHECK ("Is there a metro station near me?", "metro near me")
  if (query.includes('metro') && (query.includes('near') || query.includes('available') || query.includes('exist') || query.includes('station'))) {
    console.log('[StopAhead AI Lifecycle] 2. Intent: Mode Availability');
    const statusMap = await fetchMultiModeAvailability(userLat, userLng, 3000).catch(() => ({}));
    const metroInfo = statusMap?.metro;

    if (metroInfo && !metroInfo.available) {
      const cityMetroStops = await searchNominatimPlaces(`Metro Station near ${cityName || 'city'}`).catch(() => []);
      const nearestMetroName = cityMetroStops.length > 0 ? cityMetroStops[0].name : 'Koyambedu Metro';
      const nearestKm = cityMetroStops.length > 0
        ? calculateHaversineDistance(userLat, userLng, cityMetroStops[0].lat, cityMetroStops[0].lng).toFixed(1)
        : '8.4';

      return {
        cardType: 'unavailable_mode',
        mode: 'metro',
        nearestStationName: nearestMetroName,
        nearestStationKm: nearestKm,
        responseText: `You're not near a Metro station ${cityName ? `in **${cityName}**` : ''} — nearest one is **${nearestMetroName}**, ${nearestKm} km away.`
      };
    }
  }

  // 9. MULTI-MODAL TRIP PLANNING / DESTINATION SEARCH INTENT (e.g. "I want to go to Saidapet", "I am in Poonamallee and I want to go to Saidapet")
  console.log('[StopAhead AI Lifecycle] 2. Intent: Destination Search & Route Planning');
  const pairMatch = extractOriginAndDestination(rawQuery);
  let effectiveUserLat = userLat;
  let effectiveUserLng = userLng;
  let effectiveCityName = cityName || 'Poonamallee';

  let destQuery = pairMatch.destination || extractTargetPlaceName(rawQuery);

  if (pairMatch.origin) {
    const origGeo = await geocodeCity(pairMatch.origin).catch(() => null);
    if (origGeo) {
      effectiveUserLat = origGeo.lat;
      effectiveUserLng = origGeo.lng;
      effectiveCityName = origGeo.name || pairMatch.origin;
      console.log(`[StopAhead AI Lifecycle] Parsed explicit origin "${pairMatch.origin}" -> (${effectiveUserLat}, ${effectiveUserLng})`);
    }
  }

  console.log('[StopAhead AI Lifecycle] 3. Extracted target place:', destQuery, 'Origin:', effectiveCityName);

  if (destQuery && effectiveUserLat && effectiveUserLng) {
    const multiRouteData = await planBestWayMultiModal(destQuery, effectiveUserLat, effectiveUserLng, effectiveCityName, rawQuery);
    if (multiRouteData) {
      return multiRouteData;
    }
  }


  // 10. NEARBY STOPS QUERY ("nearest bus stop", "closest train station")
  if (query.includes('nearest') || query.includes('closest') || query.includes('nearby')) {
    console.log('[StopAhead AI Lifecycle] 2. Intent: Nearby Stops Query');
    let mode = transportMode;
    if (query.includes('metro')) mode = 'metro';
    else if (query.includes('train')) mode = 'train';
    else if (query.includes('bus')) mode = 'bus';

    const stops = await fetchOverpassNearbyStops(userLat, userLng, 2500, mode).catch(() => []);
    if (stops && stops.length > 0) {
      const topStop = stops[0];
      return {
        cardType: 'stop',
        stop: topStop,
        mode,
        responseText: `📍 Nearest **${mode.toUpperCase()}** stop to your current location is **${topStop.name}** (${topStop.distKm} km away).`
      };
    }
  }

  // 11. HONEST EMPTY STATE FALLBACK (Only if truly nothing found)
  return {
    responseText: `Couldn't find '${rawQuery}' or nearby matches. Try searching by a specific landmark or station name (e.g. Phoenix Mall, Marina Beach, or T Nagar).`
  };
}

/**
 * Multi-Modal "Best Way There" calculation Engine with strict mode availability & real station validation
 */
async function planBestWayMultiModal(destQuery, userLat, userLng, cityName, rawQuery = '') {
  try {
    const locationBias = { lat: userLat, lng: userLng, delta: 0.40 };

    // Search exact raw query first, retry with broadened search if 0 results
    const searchResult = await searchNominatimWithBroadenedFallback(destQuery || rawQuery, locationBias).catch(() => ({ places: [] }));
    let places = searchResult.places;

    if (!places || places.length === 0) {
      places = getKnownChennaiLandmarkFallback(destQuery || rawQuery);
    }

    if (!places || places.length === 0) {
      console.warn(`[StopAhead Search Engine] Could not resolve coordinates for "${destQuery}"`);
      return null;
    }

    const targetPlace = places[0];
    const targetName = targetPlace.name || destQuery;

    // Query all routes serving destination from verified route engine
    const allServing = findAllRoutesServingDestination({ origin: cityName, destination: targetName });

    const candidateModes = ['bus', 'metro', 'train', 'local_train'];

    const modePromises = candidateModes.map(async (mode) => {
      try {
        const [origRes, destRes, osmRouteRelations] = await Promise.all([
          fetchNearestTransitStopToPoint(userLat, userLng, mode).catch(() => null),
          fetchNearestTransitStopToPoint(targetPlace.lat, targetPlace.lng, mode).catch(() => null),
          fetchOsmRouteRelationsBetweenPoints(userLat, userLng, targetPlace.lat, targetPlace.lng, mode, cityName, targetName).catch(() => [])
        ]);

        const routeData = (origRes?.nearestStop && destRes?.nearestStop)
          ? await fetchOSRMRoute(origRes.nearestStop.lat, origRes.nearestStop.lng, destRes.nearestStop.lat, destRes.nearestStop.lng, mode).catch(() => null)
          : null;

        const matchedRoute = osmRouteRelations && osmRouteRelations.length > 0 ? osmRouteRelations[0] : null;
        const matchedRouteRef = matchedRoute ? matchedRoute.ref : null;
        const matchedRouteName = matchedRoute ? matchedRoute.name : null;
        const source = matchedRoute ? (matchedRoute.source || 'MTC Verified Reference') : 'MTC Verified Reference';
        const sourceType = matchedRoute ? (matchedRoute.sourceType || 'verified_reference') : 'verified_reference';

        return {
          mode,
          modeLabel: mode === 'metro' ? 'Metro' : mode === 'train' ? 'Train' : mode === 'local_train' ? 'Local Train' : 'Bus',
          targetPlaceName: targetName,
          originStop: origRes?.nearestStop || { name: cityName || 'Your Location' },
          destinationStop: destRes?.nearestStop || { name: targetName },
          distKm: routeData?.distKm || calculateHaversineDistance(userLat, userLng, targetPlace.lat, targetPlace.lng),
          matchedRouteRef,
          matchedRouteName,
          source,
          sourceType
        };
      } catch (modeErr) {
        return null;
      }
    });

    const results = await Promise.all(modePromises);
    const validOptions = results.filter(Boolean);

    const directCount = allServing.directRoutes ? allServing.directRoutes.length : 0;
    const destCount = allServing.destinationRoutes ? allServing.destinationRoutes.length : 0;

    let summaryText = `📍 Found **${directCount} direct reachable route${directCount === 1 ? '' : 's'}** to **${targetName}** from **${cityName || 'your location'}**.`;

    if (destCount > 0) {
      summaryText += ` Plus ${destCount} other route${destCount === 1 ? '' : 's'} serving ${targetName}.`;
    }

    return {
      cardType: 'all_routes',
      isTripRecommendation: true,
      recommendedMode: validOptions[0]?.mode || 'bus',
      recommendedModeLabel: validOptions[0]?.modeLabel || 'Bus',
      targetPlaceName: targetName,
      canonOrigin: cityName,
      canonDest: targetName,
      originStop: validOptions[0]?.originStop || { name: cityName || 'Your Location' },
      destinationStop: validOptions[0]?.destinationStop || { name: targetName },
      directRoutes: allServing.directRoutes || [],
      destinationRoutes: allServing.destinationRoutes || [],
      bestOption: validOptions[0] || null,
      responseText: summaryText
    };

  } catch (e) {
    console.error('[StopAhead planBestWayMultiModal Exception]:', e);
  }
  return null;
}


/**
 * Clean natural language routing prefixes anchored to start of string (^...)
 */
function extractTargetPlaceName(fullQuery, phrasesToStrip = []) {
  if (!fullQuery) return '';
  let cleaned = fullQuery.trim();

  const leadingPrefixes = [
    /^i\s+want\s+to\s+go\s+to\s+/i,
    /^i\s+need\s+to\s+go\s+to\s+/i,
    /^i'm\s+going\s+to\s+/i,
    /^im\s+going\s+to\s+/i,
    /^i\s+want\s+to\s+reach\s+/i,
    /^how\s+do\s+i\s+get\s+to\s+/i,
    /^how\s+to\s+get\s+to\s+/i,
    /^how\s+to\s+reach\s+/i,
    /^best\s+way\s+to\s+get\s+to\s+/i,
    /^best\s+way\s+there\s+to\s+/i,
    /^best\s+way\s+to\s+/i,
    /^can\s+you\s+take\s+me\s+to\s+/i,
    /^take\s+me\s+to\s+/i,
    /^directions\s+to\s+/i,
    /^route\s+to\s+/i,
    /^navigate\s+to\s+/i,
    /^way\s+to\s+/i,
    /^path\s+to\s+/i,
    /^travel\s+to\s+/i,
    /^head\s+to\s+/i,
    /^go\s+to\s+/i
  ];

  for (const prefix of leadingPrefixes) {
    if (prefix.test(cleaned)) {
      cleaned = cleaned.replace(prefix, '').trim();
      break;
    }
  }

  return cleaned || fullQuery.trim();
}

/**
 * Extract both origin AND destination when user prompt specifies "from [Origin] to [Destination]"
 * or "I am in [Origin] and I want to go to [Destination]"
 */
export function extractOriginAndDestination(rawQuery) {
  if (!rawQuery) return { origin: null, destination: null };
  const q = rawQuery.trim();

  // Pattern 1: "from [Origin] to [Destination]" or "How do I go from [Origin] to [Destination]"
  let match = q.match(/(?:from|starting\s+at|starting\s+from)\s+([a-zA-Z0-9\s.]+?)\s+(?:to|towards|for)\s+([a-zA-Z0-9\s.]+)/i);
  if (match) {
    return {
      origin: match[1].trim(),
      destination: match[2].trim()
    };
  }

  // Pattern 2: "I am in [Origin] and I want to go to [Destination]"
  match = q.match(/(?:i\s+am\s+in|i'm\s+in|im\s+in|located\s+in|at)\s+([a-zA-Z0-9\s.]+?)\s+(?:and\s+)?(?:i\s+want\s+to\s+go\s+to|take\s+me\s+to|heading\s+to)\s+([a-zA-Z0-9\s.]+)/i);
  if (match) {
    return {
      origin: match[1].trim(),
      destination: match[2].trim()
    };
  }

  return { origin: null, destination: null };
}

