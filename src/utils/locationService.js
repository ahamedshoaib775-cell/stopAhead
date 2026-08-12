// locationService.js - Geolocation browser manager & proximity calculator
import { reverseGeocodeLocation } from './osmService';
import { calculateHaversineDistance } from './geoHelper';

// In-memory session cache for user location
let sessionLocationCache = null;

/**
 * Get cached session location
 */
export function getSessionLocation() {
  return sessionLocationCache;
}

/**
 * Set session location
 */
export function setSessionLocation(locationData) {
  sessionLocationCache = locationData;
  return sessionLocationCache;
}

/**
 * Request Geolocation from Browser with error handling & reverse geocoding
 */
export async function requestBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ success: false, error: 'Geolocation is not supported by your browser' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Detect city via OpenStreetMap reverse geocoding
        let cityName = await reverseGeocodeLocation(lat, lng);
        if (!cityName) cityName = 'Detected Location';

        const locationData = {
          success: true,
          lat,
          lng,
          cityName,
          isManual: false,
          timestamp: Date.now()
        };

        sessionLocationCache = locationData;
        resolve(locationData);
      },
      (error) => {
        console.warn('Geolocation permission or position error:', error.message);
        let errorReason = 'Permission denied or location unavailable';
        if (error.code === error.PERMISSION_DENIED) {
          errorReason = 'Location permission denied by user';
        }
        resolve({ success: false, error: errorReason });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 min cache
      }
    );
  });
}

/**
 * Sort transit stops by distance to user location
 */
export function sortStopsByProximity(stops, userLat, userLng) {
  if (!stops || !userLat || !userLng) return stops;

  return [...stops].map((stop) => {
    const distKm = calculateHaversineDistance(userLat, userLng, stop.lat, stop.lng);
    return { ...stop, userDistKm: distKm };
  }).sort((a, b) => a.userDistKm - b.userDistKm);
}
