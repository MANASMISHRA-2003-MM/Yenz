/**
 * Mappls (MapmyIndia) Routing Provider
 * India-focused routing provider with two-wheeler (biking) profile and Snap-to-Road API.
 */

class MapplsProvider {
  constructor() {
    this.name = 'mappls';
    this.apiKey = process.env.MAPPLS_API_KEY || null;
    this.clientId = process.env.MAPPLS_CLIENT_ID || null;
    this.clientSecret = process.env.MAPPLS_CLIENT_SECRET || null;
    this.token = null;
    this.tokenExpiresAt = 0;
  }

  isConfigured() {
    return Boolean(this.apiKey || (this.clientId && this.clientSecret));
  }

  /**
   * Acquire OAuth token if using client ID & secret
   */
  async getAuthToken() {
    if (this.apiKey) return this.apiKey;
    if (this.token && Date.now() < this.tokenExpiresAt - 60000) {
      return this.token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Mappls API key or Client credentials missing');
    }

    try {
      const tokenUrl = 'https://outpost.mappls.com/api/security/oauth/token';
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);

      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      if (!res.ok) throw new Error(`Mappls auth failed: status ${res.status}`);
      const data = await res.json();
      this.token = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      return this.token;
    } catch (err) {
      throw new Error(`Mappls authentication error: ${err.message}`);
    }
  }

  /**
   * Calculate route using Mappls advanced routing API (two-wheeler / biking profile)
   * @param {Object} params - { origin: [lat, lng], destination: [lat, lng], profile: 'bike'|'driving' }
   */
  async calculateRoute({ origin, destination, profile = 'bike' }) {
    if (!this.isConfigured()) {
      throw new Error('Mappls credentials not configured');
    }

    const [originLat, originLng] = origin;
    const [destLat, destLng] = destination;
    const token = await this.getAuthToken();

    // Mappls profile: biking for two-wheelers, driving for cars
    const mapplsProfile = profile === 'bike' ? 'biking' : 'driving';
    const coordsStr = `${originLng},${originLat};${destLng},${destLat}`;

    // Standard Mappls Route Adv URL
    const url = `https://apis.mappls.com/advancedmaps/v1/${token}/route_adv/${mapplsProfile}/${coordsStr}?overview=full&geometries=geojson&steps=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Mappls responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.routes || data.routes.length === 0) {
        throw new Error(`Mappls route response invalid: ${data.msg || 'No routes'}`);
      }

      const primary = data.routes[0];
      const rawCoords = primary.geometry?.coordinates || [];
      const geometry = rawCoords.map(([lng, lat]) => [Number(lat), Number(lng)]);
      const rawSteps = primary.legs?.[0]?.steps || [];

      const steps = rawSteps.map((step, idx) => {
        const nextStep = rawSteps[idx + 1];
        const maneuver = step.maneuver || {};
        return {
          instruction: step.instructions || `${maneuver.instruction || 'Continue'} on ${step.name || 'road'}`,
          icon: (maneuver.modifier || 'straight').toLowerCase().includes('left') ? 'turn-left' :
                (maneuver.modifier || '').toLowerCase().includes('right') ? 'turn-right' : 'straight',
          road: step.name || 'Road',
          nextRoad: nextStep?.name || null,
          type: maneuver.type || 'turn',
          modifier: maneuver.modifier || 'straight',
          distanceMeters: Math.round(step.distance || 0),
          durationSeconds: Math.round(step.duration || 0),
          location: maneuver.location ? [maneuver.location[1], maneuver.location[0]] : null
        };
      });

      const distanceMeters = Math.round(primary.distance || 0);
      const durationSeconds = Math.round(primary.duration || 0);

      return {
        success: true,
        provider: 'mappls',
        profile: mapplsProfile,
        distanceMeters,
        distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
        durationSeconds,
        durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        geometry,
        steps
      };
    } catch (err) {
      clearTimeout(timeout);
      throw new Error(`Mappls Provider error: ${err.message}`);
    }
  }

  /**
   * Mappls Snap-to-Road API
   * @param {Object} params - { lat, lng }
   */
  async snapToRoad({ lat, lng }) {
    if (!this.isConfigured()) return null;

    try {
      const token = await this.getAuthToken();
      const url = `https://apis.mappls.com/advancedmaps/v1/${token}/snap_to_road?pts=${lat},${lng}`;

      const res = await fetch(url);
      if (!res.ok) return null;

      const data = await res.json();
      if (data.snappedPoints && data.snappedPoints.length > 0) {
        const pt = data.snappedPoints[0].location;
        return {
          latitude: pt.latitude,
          longitude: pt.longitude,
          distanceToRoadMeters: 0,
          roadName: null
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}

module.exports = MapplsProvider;
