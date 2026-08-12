// assistantService.js - Data-Driven Live AI Assistant & Trip Planning Engine for StopAhead
import { calculateHaversineDistance, formatDistance, formatTimeRemaining } from './geoHelper';
import { searchNominatimPlaces, fetchNearestTransitStopToPoint, fetchOSRMRoute } from './osmService';

/**
 * Main query processor for StopAhead Assistant
 * Parses natural language query against live app context
 */
export async function processAssistantQuery(userQuery, appContext = {}) {
  if (!userQuery || !userQuery.trim()) {
    return {
      responseText: "Hi! Ask me anything like 'How do I get to Phoenix Mall?', 'How far is Anna Nagar?', or 'What is my ETA?'"
    };
  }

  const query = userQuery.trim().toLowerCase();
  const { userPosition, userLocation, nearbyStops = [], activeTrip = null, transportMode = 'bus' } = appContext;

  const userLat = userPosition?.lat || userLocation?.lat;
  const userLng = userPosition?.lng || userLocation?.lng;

  // 0. INTENT: Conversational Trip Planning ("How do I get to Phoenix Mall?", "I want to go to Anna Nagar", "Take me to T Nagar")
  if (
    query.includes('want to go to') ||
    query.includes('how do i get to') ||
    query.includes('how to reach') ||
    query.includes('take me to') ||
    query.includes('route to') ||
    query.includes('navigate to') ||
    query.includes('directions to') ||
    (query.includes('go to') && !query.includes('alarm'))
  ) {
    const destQuery = extractTargetPlaceName(userQuery, [
      'want to go to',
      'how do i get to',
      'how to reach',
      'take me to',
      'route to',
      'navigate to',
      'directions to',
      'go to'
    ]);

    if (destQuery && userLat && userLng) {
      const recommendation = await planTripFromConversation(destQuery, appContext);
      if (recommendation) {
        return recommendation;
      }
    }
  }

  // 1. INTENT: Stops Remaining ("How many stops until my destination?")
  if (query.includes('stop') && (query.includes('how many') || query.includes('remaining') || query.includes('left') || query.includes('until'))) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const stopsLeft = activeTrip.remainingStopsCount ?? 2;
      const destName = activeTrip.destinationStop.name || 'your destination';
      return { responseText: `You have ${stopsLeft} stop${stopsLeft === 1 ? '' : 's'} remaining until ${destName}.` };
    }
    return { responseText: "You don't have an active trip running right now. Pick a destination on the 'Set Destination' tab to track remaining stops!" };
  }

  // 2. INTENT: ETA / Arrival Time ("What's my ETA?")
  if (query.includes('eta') || query.includes('arrive') || query.includes('arrival') || query.includes('when will i get')) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const etaMins = activeTrip.etaMins ?? 12;
      const distKm = activeTrip.remainingDistKm ?? 4.5;
      const destName = activeTrip.destinationStop.name || 'your destination';
      return { responseText: `Your ETA at ${destName} is in approximately ${etaMins} minutes (${distKm} km remaining).` };
    }
    return { responseText: "No active trip currently running. Select a target stop to track live ETA!" };
  }

  // 3. INTENT: Alarm Trigger Countdown ("How long until my alarm goes off?")
  if (query.includes('alarm') || query.includes('alert') || query.includes('wake') || query.includes('trigger')) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const threshType = activeTrip.thresholdType || 'stops';
      const threshVal = activeTrip.thresholdValue || 2;
      const destName = activeTrip.destinationStop.name || 'your destination';

      if (threshType === 'stops') {
        const stopsRemaining = activeTrip.remainingStopsCount ?? 3;
        const stopsUntilAlarm = Math.max(0, stopsRemaining - threshVal);
        return { responseText: `Your alarm is set for ${threshVal} stop${threshVal === 1 ? '' : 's'} before ${destName}. It will trigger in approximately ${stopsUntilAlarm} stop${stopsUntilAlarm === 1 ? '' : 's'}.` };
      } else if (threshType === 'distance') {
        const distRemaining = activeTrip.remainingDistKm ?? 4.2;
        const distUntilAlarm = Math.max(0, (distRemaining - threshVal)).toFixed(1);
        return { responseText: `Your alarm is set for ${threshVal} km before ${destName}. It will trigger in approximately ${distUntilAlarm} km.` };
      } else {
        const etaMins = activeTrip.etaMins ?? 15;
        const minsUntilAlarm = Math.max(1, etaMins - threshVal);
        return { responseText: `Your alarm is set for ${threshVal} minutes before arrival. It will trigger in approximately ${minsUntilAlarm} mins.` };
      }
    }
    return { responseText: "Set a destination first to enable your arrival proximity alarm!" };
  }

  // 4. INTENT: Is there a stop near [Place]? ("Is there a bus stop near Phoenix Mall?")
  if ((query.includes('is there a') || query.includes('are there')) && (query.includes('stop') || query.includes('station')) && query.includes('near')) {
    const targetPlaceQuery = extractTargetPlaceName(userQuery, ['near']);
    if (targetPlaceQuery && userLat && userLng) {
      try {
        const locationBias = { lat: userLat, lng: userLng, delta: 0.15, bounded: true };
        const places = await searchNominatimPlaces(targetPlaceQuery, locationBias);
        if (places && places.length > 0) {
          const matchedPlace = places[0];
          const result = await fetchNearestTransitStopToPoint(matchedPlace.lat, matchedPlace.lng, transportMode);
          if (result && result.nearestStop) {
            const stop = result.nearestStop;
            return { responseText: `Yes! Near ${matchedPlace.name}, the closest ${transportMode.toUpperCase()} stop is ${stop.name} (${stop.distKm} km away).` };
          }
        }
      } catch (e) {}
    }
  }

  // 5. INTENT: Distance to Stop / Place ("How far is X from my location?")
  if (query.includes('how far') || query.includes('distance to') || query.includes('far is') || query.includes('where is')) {
    const targetName = extractTargetPlaceName(userQuery, ['how far is', 'distance to', 'far is', 'where is']);

    if (userLat && userLng) {
      if (nearbyStops && nearbyStops.length > 0 && targetName) {
        const foundLocal = nearbyStops.find(
          (s) => s.name.toLowerCase().includes(targetName) || targetName.includes(s.name.toLowerCase())
        );
        if (foundLocal) {
          const distKm = calculateHaversineDistance(userLat, userLng, foundLocal.lat, foundLocal.lng);
          const walkMins = Math.round(distKm * 12);
          return { responseText: `${foundLocal.name} is ${formatDistance(distKm)} from your current location, about a ${walkMins}-minute walk.` };
        }
      }

      if (activeTrip?.destinationStop && targetName && activeTrip.destinationStop.name.toLowerCase().includes(targetName)) {
        const dest = activeTrip.destinationStop;
        const distKm = calculateHaversineDistance(userLat, userLng, dest.lat, dest.lng);
        const walkMins = Math.round(distKm * 12);
        return { responseText: `${dest.name} is ${formatDistance(distKm)} from your current location (${walkMins} min walk).` };
      }

      if (targetName && targetName.length >= 2) {
        try {
          const locationBias = { lat: userLat, lng: userLng, delta: 0.15, bounded: true };
          const places = await searchNominatimPlaces(targetName, locationBias);
          if (places && places.length > 0) {
            const p = places[0];
            const distKm = calculateHaversineDistance(userLat, userLng, p.lat, p.lng);
            const walkMins = Math.round(distKm * 12);
            return { responseText: `${p.name} is ${formatDistance(distKm)} from your current location, about a ${walkMins}-minute walk.` };
          }
        } catch (e) {}
      }

      if (nearbyStops && nearbyStops.length > 0) {
        const closest = nearbyStops[0];
        return { responseText: `The nearest ${transportMode.toUpperCase()} stop (${closest.name}) is ${formatDistance(closest.distKm)} from your location.` };
      }
    }
  }

  // 6. INTENT: General App Features & Help FAQs
  if (query.includes('sos') || query.includes('emergency') || query.includes('contact')) {
    return { responseText: "Tap the red 'Emergency SOS' button on the header to send live tracking SMS alerts and call contacts." };
  }
  if (query.includes('share') || query.includes('link')) {
    return { responseText: "Tap 'Share Live Trip' on the Active Trip screen to generate a live tracking link for friends and family." };
  }
  if (query.includes('contrast') || query.includes('theme') || query.includes('dark')) {
    return { responseText: "You can toggle Dark Mode and High-Contrast vision support anytime in the 'Settings' tab!" };
  }
  if (query.includes('sound') || query.includes('vibrate') || query.includes('chime')) {
    return { responseText: "Go to Settings to choose your alert style (Sound, Vibration, or Both) and pick chime alarm sounds." };
  }

  // Fallback check if user typed a location name directly without trigger words
  if (userLat && userLng && query.length >= 3) {
    const directTrip = await planTripFromConversation(userQuery, appContext);
    if (directTrip) return directTrip;
  }

  // Default Fallback
  if (userLat && userLng && nearbyStops && nearbyStops.length > 0) {
    const topStop = nearbyStops[0];
    return { responseText: `You're currently in ${userLocation?.cityName || 'your area'}. Nearest ${transportMode.toUpperCase()} stop is ${topStop.name} (${formatDistance(topStop.distKm)} away). How can I assist your trip?` };
  }

  return { responseText: "I can help calculate exact distances, ETAs, remaining stops, and plan complete journeys! Try asking: 'How do I get to Phoenix Mall?' or 'How far is T Nagar?'" };
}

