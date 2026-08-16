// assistantService.js - StopAhead AI Intelligent Multi-Modal Travel Assistant Engine
import { searchNominatimPlaces, fetchNearestTransitStopToPoint, fetchOSRMRoute, fetchMultiModeAvailability, fetchOverpassNearbyStops, fetchOsmRouteRelationsBetweenPoints } from './osmService';
import { calculateHaversineDistance } from './geoHelper';

/**
 * Main assistant entry point processing natural language queries with tool calls & structured results
 */
export async function processAssistantQuery(userQuery, appContext = {}) {
  console.log('[StopAhead AI Chatbot] Incoming user message:', userQuery);

  if (!userQuery || !userQuery.trim()) {
    const welcomeMsg = {
      responseText: "👋 Hi! I'm StopAhead AI. Tell me where you're headed and I'll find the fastest way there — by bus, metro, train, or local train — and make sure you never miss your stop."
    };
    console.log('[StopAhead AI Chatbot] Response (Empty Input):', welcomeMsg);
    return welcomeMsg;
  }

  const rawQuery = userQuery.trim();
  const query = rawQuery.toLowerCase();
  const { userPosition, userLocation, nearbyStops = [], activeTrip = null, transportMode = 'bus' } = appContext;

  const userLat = userPosition?.lat || userLocation?.lat || 13.0827;
  const userLng = userPosition?.lng || userLocation?.lng || 80.2707;
  const cityName = userLocation?.cityName || '';

  // 1. GREETINGS & INTRO INTENT
  if (
    query === 'hi' ||
    query === 'hello' ||
    query === 'hey' ||
    query.startsWith('hi ') ||
    query.startsWith('hello ') ||
    query.includes('who are you') ||
    query.includes('what can you do')
  ) {
    const response = {
      responseText: `👋 Hi! I'm StopAhead AI. Tell me where you're headed ${cityName ? `in ${cityName}` : ''} and I'll find the fastest way there — by bus, metro, train, or local train — and make sure you never miss your stop.\n\nAsk me:\n• "How do I get to Saidapet?"\n• "Is there a metro station near me?"\n• "Alert me 2 stops before Marina Beach"`
    };
    console.log('[StopAhead AI Chatbot] Response (Greeting):', response);
    return response;
  }

  // 2. "WHERE AM I?" / LOCATION INTENT
  if (query.includes('where am i') || query.includes('my location') || query.includes('current position')) {
    const response = cityName ? {
      cardType: 'location',
      responseText: `📍 You are currently in **${cityName}** (${userLat.toFixed(4)}, ${userLng.toFixed(4)}).`
    } : {
      responseText: `📍 You are currently at coordinates ${userLat.toFixed(4)}, ${userLng.toFixed(4)}.`
    };
    console.log('[StopAhead AI Chatbot] Response (Location):', response);
    return response;
  }

  // 3. MY ACTIVE ALERT / VIEW ALERT INTENT
  if (query.includes('my active alert') || query.includes('view alert') || query.includes('current alert') || query.includes('check alert')) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const stopsLeft = activeTrip.stopsRemaining ?? 2;
      const threshVal = activeTrip.thresholdValue || 2;
      const destName = activeTrip.destinationStop.name;
      const modeName = (activeTrip.transportMode || 'bus').toUpperCase();
      const response = {
        cardType: 'alert',
        activeTrip,
        responseText: `🔔 You have an active ${modeName} alert for **${destName}**. It will notify you ${threshVal} stops before arrival (${stopsLeft} stops left).`
      };
      console.log('[StopAhead AI Chatbot] Response (Active Alert):', response);
      return response;
    }
    const response = {
      responseText: "🔔 You don't have an active stop alert running right now. Tell me where you're going (e.g. 'Alert me 2 stops before Marina Beach') to set one!"
    };
    console.log('[StopAhead AI Chatbot] Response (No Active Alert):', response);
    return response;
  }

  // 4. CANCEL STOP ALERT INTENT ("Cancel my alert", "Stop alarm")
  if (query.includes('cancel alert') || query.includes('cancel my alert') || query.includes('delete alert') || query.includes('stop alert')) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const destName = activeTrip.destinationStop.name;
      const response = {
        cardType: 'cancel_confirm',
        activeTrip,
        responseText: `⚠️ Are you sure you want to cancel your alert for **${destName}**?`
      };
      console.log('[StopAhead AI Chatbot] Response (Cancel Confirm):', response);
      return response;
    }
    const response = { responseText: "No active stop alert to cancel!" };
    console.log('[StopAhead AI Chatbot] Response (Cancel Empty):', response);
    return response;
  }

  // 5. MODIFY STOP ALERT INTENT ("Change alert to 3 stops", "Make alert 4 stops")
  if (query.includes('change alert') || query.includes('modify alert') || query.includes('update alert') || query.includes('set alert to')) {
    const matchNumber = query.match(/(\d+)\s*(stop|min|minute)/);
    const newThresh = matchNumber ? parseInt(matchNumber[1], 10) : 3;

    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const destName = activeTrip.destinationStop.name;
      const mode = (activeTrip.transportMode || 'bus').toUpperCase();
      const response = {
        cardType: 'alert_modified',
        newThreshold: newThresh,
        responseText: `Done! I've updated your ${mode} alert for **${destName}** to trigger **${newThresh} stops** before arrival.`
      };
      console.log('[StopAhead AI Chatbot] Response (Alert Modified):', response);
      return response;
    }
  }

  // 6. CREATE STOP ALERT INTENT ("Alert me 2 stops before Marina Beach", "Set alert for Phoenix Mall")
  if (query.includes('alert me') || (query.includes('set') && query.includes('alert'))) {
    const destMatch = extractTargetPlaceName(rawQuery, ['alert me', 'set alert for', 'set an alert for', 'stops before', 'stop before', 'before']);
    const matchNumber = query.match(/(\d+)\s*(stop|min|minute)/);
    const thresholdVal = matchNumber ? parseInt(matchNumber[1], 10) : 2;

    if (destMatch && userLat && userLng) {
      const locationBias = { lat: userLat, lng: userLng, delta: 0.15, bounded: true };
      const places = await searchNominatimPlaces(destMatch, locationBias);

      if (places && places.length > 0) {
        const place = places[0];
        const modeUsed = transportMode || 'bus';
        const stopRes = await fetchNearestTransitStopToPoint(place.lat, place.lng, modeUsed);
        const destStop = stopRes?.nearestStop || place;

        const response = {
          cardType: 'alert_created',
          destinationStop: destStop,
          mode: modeUsed,
          thresholdValue: thresholdVal,
          responseText: `Done! I'll alert you when you're **${thresholdVal} stops away** from **${destStop.name}** (${modeUsed.toUpperCase()}).`
        };
        console.log('[StopAhead AI Chatbot] Response (Alert Created):', response);
        return response;
      }
    }
  }

  // 7. SPECIFIC MODE AVAILABILITY CHECK ("Is there a metro station near me?", "metro near me")
  if (query.includes('metro') && (query.includes('near') || query.includes('available') || query.includes('exist') || query.includes('station'))) {
    const statusMap = await fetchMultiModeAvailability(userLat, userLng, 3000);
    const metroInfo = statusMap?.metro;

    if (metroInfo && !metroInfo.available) {
      const cityMetroStops = await searchNominatimPlaces(`Metro Station near ${cityName || 'city'}`);
      const nearestMetroName = cityMetroStops.length > 0 ? cityMetroStops[0].name : 'Koyambedu Metro';
      const nearestKm = cityMetroStops.length > 0
        ? calculateHaversineDistance(userLat, userLng, cityMetroStops[0].lat, cityMetroStops[0].lng).toFixed(1)
        : '8.4';

      const response = {
        cardType: 'unavailable_mode',
        mode: 'metro',
        nearestStationName: nearestMetroName,
        nearestStationKm: nearestKm,
        responseText: `You're not near a Metro station ${cityName ? `in **${cityName}**` : ''} — nearest one is **${nearestMetroName}**, ${nearestKm} km away.`
      };
      console.log('[StopAhead AI Chatbot] Response (Unavailable Metro):', response);
      return response;
    }
  }

  // 8. MULTI-MODAL TRIP PLANNING / DESTINATION SEARCH INTENT (e.g. "I want to go to Saidapet", "Saidapet", "Phoenix Mall")
  const destQuery = extractTargetPlaceName(rawQuery);
  console.log('[StopAhead AI Chatbot] Cleaned destination query:', destQuery);

  if (destQuery && userLat && userLng) {
    const multiRouteData = await planBestWayMultiModal(destQuery, userLat, userLng, cityName, rawQuery);
    if (multiRouteData) {
      console.log('[StopAhead AI Chatbot] Response (Best Way There Route Found):', multiRouteData);
      return multiRouteData;
    }
  }

  // 9. NEARBY STOPS QUERY ("nearest bus stop", "closest train station")
  if (query.includes('nearest') || query.includes('closest') || query.includes('nearby')) {
    let mode = transportMode;
    if (query.includes('metro')) mode = 'metro';
    else if (query.includes('train')) mode = 'train';
    else if (query.includes('bus')) mode = 'bus';

    const stops = await fetchOverpassNearbyStops(userLat, userLng, 2500, mode);
    if (stops && stops.length > 0) {
      const topStop = stops[0];
      const response = {
        cardType: 'stop',
        stop: topStop,
        mode,
        responseText: `📍 Nearest **${mode.toUpperCase()}** stop to your current location is **${topStop.name}** (${topStop.distKm} km away).`
      };
      console.log('[StopAhead AI Chatbot] Response (Nearby Stop):', response);
      return response;
    }
  }

  // 10. CLARIFYING QUESTION FALLBACK (Never repeat static welcome screen on real message failure!)
  const fallbackResponse = {
    responseText: `I couldn't find a direct transit stop for "${rawQuery}". Did you mean you want directions to **${destQuery || rawQuery}**? Try typing a specific landmark or station name (e.g. 'Saidapet Bus Stand', 'Phoenix Mall', or 'Marina Beach').`
  };
  console.log('[StopAhead AI Chatbot] Response (Clarifying Fallback):', fallbackResponse);
  return fallbackResponse;
}

