// geoHelper.js - Geolocation, distance math, bearing, and polyline snapping for StopAhead

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
 * Calculates bearing angle in degrees (0-360) between two lat/lng coordinates
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

/**
 * Projects point P(px, py) onto line segment AB(ax, ay) -> (bx, by)
 * Returns closest point (x, y) on the segment to P.
 */
export function projectPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return { x: ax, y: ay, t: 0 };
  }

  // Parameter t represents relative distance along line segment (0 <= t <= 1)
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  return {
    x: ax + t * dx,
    y: ay + t * dy,
    t
  };
}

/**
 * Snaps a GPS coordinate [lat, lng] to the nearest point on a polyline array of [lat, lng]
 * Returns { snappedLat, snappedLng, headingDeg, distanceMeters, isWeakGps }
 */
export function snapPointToPolyline(rawLat, rawLng, polylineCoords) {
  if (!polylineCoords || polylineCoords.length === 0) {
    return {
      snappedLat: rawLat,
      snappedLng: rawLng,
      headingDeg: 0,
      distanceMeters: 0,
      isWeakGps: false
    };
  }

  if (polylineCoords.length === 1) {
    const distMeters = calculateHaversineDistance(rawLat, rawLng, polylineCoords[0][0], polylineCoords[0][1]) * 1000;
    return {
      snappedLat: polylineCoords[0][0],
      snappedLng: polylineCoords[0][1],
      headingDeg: 0,
      distanceMeters: Math.round(distMeters),
      isWeakGps: distMeters > 75
    };
  }

  let minDistanceMeters = Infinity;
  let bestSnappedPoint = { lat: rawLat, lng: rawLng };
  let bestHeading = 0;

  for (let i = 0; i < polylineCoords.length - 1; i++) {
    const p1 = polylineCoords[i];
    const p2 = polylineCoords[i + 1];

    if (!p1 || !p2 || p1.length < 2 || p2.length < 2) continue;

    const projected = projectPointToSegment(rawLat, rawLng, p1[0], p1[1], p2[0], p2[1]);
    const distKm = calculateHaversineDistance(rawLat, rawLng, projected.x, projected.y);
    const distMeters = distKm * 1000;

    if (distMeters < minDistanceMeters) {
      minDistanceMeters = distMeters;
      bestSnappedPoint = { lat: projected.x, lng: projected.y };
      bestHeading = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
    }
  }

  return {
    snappedLat: bestSnappedPoint.lat,
    snappedLng: bestSnappedPoint.lng,
    headingDeg: bestHeading,
    distanceMeters: Math.round(minDistanceMeters),
    isWeakGps: minDistanceMeters > 75
  };
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
