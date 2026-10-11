/**
 * RoutingService
 * Provider-agnostic routing engine for Yenz hyperlocal delivery platform.
 * Supports Mappls (India-optimized), OSRM (Open Source), and Fallback.
 * Prioritizes Two-Wheeler (Bike / Scooter) delivery profiles.
 */

const OSRMProvider = require('./providers/osrmProvider');
const MapplsProvider = require('./providers/mapplsProvider');
const FallbackProvider = require('./providers/fallbackProvider');

// Haversine distance in meters
function haversineMeters(lat1, lon1, lat2, lon2) {
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

// Distance from point P to line segment AB in meters
function distanceToSegmentMeters(pLat, pLng, aLat, aLng, bLat, bLng) {
  const dAB = haversineMeters(aLat, aLng, bLat, bLng);
  if (dAB === 0) return haversineMeters(pLat, pLng, aLat, aLng);

  // Projection ratio t
  const toRad = (x) => (x * Math.PI) / 180;
  const cosLat = Math.cos(toRad((aLat + bLat) / 2));
  const dx = (bLng - aLng) * cosLat;
  const dy = bLat - aLat;
  const px = (pLng - aLng) * cosLat;
  const py = pLat - aLat;

  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));
  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);

  return {
    distance: haversineMeters(pLat, pLng, projLat, projLng),
    snapped: [projLat, projLng],
    ratio: t
  };
}

class RoutingService {
  constructor() {
    this.mappls = new MapplsProvider();
    this.osrm = new OSRMProvider();
    this.fallback = new FallbackProvider();

    // In-memory cache for active routes per order:
    // orderId -> { route, stage, updatedAt, lastRerouteAt, version, destination }
    this.activeRoutes = new Map();

    // Reroute cooldown: minimum 15 seconds between recalculations
    this.REROUTE_COOLDOWN_MS = 15000;
    // Off-route deviation threshold: 75 meters
    this.OFF_ROUTE_THRESHOLD_METERS = 75;
  }

  /**
   * Determine primary provider (Mappls if configured, else OSRM)
   */
  getPrimaryProvider() {
    if (this.mappls.isConfigured()) {
      return this.mappls;
    }
    return this.osrm;
  }

  /**
   * Two-wheeler bike routing calculation (PRIORITIZED for delivery)
   */
  async calculateBikeRoute({ origin, destination, stage = 'TO_CUSTOMER', orderId = null }) {
    return this.calculateRoute({
      origin,
      destination,
      profile: 'bike',
      stage,
      orderId
    });
  }

  /**
   * Main route calculation with automatic fallback chain:
   * Mappls (if configured) -> OSRM -> Fallback
   */
  async calculateRoute({ origin, destination, profile = 'bike', stage = 'TO_CUSTOMER', orderId = null }) {
    const primary = this.getPrimaryProvider();
    let result = null;

    try {
      result = await primary.calculateRoute({ origin, destination, profile });
    } catch (primaryErr) {
      console.warn(`[RoutingService] ${primary.name} failed (${primaryErr.message}). Trying secondary...`);

      if (primary.name !== 'osrm') {
        try {
          result = await this.osrm.calculateRoute({ origin, destination, profile });
        } catch (osrmErr) {
          console.warn(`[RoutingService] OSRM failed (${osrmErr.message}). Using fallback.`);
          result = await this.fallback.calculateRoute({ origin, destination, profile });
        }
      } else {
        result = await this.fallback.calculateRoute({ origin, destination, profile });
      }
    }

    // Cache active route if orderId provided
    if (orderId && result && result.geometry) {
      const existing = this.activeRoutes.get(String(orderId)) || {};
      this.activeRoutes.set(String(orderId), {
        ...result,
        stage,
        orderId: String(orderId),
        origin,
        destination,
        version: (existing.version || 0) + 1,
        updatedAt: Date.now(),
        lastRerouteAt: existing.lastRerouteAt || Date.now()
      });
    }

    return result;
  }

  /**
   * Get cached active route for an order
   */
  getActiveRoute(orderId) {
    if (!orderId) return null;
    return this.activeRoutes.get(String(orderId)) || null;
  }

  /**
   * Clear cached active route
   */
  clearActiveRoute(orderId) {
    if (orderId) this.activeRoutes.delete(String(orderId));
  }

  /**
   * Snap GPS point to road network
   */
  async snapToRoad({ lat, lng }) {
    const primary = this.getPrimaryProvider();
    try {
      const snapped = await primary.snapToRoad({ lat, lng });
      if (snapped) return snapped;
    } catch (e) {
      // Ignore
    }

    // Try OSRM snap if Mappls failed
    if (primary.name !== 'osrm') {
      try {
        const snapped = await this.osrm.snapToRoad({ lat, lng });
        if (snapped) return snapped;
      } catch (e) {
        // Ignore
      }
    }

    return {
      latitude: Number(lat),
      longitude: Number(lng),
      distanceToRoadMeters: 0,
      roadName: null
    };
  }

