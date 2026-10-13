/**
 * Mobile Configuration for Backend Connectivity
 * Connected to machine's active Wi-Fi LAN IP (192.168.29.220) so real devices on the same Wi-Fi connect seamlessly.
 */
let customHost = null;

export const setBackendHost = (newHost) => {
  customHost = newHost;
};

export const CONFIG = {
  // User's active Wi-Fi LAN IP (allows physical phones on same Wi-Fi to connect)
  DEFAULT_LAN_HOST: '192.168.29.220',
  // Android Emulator fallback host
  EMULATOR_HOST: '10.0.2.2',
  PORT: 5000,
  get BACKEND_HOST() {
    return customHost || this.DEFAULT_LAN_HOST;
  },
  get API_BASE_URL() {
    return `http://${this.BACKEND_HOST}:${this.PORT}/api`;
  },
  get SOCKET_URL() {
    return `http://${this.BACKEND_HOST}:${this.PORT}`;
  }
};
