/**
 * GPS Filtering, Sanity Validation, Bearing Calculation & Route Snapping Utilities
 */

// Calculate haversine distance in meters between two lat/lng coordinates
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null ||
      lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) {
    return 0;
  }
  const R = 6371e3;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Calculate compass bearing in degrees (0-360) between two points
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const toDeg = (x) => (x * 180) / Math.PI;

  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));

  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(bearing);
}

/**
 * Filter and validate incoming browser GPS reading
 * @param {Object} raw - { lat, lng, accuracy, heading, speed, timestamp }
 * @param {Object} lastAccepted - previous accepted reading
 * @returns {Object|null} - validated reading or null if rejected
 */
export function validateGpsReading(raw, lastAccepted = null) {
  if (!raw || typeof raw.lat !== 'number' || typeof raw.lng !== 'number') return null;
  if (isNaN(raw.lat) || isNaN(raw.lng)) return null;
  if (raw.lat < -90 || raw.lat > 90 || raw.lng < -180 || raw.lng > 180) return null;
  if (raw.lat === 0 && raw.lng === 0) return null;

  const now = raw.timestamp || Date.now();
  const accuracy = typeof raw.accuracy === 'number' ? raw.accuracy : 15;

  // Do not reject valid device GPS readings; accept real browser coordinates
  if (accuracy > 3500) {
    return null;
  }

  let calculatedHeading = raw.heading;
  let calculatedSpeed = raw.speed;

  if (lastAccepted) {
    const elapsedSeconds = Math.max(0.5, (now - (lastAccepted.timestamp || now)) / 1000);
    const distanceMoved = calculateDistanceMeters(lastAccepted.lat, lastAccepted.lng, raw.lat, raw.lng);

    // Sanity check: Reject impossible teleportation (> 32 m/s = ~115 km/h for city delivery)
    const impliedSpeedMs = distanceMoved / elapsedSeconds;
    if (impliedSpeedMs > 32 && distanceMoved > 100) {
      console.warn(`[GPS Filter] Discarded GPS jump: ${distanceMoved}m in ${elapsedSeconds}s (~${Math.round(impliedSpeedMs * 3.6)} km/h)`);
      return null;
    }

    // Calculate heading if device heading is null or zero
    if ((calculatedHeading === null || calculatedHeading === undefined || calculatedHeading === 0) && distanceMoved >= 4) {
      calculatedHeading = calculateBearing(lastAccepted.lat, lastAccepted.lng, raw.lat, raw.lng);
    }

    if (calculatedSpeed === null || calculatedSpeed === undefined) {
      calculatedSpeed = Math.round(impliedSpeedMs * 10) / 10;
    }
  }

  return {
    lat: raw.lat,
    lng: raw.lng,
    accuracy,
    heading: typeof calculatedHeading === 'number' ? calculatedHeading : 0,
    speed: typeof calculatedSpeed === 'number' ? calculatedSpeed : 0,
    timestamp: now
  };
}

/**
 * Project a point onto a line segment
 */
function projectPointToSegment(p, a, b) {
  const [pLat, pLng] = p;
  const [aLat, aLng] = a;
  const [bLat, bLng] = b;

  const dx = bLng - aLng;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return {
      point: a,
      t: 0,
      distance: calculateDistanceMeters(pLat, pLng, aLat, aLng)
    };
  }

  let t = ((pLng - aLng) * dx + (pLat - aLat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * dy;
  const projLng = aLng + t * dx;

  return {
    point: [projLat, projLng],
    t,
    distance: calculateDistanceMeters(pLat, pLng, projLat, projLng)
  };
}

/**
 * Snap point to polyline and split polyline into completed and remaining segments
 * @param {Array} point - [lat, lng]
 * @param {Array} polyline - [[lat, lng], ...]
 */
export function splitRouteProgress(point, polyline) {
  if (!Array.isArray(polyline) || polyline.length < 2 || !point) {
    return {
      completedPath: [],
      remainingPath: polyline || [],
      snappedPoint: point,
      distanceToRoute: 0
    };
  }

  let minDistance = Infinity;
  let bestIdx = 0;
  let bestSnapped = point;

  for (let i = 0; i < polyline.length - 1; i++) {
    const res = projectPointToSegment(point, polyline[i], polyline[i + 1]);
    if (res.distance < minDistance) {
      minDistance = res.distance;
      bestIdx = i;
      bestSnapped = res.point;
    }
  }

  const completedPath = polyline.slice(0, bestIdx + 1);
  completedPath.push(bestSnapped);

  const remainingPath = [bestSnapped, ...polyline.slice(bestIdx + 1)];

  return {
    completedPath,
    remainingPath,
    snappedPoint: bestSnapped,
    distanceToRoute: minDistance
  };
}
