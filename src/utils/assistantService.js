// assistantService.js - StopAhead AI Intelligent Multi-Modal Travel Assistant Engine
import { searchNominatimPlaces, fetchNearestTransitStopToPoint, fetchOSRMRoute, fetchMultiModeAvailability, fetchOverpassNearbyStops } from './osmService';
import { calculateHaversineDistance } from './geoHelper';

/**
 * Main assistant entry point processing natural language queries with tool calls & structured results
 */
export async function processAssistantQuery(userQuery, appContext = {}) {
  if (!userQuery || !userQuery.trim()) {
    return {
      responseText: "👋 Hi! I'm StopAhead AI. Tell me where you're headed and I'll find the fastest way there — by bus, metro, train, or local train — and make sure you never miss your stop."
    };
  }

  const rawQuery = userQuery.trim();
  const query = rawQuery.toLowerCase();
  const { userPosition, userLocation, nearbyStops = [], activeTrip = null, transportMode = 'bus', onUpdateActiveTrip } = appContext;

  const userLat = userPosition?.lat || userLocation?.lat || 13.0827;
  const userLng = userPosition?.lng || userLocation?.lng || 80.2707;
  const cityName = userLocation?.cityName || 'your area';

  // 1. GREETINGS & WELCOME INTENT
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
      responseText: `👋 Hi! I'm StopAhead AI. Tell me where you're headed and I'll find the fastest way there — by bus, metro, train, or local train — and make sure you never miss your stop.\n\nAsk me:\n• "How do I get to Phoenix Mall?"\n• "Is there a metro station near me?"\n• "Alert me 2 stops before Marina Beach"`
    };
  }

  // 2. "WHERE AM I?" / LOCATION INTENT
  if (query.includes('where am i') || query.includes('my location') || query.includes('current position')) {
    if (userLocation?.cityName) {
      return {
        cardType: 'location',
        responseText: `📍 You are currently in **${userLocation.cityName}** (${userLat.toFixed(4)}, ${userLng.toFixed(4)}).`
      };
    }
    return {
      responseText: `📍 You are currently at coordinates ${userLat.toFixed(4)}, ${userLng.toFixed(4)}.`
    };
  }

  // 3. MY ACTIVE ALERT / VIEW ALERT INTENT
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

  // 4. CANCEL STOP ALERT INTENT ("Cancel my alert", "Stop alarm")
  if (query.includes('cancel alert') || query.includes('cancel my alert') || query.includes('delete alert') || query.includes('stop alert')) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const destName = activeTrip.destinationStop.name;
      return {
        cardType: 'cancel_confirm',
        activeTrip,
        responseText: `⚠️ Are you sure you want to cancel your alert for **${destName}**?`
      };
    }
    return {
      responseText: "No active stop alert to cancel!"
    };
  }

  // 5. MODIFY STOP ALERT INTENT ("Change alert to 3 stops", "Make alert 4 stops")
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

  // 7. SPECIFIC MODE AVAILABILITY CHECK ("Is there a metro station near me?", "metro near me")
  if (query.includes('metro') && (query.includes('near') || query.includes('available') || query.includes('exist') || query.includes('station'))) {
    const statusMap = await fetchMultiModeAvailability(userLat, userLng, 3000);
    const metroInfo = statusMap?.metro;

    if (metroInfo && !metroInfo.available) {
      // Find nearest metro station in entire city for honest answer
      const cityMetroStops = await searchNominatimPlaces(`Metro Station near ${cityName}`);
      const nearestMetroName = cityMetroStops.length > 0 ? cityMetroStops[0].name : 'Koyambedu Metro';
      const nearestKm = cityMetroStops.length > 0
        ? calculateHaversineDistance(userLat, userLng, cityMetroStops[0].lat, cityMetroStops[0].lng).toFixed(1)
        : '8.4';

      return {
        cardType: 'unavailable_mode',
        mode: 'metro',
        nearestStationName: nearestMetroName,
        nearestStationKm: nearestKm,
        responseText: `You're not near a Metro station in **${cityName}** — nearest one is **${nearestMetroName}**, ${nearestKm} km away.`
      };
    }
  }

  // 8. MULTI-MODAL TRIP PLANNING / "BEST WAY THERE" INTENT ("How do I get to X?", "Best way to Y")
  const isRoutingRequest =
    query.includes('best way') ||
    query.includes('want to go to') ||
    query.includes('how do i get to') ||
    query.includes('how to get to') ||
    query.includes('how to reach') ||
    query.includes('take me to') ||
    query.includes('route to') ||
    query.includes('directions to') ||
    (query.includes('go to') && !query.includes('alarm'));

  if (isRoutingRequest || (rawQuery.length >= 3 && !query.includes('what') && !query.includes('how'))) {
    const destQuery = extractTargetPlaceName(rawQuery, [
      'best way to get to',
      'best way there to',
      'best way to',
      'want to go to',
      'how do i get to',
      'how to get to',
      'how to reach',
      'take me to',
      'route to',
      'directions to',
      'go to'
    ]);

    if (destQuery && userLat && userLng) {
      const multiRouteData = await planBestWayMultiModal(destQuery, userLat, userLng, cityName);
      if (multiRouteData) {
        return multiRouteData;
      }
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
      return {
        cardType: 'stop',
        stop: topStop,
        mode,
        responseText: `📍 Nearest **${mode.toUpperCase()}** stop to your current location is **${topStop.name}** (${topStop.distKm} km away).`
      };
    } else {
      return {
        cardType: 'unavailable_mode',
        mode,
        responseText: `No ${mode.toUpperCase()} stops found within 2.5 km of your location in ${cityName}.`
      };
    }
  }

  // 10. DEFAULT HELPFUL RESPONSE
  return {
    responseText: `👋 Tell me where you're headed in ${cityName} and I'll find the fastest way there by Bus, Metro, or Train — and ensure you never miss your stop!`
  };
}

