import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Plus, Trash2, Home, Briefcase, Navigation, X } from 'lucide-react';
import { reverseGeocode } from '../utils/reverseGeocode';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const DEFAULT_ADDRESSES = [];

// Pure pinpoint marker for accurate location pointing, zero text/words at pointer
const purePinIcon = L.divIcon({
  className: 'custom-pure-pin',
  html: `
    <div style="transform: translate(-50%, -100%); display:flex; align-items:center; justify-content:center; pointer-events:auto; cursor:grab;">
      <svg width="34" height="46" viewBox="0 0 34 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.38));">
        <path d="M17 0C7.611 0 0 7.611 0 17C0 29.5 17 46 17 46C17 46 34 29.5 34 17C34 7.611 26.389 0 17 0Z" fill="#E11D48"/>
        <circle cx="17" cy="16" r="6" fill="#FFFFFF"/>
        <circle cx="17" cy="16" r="2.8" fill="#E11D48"/>
      </svg>
    </div>
  `,
  iconSize: [34, 46],
  iconAnchor: [17, 46]
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 150);
    const t2 = setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      try {
        map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
      } catch (e) {}
    }
  }, [lat, lng, map]);
  return null;
}

function DraggablePinMarker({ lat, lng, onPositionChange }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          onPositionChange(Number(newPos.lat.toFixed(6)), Number(newPos.lng.toFixed(6)));
        }
      },
    }),
    [onPositionChange]
  );

  useMapEvents({
    click(e) {
      onPositionChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    }
  });

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[lat, lng]}
      ref={markerRef}
      icon={purePinIcon}
    />
  );
}

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
    const data = localStorage.getItem('krawing_user_saved_addresses');
    if (data) {
      const parsed = JSON.parse(data);
      return deduplicateLiveAddresses(parsed);
    }
  } catch (e) {
    console.error('Error reading saved addresses:', e);
  }
  return DEFAULT_ADDRESSES;
}

export function saveAddresses(addresses) {
  try {
    const cleaned = deduplicateLiveAddresses(addresses);
    localStorage.setItem('krawing_user_saved_addresses', JSON.stringify(cleaned));
    window.dispatchEvent(new Event('krawing_addresses_updated'));
  } catch (e) {
    console.error('Error saving addresses:', e);
  }
}