/**
 * Multi-Modal "Best Way There" calculation Engine
 */
async function planBestWayMultiModal(destQuery, userLat, userLng, cityName, rawQuery = '') {
  try {
    const locationBias = { lat: userLat, lng: userLng, delta: 0.15, bounded: true };

    // Try location-biased search first; fallback to raw query search if 0 results
    let places = await searchNominatimPlaces(destQuery, locationBias);
    if (!places || places.length === 0) {
      places = await searchNominatimPlaces(rawQuery || destQuery);
    }
    if (!places || places.length === 0) return null;

    const targetPlace = places[0];
    const availability = await fetchMultiModeAvailability(userLat, userLng, 3000);

    const candidateModes = ['bus', 'metro', 'train', 'local_train'];
    let bestOption = null;

    for (const mode of candidateModes) {
      // Skip modes that are strictly unavailable near user
      if (availability[mode]?.available === false && mode !== 'bus') continue;

      const [origRes, destRes, osmRouteRelations] = await Promise.all([
        fetchNearestTransitStopToPoint(userLat, userLng, mode),
        fetchNearestTransitStopToPoint(targetPlace.lat, targetPlace.lng, mode),
        fetchOsmRouteRelationsBetweenPoints(userLat, userLng, targetPlace.lat, targetPlace.lng, mode, cityName, targetPlace.name)
      ]);

      if (origRes?.nearestStop && destRes?.nearestStop) {
        if (origRes.gapKm > 6 || destRes.gapKm > 6) continue;

        const routeData = await fetchOSRMRoute(origRes.nearestStop.lat, origRes.nearestStop.lng, destRes.nearestStop.lat, destRes.nearestStop.lng, mode);

        const walkToOrigMins = Math.round(origRes.gapKm * 12);
        const walkFromDestMins = Math.round(destRes.gapKm * 12);
        const transitMins = routeData.durationMins || 15;
        const totalDurationMins = transitMins + walkToOrigMins + walkFromDestMins;
        const stopsCount = Math.max(2, Math.round(routeData.distKm * 1.5));

        const matchedRouteRef = osmRouteRelations && osmRouteRelations.length > 0 ? osmRouteRelations[0].ref : null;
        const matchedRouteName = osmRouteRelations && osmRouteRelations.length > 0 ? osmRouteRelations[0].name : null;

        const option = {
          mode,
          modeLabel: mode === 'metro' ? 'Metro' : mode === 'train' ? 'Train' : mode === 'local_train' ? 'Local Train' : 'Bus',
          targetPlaceName: targetPlace.name,
          originStop: origRes.nearestStop,
          destinationStop: destRes.nearestStop,
          distKm: routeData.distKm,
          stopsCount,
          transitMins,
          walkMins: walkFromDestMins,
          totalMins: totalDurationMins,
          matchedRouteRef,
          matchedRouteName
        };

        if (!bestOption || option.totalMins < bestOption.totalMins) {
          bestOption = option;
        }
      }
    }

    if (bestOption) {
      let routeText = `Fastest option: **${bestOption.modeLabel}**`;
      if (bestOption.matchedRouteRef) {
        routeText = `Take **${bestOption.modeLabel} ${bestOption.matchedRouteRef}** (${bestOption.matchedRouteName || 'Direct Route'})`;
      }
      routeText += ` from **${bestOption.originStop.name}** to **${bestOption.destinationStop.name}** — ${bestOption.totalMins} min total door-to-door.`;

      return {
        cardType: 'best_way_there',
        isTripRecommendation: true,
        recommendedMode: bestOption.mode,
        recommendedModeLabel: bestOption.modeLabel,
        targetPlaceName: bestOption.targetPlaceName,
        originStop: bestOption.originStop,
        destinationStop: bestOption.destinationStop,
        stopsCount: bestOption.stopsCount,
        transitMins: bestOption.transitMins,
        walkMins: bestOption.walkMins,
        totalMins: bestOption.totalMins,
        matchedRouteRef: bestOption.matchedRouteRef,
        matchedRouteName: bestOption.matchedRouteName,
        responseText: routeText
      };
    }

  } catch (e) {
    console.warn('planBestWayMultiModal error:', e);
  }
  return null;
}

/**
 * Robust target place extractor that strips natural language routing prefixes
 */
function extractTargetPlaceName(fullQuery, phrasesToStrip = []) {
  if (!fullQuery) return '';
  let cleaned = fullQuery.toLowerCase().trim();

  const defaultPhrases = [
    'i want to go to',
    'i need to go to',
    'i am going to',
    'im going to',
    'i want to reach',
    'how do i get to',
    'how to get to',
    'how to reach',
    'best way to get to',
    'best way there to',
    'best way to',
    'can you take me to',
    'take me to',
    'directions to',
    'route to',
    'navigate to',
    'way to',
    'path to',
    'travel to',
    'head to',
    'go to'
  ];

  const allPhrases = [...phrasesToStrip, ...defaultPhrases];
  allPhrases.forEach((phrase) => {
    cleaned = cleaned.replace(phrase, ' ');
  });

  cleaned = cleaned
    .replace(/^(i|im|i'm|me|to|the|a|an|from|my|location)\s+/gi, '')
    .replace(/from my location|from me|my location|the|is|a|an|\?/gi, '')
    .trim();

  return cleaned || fullQuery.trim();
}
