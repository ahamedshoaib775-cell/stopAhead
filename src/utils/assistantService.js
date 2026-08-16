export async function processAssistantQuery(userQuery, appContext = {}) {
  if (!userQuery || !userQuery.trim()) {
    return {
      responseText: "Hi! I'm your StopAhead AI Assistant. Ask me anything like 'How do I get to Phoenix Mall?', 'What's my ETA?', or 'How does the proximity alarm work?'"
    };
  }

  const rawQuery = userQuery.trim();
  const query = rawQuery.toLowerCase();
  const { userPosition, userLocation, nearbyStops = [], activeTrip = null, transportMode = 'bus' } = appContext;

  const userLat = userPosition?.lat || userLocation?.lat;
  const userLng = userPosition?.lng || userLocation?.lng;

  // 1. GREETINGS & APP CAPABILITY INTRO
  if (
    query === 'hi' ||
    query === 'hello' ||
    query === 'hey' ||
    query.startsWith('hi ') ||
    query.startsWith('hello ') ||
    query.includes('who are you') ||
    query.includes('what can you do') ||
    query === 'help' ||
    query.includes('help me')
  ) {
    return {
      responseText: `👋 Hello! I'm StopAhead AI, your smart transit assistant for ${userLocation?.cityName || 'your city'}.\n\nHere is what I can do for you:\n• 🗺️ Plan optimal routes to any place ('How do I get to T Nagar?')\n• 📍 Find nearest transit stops ('Where is the closest bus stop?')\n• ⏱️ Check live ETA & remaining stops ('What is my ETA?')\n• 🔔 Monitor arrival alarms ('When will my alarm trigger?')\n• ⚙️ Explain app features (SOS, Voice alerts in Tamil/English, Dark mode)`
    };
  }

  // 2. TRIP & ROUTE PLANNING INTENT ("How do I get to X?", "Take me to Y", "Route to Z", "Marina Beach")
  const isRoutingRequest =
    query.includes('want to go to') ||
    query.includes('how do i get to') ||
    query.includes('how to get to') ||
    query.includes('how to reach') ||
    query.includes('take me to') ||
    query.includes('route to') ||
    query.includes('navigate to') ||
    query.includes('directions to') ||
    query.includes('way to') ||
    query.includes('path to') ||
    query.includes('travel to') ||
    query.includes('head to') ||
    (query.includes('go to') && !query.includes('alarm') && !query.includes('settings'));

  if (isRoutingRequest) {
    const destQuery = extractTargetPlaceName(rawQuery, [
      'want to go to',
      'how do i get to',
      'how to get to',
      'how to reach',
      'take me to',
      'route to',
      'navigate to',
      'directions to',
      'way to',
      'path to',
      'travel to',
      'head to',
      'go to'
    ]);

    if (destQuery && userLat && userLng) {
      const recommendation = await planTripFromConversation(destQuery, appContext);
      if (recommendation) {
        return recommendation;
      }
    }
  }

  // 3. REMAINING STOPS INTENT ("How many stops left?", "When do I get off?")
  if (
    (query.includes('stop') || query.includes('station')) &&
    (query.includes('how many') || query.includes('remaining') || query.includes('left') || query.includes('until') || query.includes('next'))
  ) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const stopsLeft = activeTrip.stopsRemaining ?? activeTrip.remainingStopsCount ?? 2;
      const destName = activeTrip.destinationStop.name || 'your destination';
      return {
        responseText: `🚌 You have ${stopsLeft} stop${stopsLeft === 1 ? '' : 's'} remaining until ${destName}. Get ready to prepare your exit!`
      };
    }
    return {
      responseText: "You don't have an active trip running right now. Pick a destination on the 'Set Destination' screen to track live remaining stops!"
    };
  }

  // 4. ETA & ARRIVAL TIME INTENT ("What's my ETA?", "When will I arrive?")
  if (query.includes('eta') || query.includes('arrive') || query.includes('arrival') || query.includes('when will i get') || query.includes('time remaining')) {
    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const etaMins = activeTrip.timeRemainingMins ?? activeTrip.etaMins ?? 10;
      const distKm = activeTrip.distanceRemainingKm ?? activeTrip.remainingDistKm ?? 2.5;
      const destName = activeTrip.destinationStop.name || 'your destination';
      return {
        responseText: `⏱️ Your estimated arrival at ${destName} is in approximately ${etaMins} minute${etaMins === 1 ? '' : 's'} (${distKm} km remaining).`
      };
    }
    return {
      responseText: "No active trip currently running. Select a destination to track your live ETA in real-time!"
    };
  }

  // 5. PROXIMITY ALARM TRIGGER INTENT ("When will my alarm trigger?", "How does the alarm work?")
  if (query.includes('alarm') || query.includes('alert') || query.includes('wake') || query.includes('trigger') || query.includes('ring')) {
    if (query.includes('how') && (query.includes('work') || query.includes('set') || query.includes('use'))) {
      return {
        responseText: "🔔 **StopAhead Proximity Alarm**\n\nStopAhead tracks your live GPS position in the background as you commute on a bus, train, or metro. When you reach your set threshold (e.g. 2 stops or 1 km before destination), it triggers loud audio chimes, strong vibration patterns, and spoken voice alerts so you never miss your stop!"
      };
    }

    if (activeTrip && activeTrip.status !== 'idle' && activeTrip.destinationStop) {
      const threshType = activeTrip.thresholdType || 'stops';
      const threshVal = activeTrip.thresholdValue || 2;
      const destName = activeTrip.destinationStop.name || 'your destination';

      if (threshType === 'stops') {
        const stopsRemaining = activeTrip.stopsRemaining ?? 3;
        const stopsUntilAlarm = Math.max(0, stopsRemaining - threshVal);
        return {
          responseText: `🔔 Your alarm is set for ${threshVal} stop${threshVal === 1 ? '' : 's'} before ${destName}. It will trigger in approximately ${stopsUntilAlarm} stop${stopsUntilAlarm === 1 ? '' : 's'}!`
        };
      } else if (threshType === 'distance') {
        const distRemaining = activeTrip.distanceRemainingKm ?? 3.5;
        const distUntilAlarm = Math.max(0, distRemaining - threshVal).toFixed(1);
        return {
          responseText: `🔔 Your alarm is set for ${threshVal} km before ${destName}. It will trigger in approximately ${distUntilAlarm} km.`
        };
      } else {
        const etaMins = activeTrip.timeRemainingMins ?? 12;
        const minsUntilAlarm = Math.max(1, etaMins - threshVal);
        return {
          responseText: `🔔 Your alarm is set for ${threshVal} minute${threshVal === 1 ? '' : 's'} before arrival. It will trigger in approximately ${minsUntilAlarm} min.`
        };
      }
    }
    return {
      responseText: "Set a destination on the 'Set Destination' tab to enable your custom arrival proximity alarm!"
    };
  }

  // 6. NEARBY TRANSIT STOPS INTENT ("Where is the nearest stop?")
  if ((query.includes('nearest') || query.includes('closest') || query.includes('nearby')) && (query.includes('stop') || query.includes('station') || query.includes('bus') || query.includes('metro') || query.includes('train'))) {
    if (nearbyStops && nearbyStops.length > 0) {
      const topStop = nearbyStops[0];
      const distStr = formatDistance(topStop.distKm || 0.3);
      return {
        responseText: `📍 The nearest ${transportMode.toUpperCase()} stop to your current location is **${topStop.name}** (${distStr} away).`
      };
    }
    return {
      responseText: `Searching OpenStreetMap for nearby ${transportMode} stops in ${userLocation?.cityName || 'your location'}... Try selecting a mode on the 'Set Destination' screen!`
    };
  }

  // 7. APP FEATURES & FAQ KNOWLEDGE BASE
  if (query.includes('sos') || query.includes('emergency') || query.includes('safety') || query.includes('contact')) {
    return {
      responseText: "🚨 **Emergency SOS Feature**\n\nTap the red 'Emergency SOS' button on the header bar anytime. It generates an automated SMS tracking link with your live coordinates and sends emergency alerts to your saved family contacts."
    };
  }

  if (query.includes('share') || query.includes('tracking link') || query.includes('live trip')) {
    return {
      responseText: "📲 **Share Live Trip**\n\nDuring an active trip, tap 'Share Live Trip' on the Active Journey screen to copy a live tracking URL or share it directly via WhatsApp/SMS to friends and family."
    };
  }

  if (query.includes('voice') || query.includes('tamil') || query.includes('english') || query.includes('language') || query.includes('speak')) {
    return {
      responseText: "🗣️ **Voice Alerts (English & Tamil)**\n\nStopAhead speaks voice announcements as you approach your stop! You can toggle Voice Alerts and switch between English and Tamil (தமிழ்) anytime in the 'Settings' tab."
    };
  }

  if (query.includes('city') || query.includes('location permission') || query.includes('override')) {
    return {
      responseText: "🌆 **City & GPS Selector**\n\nTap the blue location chip at the top of the 'Set Destination' screen to manually choose your city (Chennai, Mumbai, Delhi, Bengaluru, Hyderabad, Kolkata, etc.) or grant live browser GPS access."
    };
  }

  if (query.includes('simulat') || query.includes('test') || query.includes('offline') || query.includes('demo')) {
    return {
      responseText: "🎮 **GPS Simulation & Demo Mode**\n\nYou can test how the alarm triggers without moving! In Settings, toggle between 'Simulated GPS' (moves automatically along the road) and 'Real GPS' (uses live hardware location)."
    };
  }

  if (query.includes('contrast') || query.includes('theme') || query.includes('dark') || query.includes('font')) {
    return {
      responseText: "🎨 **High Contrast & Dark Theme**\n\nStopAhead supports Dark Mode and high-contrast vision accessibility. Customize theme modes and font sizes in the 'Settings' tab!"
    };
  }

  // 8. DIRECT LOCATION / PLACE SEARCH FALLBACK (e.g. "Phoenix Mall", "Anna Nagar", "Marina Beach")
  if (userLat && userLng && rawQuery.length >= 3) {
    const directTrip = await planTripFromConversation(rawQuery, appContext);
    if (directTrip) return directTrip;
  }

  // 9. DEFAULT HELPFUL FALLBACK
  if (userLat && userLng && nearbyStops && nearbyStops.length > 0) {
    const topStop = nearbyStops[0];
    return {
      responseText: `I'm here to help you navigate ${userLocation?.cityName || 'your city'}!\n\n• Nearest ${transportMode.toUpperCase()} stop: ${topStop.name} (${formatDistance(topStop.distKm)})\n• Ask me: 'How do I get to Phoenix Mall?', 'What's my ETA?', or 'How to set alarm?'`
    };
  }

  return {
    responseText: "I can help calculate exact distances, ETAs, remaining stops, and plan complete journeys! Try asking: 'How do I get to Phoenix Mall?' or 'What's my ETA?'"
  };
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
