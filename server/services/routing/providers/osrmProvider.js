/**
 * OSRM Routing Provider (Open Source Routing Machine)
 * Supports two-wheeler (bicycle) and driving road routing profiles.
 * Open-source fallback with road geometry and maneuver steps.
 */

// Helper to convert OSRM coordinates [lng, lat] to [lat, lng]
function convertCoordinates(coords) {
  if (!Array.isArray(coords)) return [];
  return coords.map(([lng, lat]) => [Number(lat), Number(lng)]);
}

// Convert OSRM maneuver to user-friendly direction instruction
function formatManeuver(step, nextStep) {
  const maneuver = step.maneuver || {};
  const type = maneuver.type || 'turn';
  const modifier = maneuver.modifier || 'straight';
  const street = step.name || 'Road';
  const nextStreet = nextStep?.name ? ` onto ${nextStep.name}` : '';

  let icon = 'straight';
  let instruction = `Continue on ${street}`;

  switch (type) {
    case 'depart':
      instruction = `Head ${modifier || 'forward'} on ${street}`;
      icon = 'depart';
      break;
    case 'turn':
      if (modifier.includes('left')) {
        instruction = `Turn left${nextStreet}`;
        icon = 'turn-left';
      } else if (modifier.includes('right')) {
        instruction = `Turn right${nextStreet}`;
        icon = 'turn-right';
      } else {
        instruction = `Turn onto ${street}`;
        icon = 'turn';
      }
      break;
    case 'new name':
      instruction = `Continue onto ${street}`;
      icon = 'straight';
      break;
    case 'fork':
      instruction = `Keep ${modifier} at the fork${nextStreet}`;
      icon = modifier.includes('left') ? 'fork-left' : 'fork-right';
      break;
    case 'roundabout':
    case 'rotary':
      instruction = `Enter roundabout and take exit${nextStreet}`;
      icon = 'roundabout';
      break;
    case 'arrive':
      instruction = `Arrive at destination`;
      icon = 'arrive';
      break;
    case 'continue':
    default:
      if (modifier.includes('left')) {
        instruction = `Bear left onto ${street}`;
        icon = 'turn-left';
      } else if (modifier.includes('right')) {
        instruction = `Bear right onto ${street}`;
        icon = 'turn-right';
      } else {
        instruction = `Continue straight on ${street}`;
        icon = 'straight';
      }
      break;
  }

  return {
    instruction,
    icon,
    road: street,
    nextRoad: nextStep?.name || null,
    type,
    modifier,
    distanceMeters: Math.round(step.distance || 0),
    durationSeconds: Math.round(step.duration || 0),
    location: maneuver.location ? [maneuver.location[1], maneuver.location[0]] : null
  };
}

class OSRMProvider {
  constructor() {
    this.name = 'osrm';
    this.baseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
  }

  /**
   * Calculate route between two coordinates
   * @param {Object} params - { origin: [lat, lng], destination: [lat, lng], profile: 'bike'|'driving' }
   */
  async calculateRoute({ origin, destination, profile = 'bike' }) {
    const [originLat, originLng] = origin;
    const [destLat, destLng] = destination;

    // Use bicycle profile for two-wheelers, fallback to driving if bicycle returns error
    const osrmProfile = profile === 'bike' ? 'bicycle' : 'driving';
    const coordsStr = `${originLng},${originLat};${destLng},${destLat}`;
    const url = `${this.baseUrl}/route/v1/${osrmProfile}/${coordsStr}?overview=full&geometries=geojson&steps=true&annotations=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OSRM responded with status ${response.status}`);
      }

      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        // If bicycle profile has no route, retry with driving
        if (osrmProfile === 'bicycle') {
          return this.calculateRoute({ origin, destination, profile: 'driving' });
        }
        throw new Error(`OSRM route calculation failed: ${data.code || 'No route'}`);
      }

      const primaryRoute = data.routes[0];
      const geometry = convertCoordinates(primaryRoute.geometry?.coordinates || []);
      const legs = primaryRoute.legs || [];
      const rawSteps = legs[0]?.steps || [];

      // Format steps into human-readable navigation instructions
      const steps = rawSteps.map((step, idx) => {
        const nextStep = rawSteps[idx + 1];
        return formatManeuver(step, nextStep);
      });

      const distanceMeters = Math.round(primaryRoute.distance || 0);
      const durationSeconds = Math.round(primaryRoute.duration || 0);

      return {
        success: true,
        provider: 'osrm',
        profile: osrmProfile,
        distanceMeters,
        distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
        durationSeconds,
        durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        geometry,
        steps,
        raw: {
          weight: primaryRoute.weight,
          legsCount: legs.length
        }
      };
    } catch (err) {
      clearTimeout(timeout);
      // If bicycle failed, try driving
      if (profile === 'bike') {
        try {
          return await this.calculateRoute({ origin, destination, profile: 'driving' });
        } catch (retryErr) {
          throw new Error(`OSRM Provider error: ${err.message}`);
        }
      }
      throw new Error(`OSRM Provider error: ${err.message}`);
    }
  }

  /**
   * Snap raw GPS coordinate to nearest road
   * @param {Object} params - { lat, lng }
   */
  async snapToRoad({ lat, lng }) {
    const url = `${this.baseUrl}/nearest/v1/driving/${lng},${lat}?number=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) return null;
      const data = await response.json();

      if (data.code === 'Ok' && data.waypoints && data.waypoints.length > 0) {
        const wp = data.waypoints[0];
        const [snapLng, snapLat] = wp.location;
        return {
          latitude: Number(snapLat),
          longitude: Number(snapLng),
          distanceToRoadMeters: Math.round(wp.distance || 0),
          roadName: wp.name || null
        };
      }
      return null;
    } catch (e) {
      clearTimeout(timeout);
      return null;
    }
  }
}

module.exports = OSRMProvider;
