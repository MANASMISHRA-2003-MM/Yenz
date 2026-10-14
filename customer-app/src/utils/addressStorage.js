// Universal resilient address storage with memory fallback for Tracking Prevention & Incognito modes
const memoryStorage = (typeof window !== 'undefined' && window.__krawing_memory_storage) || {};
if (typeof window !== 'undefined') {
  window.__krawing_memory_storage = memoryStorage;
}

export const safeStorage = {
  getItem: (key) => {
    if (memoryStorage[key] !== undefined && memoryStorage[key] !== null) {
      return memoryStorage[key];
    }
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null && val !== undefined) {
        memoryStorage[key] = val;
        return val;
      }
    } catch (e) {}
    try {
      const sVal = window.sessionStorage.getItem(key);
      if (sVal !== null && sVal !== undefined) {
        memoryStorage[key] = sVal;
        return sVal;
      }
    } catch (e) {}
    return null;
  },
  setItem: (key, val) => {
    const s = String(val);
    memoryStorage[key] = s;
    try { window.localStorage.setItem(key, s); } catch (e) {}
    try { window.sessionStorage.setItem(key, s); } catch (e) {}
  },
  removeItem: (key) => {
    delete memoryStorage[key];
    try { window.localStorage.removeItem(key); } catch (e) {}
    try { window.sessionStorage.removeItem(key); } catch (e) {}
  }
};

export function deduplicateLiveAddresses(list) {
  if (!Array.isArray(list)) return [];
  const nonLive = list.filter(a => !(a.id?.startsWith('addr-live') || a.title?.includes('Live Location')));
  const liveItems = list.filter(a => a.id?.startsWith('addr-live') || a.title?.includes('Live Location'));
  if (liveItems.length === 0) return nonLive;
  
  const singleLive = {
    ...liveItems[0],
    id: 'addr-live-current',
    title: 'Live Location 📍'
  };
  return [singleLive, ...nonLive];
}

export function getSavedAddresses() {
  try {
    const raw = safeStorage.getItem('krawing_user_saved_addresses');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(a => !JSON.stringify(a).toLowerCase().includes('ansal'));
        return deduplicateLiveAddresses(filtered);
      }
    }
  } catch (e) {
    console.error('Error reading saved addresses:', e);
  }
  return [];
}

export function saveAddresses(addresses) {
  try {
    const cleaned = deduplicateLiveAddresses((addresses || []).filter(a => !JSON.stringify(a).toLowerCase().includes('ansal')));
    safeStorage.setItem('krawing_user_saved_addresses', JSON.stringify(cleaned));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('krawing_addresses_updated', { detail: { addresses: cleaned } }));
    }
  } catch (e) {
    console.error('Error saving addresses:', e);
  }
}

export function getActiveAddress() {
  try {
    const savedRaw = safeStorage.getItem('krawing_user_address') || safeStorage.getItem('krawing_selected_address');
    if (savedRaw) {
      if (savedRaw.toLowerCase().includes('ansal')) {
        safeStorage.removeItem('krawing_user_address');
        safeStorage.removeItem('krawing_selected_address');
      } else {
        const parsed = JSON.parse(savedRaw);
        if (parsed && (parsed.street || parsed.title || parsed.city)) {
          return parsed;
        }
      }
    }
    const savedList = getSavedAddresses();
    if (savedList && savedList.length > 0) {
      return savedList.find(a => a.isDefault) || savedList[0];
    }
  } catch (e) {}
  return null;
}

export function setActiveAddress(addr) {
  if (!addr) return;
  try {
    safeStorage.setItem('krawing_user_address', JSON.stringify(addr));
    safeStorage.setItem('krawing_selected_address', JSON.stringify(addr));
    const lat = addr.lat || addr.latitude;
    const lng = addr.lng || addr.longitude;
    if (lat && lng) {
      safeStorage.setItem('krawing_user_coords', JSON.stringify({ lat: Number(lat), lng: Number(lng) }));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('krawing_location_changed', { detail: { address: addr } }));
    }
  } catch (e) {}
}

export function getUserCoords() {
  try {
    const raw = safeStorage.getItem('krawing_user_coords');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.lat && parsed.lng && !isNaN(parsed.lat) && !isNaN(parsed.lng)) {
        return { lat: Number(parsed.lat), lng: Number(parsed.lng) };
      }
    }
    const active = getActiveAddress();
    if (active && (active.lat || active.latitude) && (active.lng || active.longitude)) {
      const lat = active.lat || active.latitude;
      const lng = active.lng || active.longitude;
      if (!isNaN(lat) && !isNaN(lng)) return { lat: Number(lat), lng: Number(lng) };
    }
  } catch (e) {}
  return null;
}
