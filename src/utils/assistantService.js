// assistantService.js - Data-Driven Live AI Assistant Engine for StopAhead
import { calculateHaversineDistance, formatDistance, formatTimeRemaining } from './geoHelper';
import { searchNominatimPlaces, fetchNearestTransitStopToPoint } from './osmService';

/**
 * Main query processor for StopAhead Assistant
 * Parses natural language query against live app context
 */
export async function processAssistantQuery(userQuery, appContext = {}) {
  if (!userQuery || !userQuery.trim()) {
    return "Hi! Ask me anything like 'How far is Anna Nagar?', 'What is my ETA?', or 'How many stops remaining?'";
  }

  const query = userQuery.trim().toLowerCase();
  const { userPosition, userLocation, nearbyStops = [], activeTrip = null, transportMode = 'bus' } = appContext;

  const userLat = userPosition?.lat || userLocation?.lat;
  const userLng = userPosition?.lng || userLocation?.lng;

  // 1. INTENT: Stops Remaining ("How many stops until my destination?")
  if (query.includes('stop') && (query.includes('how many') || query.includes('remaining') || query.includes('left') || query.includes('until'))) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const stopsLeft = activeTrip.remainingStopsCount ?? 2;
      const destName = activeTrip.destinationStop.name || 'your destination';
      return `You have ${stopsLeft} stop${stopsLeft === 1 ? '' : 's'} remaining until ${destName}.`;
    }
    return "You don't have an active trip running right now. Pick a destination on the 'Set Destination' tab to track remaining stops!";
  }

  // 2. INTENT: ETA / Arrival Time ("What's my ETA?")
  if (query.includes('eta') || query.includes('arrive') || query.includes('arrival') || query.includes('when will i get')) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const etaMins = activeTrip.etaMins ?? 12;
      const distKm = activeTrip.remainingDistKm ?? 4.5;
      const destName = activeTrip.destinationStop.name || 'your destination';
      return `Your ETA at ${destName} is in approximately ${etaMins} minutes (${distKm} km remaining).`;
    }
    return "No active trip currently running. Select a target stop to track live ETA!";
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
        return `Your alarm is set for ${threshVal} stop${threshVal === 1 ? '' : 's'} before ${destName}. It will trigger in approximately ${stopsUntilAlarm} stop${stopsUntilAlarm === 1 ? '' : 's'}.`;
      } else if (threshType === 'distance') {
        const distRemaining = activeTrip.remainingDistKm ?? 4.2;
        const distUntilAlarm = Math.max(0, (distRemaining - threshVal)).toFixed(1);
        return `Your alarm is set for ${threshVal} km before ${destName}. It will trigger in approximately ${distUntilAlarm} km.`;
      } else {
        const etaMins = activeTrip.etaMins ?? 15;
        const minsUntilAlarm = Math.max(1, etaMins - threshVal);
        return `Your alarm is set for ${threshVal} minutes before arrival. It will trigger in approximately ${minsUntilAlarm} mins.`;
      }
    }
    return "Set a destination first to enable your arrival proximity alarm!";
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
            return `Yes! Near ${matchedPlace.name}, the closest ${transportMode.toUpperCase()} stop is ${stop.name} (${stop.distKm} km away).`;
          }
        }
      } catch (e) {}
    }
  }

  // 5. INTENT: Distance to Stop / Place ("How far is X from my location?")
  if (query.includes('how far') || query.includes('distance to') || query.includes('far is') || query.includes('where is')) {
    const targetName = extractTargetPlaceName(userQuery, ['how far is', 'distance to', 'far is', 'where is']);

    if (userLat && userLng) {
      // A. Check if matching stop is in already fetched nearbyStops
      if (nearbyStops && nearbyStops.length > 0 && targetName) {
        const foundLocal = nearbyStops.find(
          (s) => s.name.toLowerCase().includes(targetName) || targetName.includes(s.name.toLowerCase())
        );
        if (foundLocal) {
          const distKm = calculateHaversineDistance(userLat, userLng, foundLocal.lat, foundLocal.lng);
          const walkMins = Math.round(distKm * 12);
          return `${foundLocal.name} is ${formatDistance(distKm)} from your current location, about a ${walkMins}-minute walk.`;
        }
      }

      // B. Check active trip destination
      if (activeTrip?.destinationStop && targetName && activeTrip.destinationStop.name.toLowerCase().includes(targetName)) {
        const dest = activeTrip.destinationStop;
        const distKm = calculateHaversineDistance(userLat, userLng, dest.lat, dest.lng);
        const walkMins = Math.round(distKm * 12);
        return `${dest.name} is ${formatDistance(distKm)} from your current location (${walkMins} min walk).`;
      }

      // C. Perform Background Nominatim Lookup for Target Place
      if (targetName && targetName.length >= 2) {
        try {
          const locationBias = { lat: userLat, lng: userLng, delta: 0.15, bounded: true };
          const places = await searchNominatimPlaces(targetName, locationBias);
          if (places && places.length > 0) {
            const p = places[0];
            const distKm = calculateHaversineDistance(userLat, userLng, p.lat, p.lng);
            const walkMins = Math.round(distKm * 12);
            return `${p.name} is ${formatDistance(distKm)} from your current location, about a ${walkMins}-minute walk.`;
          }
        } catch (e) {}
      }

      // Fallback: If user asked how far is nearest stop
      if (nearbyStops && nearbyStops.length > 0) {
        const closest = nearbyStops[0];
        return `The nearest ${transportMode.toUpperCase()} stop (${closest.name}) is ${formatDistance(closest.distKm)} from your location.`;
      }
    }
  }

  // 6. INTENT: General App Features & Help FAQs
  if (query.includes('sos') || query.includes('emergency') || query.includes('contact')) {
    return "Tap the red 'Emergency SOS' button on the header to send live tracking SMS alerts and call contacts.";
  }
  if (query.includes('share') || query.includes('link')) {
    return "Tap 'Share Live Trip' on the Active Trip screen to generate a live tracking link for friends and family.";
  }
  if (query.includes('contrast') || query.includes('theme') || query.includes('dark')) {
    return "You can toggle Dark Mode and High-Contrast vision support anytime in the 'Settings' tab!";
  }
  if (query.includes('sound') || query.includes('vibrate') || query.includes('chime')) {
    return "Go to Settings to choose your alert style (Sound, Vibration, or Both) and pick chime alarm sounds.";
  }

  // Default Fallback
  if (userLat && userLng && nearbyStops && nearbyStops.length > 0) {
    const topStop = nearbyStops[0];
    return `You're currently in ${userLocation?.cityName || 'your area'}. Nearest ${transportMode.toUpperCase()} stop is ${topStop.name} (${formatDistance(topStop.distKm)} away). How can I assist your trip?`;
  }

  return "I can help calculate exact distances, ETAs, remaining stops, and nearby stations. Try asking: 'How far is T Nagar?' or 'What is my ETA?'";
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