  /**
   * Calculate ETA given distance and optional duration
   */
  calculateETA(distanceMeters, durationSeconds) {
    if (durationSeconds && durationSeconds > 0) {
      const minutes = Math.max(1, Math.round(durationSeconds / 60));
      return {
        etaMinutes: minutes,
        etaText: `${minutes} min${minutes > 1 ? 's' : ''}`
      };
    }

    // Assume average two-wheeler delivery speed of 24 km/h in Indian traffic
    const km = distanceMeters / 1000;
    const minutes = Math.max(2, Math.round((km / 24) * 60));
    return {
      etaMinutes: minutes,
      etaText: `${minutes} min${minutes > 1 ? 's' : ''}`
    };
  }

  /**
   * Check if rider deviated significantly from active route and requires rerouting
   * Returns: { shouldReroute: boolean, minDistanceToRouteMeters: number, snappedPosition: [lat, lng] }
   */
  checkDeviationAndProgress({ currentLat, currentLng, orderId }) {
    const activeRoute = this.getActiveRoute(orderId);
    if (!activeRoute || !activeRoute.geometry || activeRoute.geometry.length < 2) {
      return { shouldReroute: false, minDistanceToRouteMeters: 0, snappedPosition: [currentLat, currentLng], currentStep: null };
    }

    const geometry = activeRoute.geometry;
    let minDistance = Infinity;
    let closestSnapped = [currentLat, currentLng];
    let closestSegmentIdx = 0;

    for (let i = 0; i < geometry.length - 1; i++) {
      const a = geometry[i];
      const b = geometry[i + 1];
      const res = distanceToSegmentMeters(currentLat, currentLng, a[0], a[1], b[0], b[1]);

      if (res.distance < minDistance) {
        minDistance = res.distance;
        closestSnapped = res.snapped;
        closestSegmentIdx = i;
      }
    }

    const now = Date.now();
    const timeSinceLastReroute = now - (activeRoute.lastRerouteAt || 0);
    const isOffRoute = minDistance > this.OFF_ROUTE_THRESHOLD_METERS;
    const canReroute = isOffRoute && timeSinceLastReroute > this.REROUTE_COOLDOWN_MS;

    // Determine current navigation step
    const steps = activeRoute.steps || [];
    let currentStep = steps[0] || null;
    let nextStep = steps[1] || null;
    let distanceToNextManeuver = 0;

    if (steps.length > 0) {
      // Find step closest ahead of current rider position
      let stepFound = false;
      for (let s = 0; s < steps.length; s++) {
        const stepLoc = steps[s].location;
        if (stepLoc) {
          const distToStep = haversineMeters(currentLat, currentLng, stepLoc[0], stepLoc[1]);
          if (distToStep > 30) {
            currentStep = steps[s];
            nextStep = steps[s + 1] || null;
            distanceToNextManeuver = distToStep;
            stepFound = true;
            break;
          }
        }
      }
      if (!stepFound && steps.length > 0) {
        currentStep = steps[steps.length - 1];
        distanceToNextManeuver = haversineMeters(currentLat, currentLng, currentStep.location?.[0] || currentLat, currentStep.location?.[1] || currentLng);
      }
    }

    return {
      shouldReroute: canReroute,
      isOffRoute,
      minDistanceToRouteMeters: Math.round(minDistance),
      snappedPosition: closestSnapped,
      closestSegmentIdx,
      currentStep,
      nextStep,
      distanceToNextManeuver: Math.round(distanceToNextManeuver)
    };
  }

  /**
   * Execute dynamic reroute for an order
   */
  async executeReroute({ currentLat, currentLng, orderId }) {
    const activeRoute = this.getActiveRoute(orderId);
    if (!activeRoute || !activeRoute.destination) return null;

    console.log(`🔄 [RoutingService] Dynamic reroute triggered for order ${orderId} from [${currentLat}, ${currentLng}]`);

    const newRoute = await this.calculateBikeRoute({
      origin: [currentLat, currentLng],
      destination: activeRoute.destination,
      stage: activeRoute.stage,
      orderId
    });

    if (newRoute && this.activeRoutes.has(String(orderId))) {
      const stored = this.activeRoutes.get(String(orderId));
      stored.lastRerouteAt = Date.now();
    }

    return newRoute;
  }
}

const routingServiceInstance = new RoutingService();
module.exports = routingServiceInstance;
