// navigationHelper.js - Google Maps Deep Link Handoff Utility (Zero API Key Required)

/**
 * Maps StopAhead transport mode to Google Maps accepted travelmode parameter
 * Accepted values: transit, walking, bicycling, driving
 */
export function mapTransportModeToGoogle(mode = 'bus', travelType = 'transit') {
  if (travelType === 'walking' || mode === 'walk' || mode === 'foot') {
    return 'walking';
  }
  if (mode === 'bicycling' || mode === 'bike') {
    return 'bicycling';
  }
  if (mode === 'driving' || mode === 'car') {
    return 'driving';
  }
  // Bus, Metro, Train, Local Train -> transit
  return 'transit';
}

/**
 * Builds a clean Google Maps directions URL for turn-by-turn navigation (no API key required)
 * Format: https://www.google.com/maps/dir/?api=1&origin=USER_LAT,USER_LNG&destination=DEST_LAT,DEST_LNG&travelmode=transit
 */
export function buildGoogleMapsDirectionsUrl(originLat, originLng, destLat, destLng, mode = 'bus', travelType = 'transit') {
  if (!destLat || !destLng) {
    console.warn('[Google Maps Deep Link] Missing destination coordinates:', destLat, destLng);
    return 'https://www.google.com/maps';
  }

  // Resolve origin coordinates from arguments or window fallback state
  let finalOriginLat = originLat;
  let finalOriginLng = originLng;

  if ((!finalOriginLat || !finalOriginLng) && typeof window !== 'undefined') {
    const globLoc = window.stopAheadUserLocation || window.stopAheadUserPosition;
    if (globLoc?.lat && globLoc?.lng) {
      finalOriginLat = globLoc.lat;
      finalOriginLng = globLoc.lng;
    }
  }

  // Log exact origin & destination values before constructing URL
  console.log('Deep link origin:', finalOriginLat, finalOriginLng);
  console.log('Deep link destination:', destLat, destLng);

  const travelMode = mapTransportModeToGoogle(mode, travelType);
  const destStr = `${destLat},${destLng}`;
  let url = `https://www.google.com/maps/dir/?api=1&destination=${destStr}&travelmode=${travelMode}`;

  if (finalOriginLat && finalOriginLng) {
    url += `&origin=${finalOriginLat},${finalOriginLng}`;
  } else {
    console.warn('[Google Maps Deep Link Notice] Origin coordinates not yet available. Google Maps will use device current GPS.');
  }

  console.log('Google Maps Deep Link URL:', url);
  return url;
}

/**
 * Triggers native handoff to Google Maps app (Android/iOS) or browser fallback
 */
export function openGoogleMapsDirections(originLat, originLng, destLat, destLng, mode = 'bus', travelType = 'transit') {
  const url = buildGoogleMapsDirectionsUrl(originLat, originLng, destLat, destLng, mode, travelType);
  window.open(url, '_blank', 'noopener,noreferrer');
}
