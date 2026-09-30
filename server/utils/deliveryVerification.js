// Rate Limiting and Geofencing Utilities for Secure Delivery Verification

// 1. In-Memory PIN Attempt Rate Limiter: 3 failed attempts max -> 2-minute lockout
const pinAttempts = new Map(); // orderId -> { attempts: number, lockedUntil: number | null }

const checkPinRateLimit = (orderId) => {
  const now = Date.now();
  const entry = pinAttempts.get(orderId);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil && entry.lockedUntil > now) {
    const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      allowed: false,
      locked: true,
      remainingSeconds,
      message: `PIN submission locked due to 3 consecutive failed attempts. Please wait ${remainingSeconds}s before trying again.`
    };
  }

  // Lockout expired, reset attempts
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    pinAttempts.delete(orderId);
  }

  return { allowed: true };
};

const recordFailedPinAttempt = (orderId) => {
  const now = Date.now();
  let entry = pinAttempts.get(orderId);
  if (!entry || (entry.lockedUntil && entry.lockedUntil <= now)) {
    entry = { attempts: 0, lockedUntil: null };
  }

  entry.attempts += 1;
  if (entry.attempts >= 3) {
    entry.lockedUntil = now + 2 * 60 * 1000; // 2-minute lockout
    pinAttempts.set(orderId, entry);
    return {
      locked: true,
      remainingSeconds: 120,
      attemptsRemaining: 0,
      message: 'PIN submission locked for 2 minutes due to 3 consecutive failed attempts. Please verify the PIN with the customer.'
    };
  }

  pinAttempts.set(orderId, entry);
  const attemptsRemaining = 3 - entry.attempts;
  return {
    locked: false,
    attemptsRemaining,
    message: `Invalid 4-digit Delivery PIN. ${attemptsRemaining} attempt(s) remaining before a 2-minute lockout.`
  };
};

const clearPinAttempts = (orderId) => {
  pinAttempts.delete(orderId);
};

// 2. Haversine Distance in Meters
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 3. Geofence Validator: Rider must be within 350m of dropoff
const validateDropoffGeofence = (riderLat, riderLng, dropLat, dropLng, maxDistanceMeters = 350) => {
  if (riderLat === undefined || riderLat === null || riderLng === undefined || riderLng === null) {
    return { valid: false, message: 'Rider GPS location missing. Please ensure GPS is enabled.' };
  }
  if (dropLat === undefined || dropLat === null || dropLng === undefined || dropLng === null) {
    return { valid: false, message: 'Customer dropoff coordinates missing. Contact support.' };
  }

  const rLat = Number(riderLat);
  const rLng = Number(riderLng);
  const dLat = Number(dropLat);
  const dLng = Number(dropLng);

  if (isNaN(rLat) || isNaN(rLng) || isNaN(dLat) || isNaN(dLng) || (rLat === 0 && rLng === 0)) {
    return { valid: false, message: 'Invalid GPS coordinates detected.' };
  }

  const distanceMeters = calculateDistanceMeters(rLat, rLng, dLat, dLng);

  if (distanceMeters > maxDistanceMeters) {
    return {
      valid: false,
      distanceMeters: Math.round(distanceMeters),
      maxDistanceMeters,
      message: `You are too far from the customer delivery address (${Math.round(distanceMeters)}m away). You must be within ${maxDistanceMeters}m to verify PIN and complete delivery.`
    };
  }

  return { valid: true, distanceMeters: Math.round(distanceMeters) };
};

module.exports = {
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearPinAttempts,
  calculateDistanceMeters,
  validateDropoffGeofence
};
