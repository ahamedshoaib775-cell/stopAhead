// geoHelper.js - Geolocation and distance math for real & simulated tracking

/**
 * Calculates distance between two lat/lng coordinates in kilometers using Haversine formula
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Format distance in km or meters nicely
 */
export function formatDistance(distKm) {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`;
  }
  return `${distKm.toFixed(1)} km`;
}

/**
 * Format minutes into MM:SS or human readable string
 */
export function formatTimeRemaining(mins) {
  if (mins <= 0) return 'Arriving now';
  const wholeMins = Math.floor(mins);
  const seconds = Math.floor((mins - wholeMins) * 60);
  if (wholeMins < 1) {
    return `${seconds} sec`;
  }
  return `${wholeMins} min ${seconds > 0 ? `${seconds}s` : ''}`;
}