export default function AddressModal({ isOpen, onClose, onSelectAddress }) {
  const [addresses, setAddresses] = useState(getSavedAddresses());
  const [showAddForm, setShowAddForm] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolvingPin, setResolvingPin] = useState(false);

  // Initial coordinates from user storage or default
  const getInitialCoords = () => {
    try {
      const stored = localStorage.getItem('krawing_user_coords');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.lat && parsed.lng) return { lat: Number(parsed.lat), lng: Number(parsed.lng) };
      }
    } catch (e) {}
    return { lat: 28.5355, lng: 77.3910 };
  };

  const initialCoords = getInitialCoords();

  const [newAddr, setNewAddr] = useState({
    title: 'Home',
    street: '',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    phone: '+91 98765 43210',
    latitude: initialCoords.lat,
    longitude: initialCoords.lng
  });

  useEffect(() => {
    const handleUpdate = () => setAddresses(getSavedAddresses());
    window.addEventListener('krawing_addresses_updated', handleUpdate);
    return () => window.removeEventListener('krawing_addresses_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleSetDefault = (id) => {
    const updated = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(updated);
    saveAddresses(updated);
  };

  const handleDelete = (id) => {
    const updated = addresses.filter(a => a.id !== id);
    setAddresses(updated);
    saveAddresses(updated);
  };

  // Called when pin moves on the map
  const handlePinMove = async (lat, lng) => {
    setNewAddr(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));

    setResolvingPin(true);
    try {
      const geoResult = await reverseGeocode(lat, lng);
      setNewAddr(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        street: geoResult.street || prev.street,
        city: geoResult.city || prev.city,
        state: geoResult.state || prev.state,
        pincode: geoResult.pincode || prev.pincode
      }));
    } catch (e) {
      console.warn('Reverse geocode from map pin warning:', e);
    } finally {
      setResolvingPin(false);
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newAddr.street || !newAddr.city || !newAddr.pincode) return;

    const created = {
      id: `addr-${Date.now()}`,
      ...newAddr,
      lat: newAddr.latitude,
      lng: newAddr.longitude,
      isDefault: addresses.length === 0
    };
    const updated = [...addresses, created];
    setAddresses(updated);
    saveAddresses(updated);
    setShowAddForm(false);
    setNewAddr({
      title: 'Home',
      street: '',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      phone: '+91 98765 43210',
      latitude: initialCoords.lat,
      longitude: initialCoords.lng
    });

    if (onSelectAddress) {
      onSelectAddress(created);
    }
  };

  const handleFetchDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const geoResult = await reverseGeocode(latitude, longitude);

          const liveAddr = {
            id: 'addr-live-current',
            title: 'Live Location 📍',
            street: geoResult.street,
            city: geoResult.city,
            state: geoResult.state,
            pincode: geoResult.pincode,
            latitude,
            longitude,
            lat: latitude,
            lng: longitude,
            phone: '+91 98765 43210',
            isDefault: true
          };

          // If add form is currently open, also populate it directly
          if (showAddForm) {
            setNewAddr(prev => ({
              ...prev,
              street: geoResult.street || prev.street,
              city: geoResult.city || prev.city,
              state: geoResult.state || prev.state,
              pincode: geoResult.pincode || prev.pincode,
              latitude,
              longitude
            }));
          }

          // Keep non-live addresses, set isDefault false on them
          const nonLive = addresses.filter(a => !(a.id?.startsWith('addr-live') || a.title?.includes('Live Location')));
          const updated = [liveAddr, ...nonLive.map(a => ({ ...a, isDefault: false }))];
          setAddresses(updated);
          saveAddresses(updated);

          try {
            localStorage.setItem('krawing_user_coords', JSON.stringify({ lat: latitude, lng: longitude }));
            localStorage.setItem('krawing_user_address', JSON.stringify(liveAddr));
            localStorage.setItem('krawing_selected_address', JSON.stringify(liveAddr));
          } catch (e) {}

          if (!showAddForm && onSelectAddress) {
            onSelectAddress(liveAddr);
            onClose();
          }
        } catch (err) {
          console.error('Error getting location address:', err);
          alert('Could not fetch address details for current coordinates.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        alert(`Location permission error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-gray-900/50 p-4 flex items-center justify-center backdrop-blur-xs" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-xl rounded-2xl border border-gray-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(229,27,75,.08)',color:'var(--fc-red)'}}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-gray-900 text-base">Select delivery location</h2>
              <p className="text-xs text-gray-500 mt-0.5">Pick location with pin, use live GPS, or select saved address.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ACTION BUTTONS */}
        <div className="p-4 border-b border-gray-200 grid grid-cols-2 gap-2">
          <button onClick={handleFetchDeviceLocation} disabled={locating} className="fc-btn" style={{color:'var(--fc-fresh)',background:'rgba(22,138,91,.06)',borderColor:'rgba(22,138,91,.25)'}}>
            <Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
            {locating ? 'Locating…' : 'Use live GPS'}
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)} className="fc-btn" style={{background:'#1f2937',borderColor:'#1f2937',color:'#fff'}}>
            <Plus className="w-4 h-4" />
            {showAddForm ? 'View saved addresses' : 'Add address with pin'}
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-4 overflow-y-auto space-y-4">
          
          {/* ADD ADDRESS FORM WITH MAP PIN SELECTOR (NO LAT/LNG WRITER BOXES) */}
          {showAddForm && (
            <form onSubmit={handleAddSubmit} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-gray-900">New address & pin location</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Accurate Delivery Pin</span>
              </div>

              {/* INTERACTIVE MAP PIN SELECTOR */}
              <div className="space-y-1">
                <div className="relative w-full h-52 rounded-xl overflow-hidden border border-gray-300 shadow-inner z-0">
                  <MapContainer
                    center={[newAddr.latitude || initialCoords.lat, newAddr.longitude || initialCoords.lng]}
                    zoom={15}
                    scrollWheelZoom={false}
                    className="w-full h-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapResizer />
                    <MapRecenter lat={newAddr.latitude} lng={newAddr.longitude} />
                    <DraggablePinMarker
                      lat={newAddr.latitude}
                      lng={newAddr.longitude}
                      onPositionChange={handlePinMove}
                    />
                  </MapContainer>

                  {resolvingPin && (
                    <div className="absolute top-2 right-2 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-700 shadow-sm flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>Updating address…</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 font-medium text-center pt-0.5">
                  Click anywhere on the map or drag the pin to set your exact doorstep.
                </p>
              </div>

              {/* TITLE SELECTOR */}
              <div className="flex gap-2">
                {['Home', 'Work', 'Other'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewAddr({ ...newAddr, title: type })}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${newAddr.title === type ? 'bg-gray-900 text-white border-gray-900 shadow-xs' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* STREET / APARTMENT / AREA */}
              <label className="block">
                <span className="fc-label">Street / apartment / area *</span>
                <input
                  className="fc-input"
                  required
                  value={newAddr.street}
                  onChange={e => setNewAddr({ ...newAddr, street: e.target.value })}
                  placeholder="Flat 101, Sunshine Heights, Sector 62"
                />
              </label>

              {/* CITY & PINCODE */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="fc-label">City *</span>
                  <input
                    className="fc-input"
                    required
                    value={newAddr.city}
                    onChange={e => setNewAddr({ ...newAddr, city: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="fc-label">Pincode *</span>
                  <input
                    className="fc-input"
                    required
                    value={newAddr.pincode}
                    onChange={e => setNewAddr({ ...newAddr, pincode: e.target.value })}
                  />
                </label>
              </div>

              {/* PHONE */}
              <label className="block">
                <span className="fc-label">Phone *</span>
                <input
                  className="fc-input"
                  required
                  value={newAddr.phone}
                  onChange={e => setNewAddr({ ...newAddr, phone: e.target.value })}
                />
              </label>

              {/* SUBMIT BUTTONS */}
              <div className="flex gap-2 pt-1">
                <button type="submit" className="fc-btn text-white flex-1" style={{background:'var(--fc-fresh)',borderColor:'var(--fc-fresh)'}}>
                  Save address
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="fc-btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* SAVED ADDRESSES LIST */}
          {addresses.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              <MapPin className="w-8 h-8 mx-auto text-gray-300" />
              <p className="mt-2.5 font-medium">No saved addresses yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map(item => (
                <div key={item.id} className={`rounded-xl border p-4 transition ${item.isDefault ? 'border-gray-900 bg-gray-50/60 shadow-xs' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        {item.title.toLowerCase().includes('home') ? <Home className="w-4 h-4 text-gray-700" /> : item.title.toLowerCase().includes('work') ? <Briefcase className="w-4 h-4 text-gray-700" /> : <MapPin className="w-4 h-4 text-rose-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{item.title}</span>
                          {item.isDefault && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{background:'var(--fc-red)'}}>Default</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 font-medium leading-relaxed">{item.street}, {item.city} - {item.pincode}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{item.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!item.isDefault && (
                        <button onClick={() => handleSetDefault(item.id)} className="text-[11px] font-bold text-gray-500 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition">
                          Set default
                        </button>
                      )}
                      {onSelectAddress && (
                        <button onClick={() => { onSelectAddress(item); onClose(); }} className="fc-btn !px-3 !py-1.5 text-xs text-white" style={{background:'var(--fc-green)',borderColor:'var(--fc-green)'}}>
                          Select
                        </button>
                      )}
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100 transition" title="Delete address">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