/**
 * End-to-End Conversational Trip Planner
 * Geocodes target place, compares Bus/Metro/Train routes, and formulates optimal journey option
 */
export async function planTripFromConversation(destQuery, appContext = {}) {
  const { userPosition, userLocation, transportMode = 'bus' } = appContext;
  const userLat = userPosition?.lat || userLocation?.lat;
  const userLng = userPosition?.lng || userLocation?.lng;

  if (!userLat || !userLng || !destQuery) return null;

  try {
    const locationBias = { lat: userLat, lng: userLng, delta: 0.15, bounded: true };
    const places = await searchNominatimPlaces(destQuery, locationBias);
    if (!places || places.length === 0) return null;

    const targetPlace = places[0];

    const candidateModes = [transportMode, 'metro', 'bus', 'train'].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    let bestOption = null;

    for (const mode of candidateModes) {
      const origStops = await fetchNearestTransitStopToPoint(userLat, userLng, mode);
      const destStops = await fetchNearestTransitStopToPoint(targetPlace.lat, targetPlace.lng, mode);

      if (origStops?.nearestStop && destStops?.nearestStop) {
        const originStop = origStops.nearestStop;
        const destinationStop = destStops.nearestStop;

        const routeData = await fetchOSRMRoute(originStop.lat, originStop.lng, destinationStop.lat, destinationStop.lng, mode);

        const walkToOrigMins = Math.round(origStops.gapKm * 12);
        const walkFromDestMins = Math.round(destStops.gapKm * 12);
        const totalDurationMins = (routeData.durationMins || 15) + walkToOrigMins + walkFromDestMins;
        const estimatedStopsCount = Math.max(2, Math.round(routeData.distKm * 1.5));

        const option = {
          mode,
          modeLabel: mode === 'metro' ? 'Metro' : mode === 'train' ? 'Local Train' : 'Bus',
          targetPlaceName: targetPlace.name,
          targetPlaceDescription: targetPlace.description,
          originStop,
          destinationStop,
          routeCoordinates: routeData.coordinates,
          distKm: routeData.distKm,
          stopsCount: estimatedStopsCount,
          transitMins: routeData.durationMins || 15,
          walkMins: walkFromDestMins,
          totalMins: totalDurationMins
        };

        if (!bestOption || option.totalMins < bestOption.totalMins) {
          bestOption = option;
        }
      }
    }

    if (bestOption) {
      const modeText = bestOption.modeLabel;
      const boardStop = bestOption.originStop.name;
      const getOffStop = bestOption.destinationStop.name;
      const stops = bestOption.stopsCount;
      const tMins = bestOption.transitMins;
      const wMins = bestOption.walkMins;
      const target = bestOption.targetPlaceName;

      let responseText = `Take the ${modeText} — board at ${boardStop}, get off at ${getOffStop} (${stops} stops, ~${tMins} min)`;
      if (wMins > 1) {
        responseText += `, then it's a ${wMins} min walk to ${target}.`;
      } else {
        responseText += ` directly near ${target}.`;
      }

      return {
        isTripRecommendation: true,
        recommendedMode: bestOption.mode,
        recommendedModeLabel: bestOption.modeLabel,
        targetPlaceName: target,
        originStop: bestOption.originStop,
        destinationStop: bestOption.destinationStop,
        stopsCount: stops,
        transitMins: tMins,
        walkMins: wMins,
        totalMins: bestOption.totalMins,
        responseText
      };
    }
  } catch (err) {
    console.warn('Trip planning query error:', err);
  }

  return null;
}

/**
 * Helper to extract target place or stop name from natural language query string
 */
function extractTargetPlaceName(fullQuery, phrasesToStrip = []) {
  let cleaned = fullQuery.toLowerCase();
  phrasesToStrip.forEach((phrase) => {
    cleaned = cleaned.replace(phrase, '');
  });
  cleaned = cleaned.replace(/from my location|from me|my location|the|is|a|an|\?/g, '').trim();
  return cleaned;
}
