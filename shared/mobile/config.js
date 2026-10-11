/**
 * Mobile Configuration for Backend Connectivity
 * For physical devices or simulators, update BACKEND_HOST with your machine's LAN IP (e.g. '192.168.1.100')
 */
export const CONFIG = {
  // Default development URL - can be set via process.env or fallback to localhost:5000
  BACKEND_HOST: '10.0.2.2', // 10.0.2.2 is Android emulator's alias to localhost; use LAN IP for physical device
  PORT: 5000,
  get API_BASE_URL() {
    return `http://${this.BACKEND_HOST}:${this.PORT}/api`;
  },
  get SOCKET_URL() {
    return `http://${this.BACKEND_HOST}:${this.PORT}`;
  }
};