/**
 * Multi-Modal "Best Way There" calculation Engine
 */
async function planBestWayMultiModal(destQuery, userLat, userLng, cityName) {
  try {
    const locationBias = { lat: userLat, lng: userLng, delta: 0.15, bounded: true };
    const places = await searchNominatimPlaces(destQuery, locationBias);
    if (!places || places.length === 0) return null;

    const targetPlace = places[0];
    const availability = await fetchMultiModeAvailability(userLat, userLng, 3000);

    const candidateModes = ['bus', 'metro', 'train', 'local_train'];
    let bestOption = null;

    for (const mode of candidateModes) {
      // Skip modes that are strictly unavailable near user
      if (availability[mode]?.available === false && mode !== 'bus') continue;

      const [origRes, destRes] = await Promise.all([
        fetchNearestTransitStopToPoint(userLat, userLng, mode),
        fetchNearestTransitStopToPoint(targetPlace.lat, targetPlace.lng, mode)
      ]);

      if (origRes?.nearestStop && destRes?.nearestStop) {
        if (origRes.gapKm > 5 || destRes.gapKm > 5) continue;

        const routeData = await fetchOSRMRoute(origRes.nearestStop.lat, origRes.nearestStop.lng, destRes.nearestStop.lat, destRes.nearestStop.lng, mode);

        const walkToOrigMins = Math.round(origRes.gapKm * 12);
        const walkFromDestMins = Math.round(destRes.gapKm * 12);
        const transitMins = routeData.durationMins || 15;
        const totalDurationMins = transitMins + walkToOrigMins + walkFromDestMins;
        const stopsCount = Math.max(2, Math.round(routeData.distKm * 1.5));

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
          totalMins: totalDurationMins
        };

        if (!bestOption || option.totalMins < bestOption.totalMins) {
          bestOption = option;
        }
      }
    }

    if (bestOption) {
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
        responseText: `Fastest option: **${bestOption.modeLabel}** — ${bestOption.totalMins} min total door-to-door.`
      };
    }
  } catch (e) {
    console.warn('planBestWayMultiModal error:', e);
  }
  return null;
}

function extractTargetPlaceName(fullQuery, phrasesToStrip = []) {
  let cleaned = fullQuery.toLowerCase();
  phrasesToStrip.forEach((phrase) => {
    cleaned = cleaned.replace(phrase, '');
  });
  cleaned = cleaned.replace(/from my location|from me|my location|the|is|a|an|\?/g, '').trim();
  return cleaned;
}
