import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Plus, Trash2, Home, Briefcase, Navigation, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { reverseGeocode } from '../utils/reverseGeocode';
import { getSavedAddresses, saveAddresses, setActiveAddress, getUserCoords, deduplicateLiveAddresses } from '../utils/addressStorage';
export { getSavedAddresses, saveAddresses, setActiveAddress, getUserCoords, deduplicateLiveAddresses };
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Pure pinpoint marker for accurate location pointing
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

// Automatically fly to user's real live coordinates on map open if no coordinates exist yet
function AutoLocateMap({ onLocated, hasCoords }) {
  const map = useMap();
  useEffect(() => {
    if (!hasCoords) {
      map.locate({ setView: true, maxZoom: 16 })
        .on('locationfound', (e) => {
          onLocated(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
        })
        .on('locationerror', () => {
          fetch('https://api.bigdatacloud.net/data/reverse-geocode-client')
            .then(r => r.json())
            .then(d => {
              if (d.latitude && d.longitude) {
                const lat = Number(Number(d.latitude).toFixed(6));
                const lng = Number(Number(d.longitude).toFixed(6));
                map.setView([lat, lng], 15);
                onLocated(lat, lng);
              }
            })
            .catch(() => {});
        });
    }
  }, [map, hasCoords, onLocated]);
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

export default function AddressModal({ isOpen, onClose, onSelectAddress }) {
  const [addresses, setAddresses] = useState(() => getSavedAddresses());
  const [showAddForm, setShowAddForm] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolvingPin, setResolvingPin] = useState(false);

  // Initial coordinates from user storage or null (no fake Noida coordinates!)
  const initialCoords = getUserCoords();

  const [newAddr, setNewAddr] = useState({
    title: 'Home',
    street: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    latitude: initialCoords?.lat || null,
    longitude: initialCoords?.lng || null
  });

  useEffect(() => {
    const handleUpdate = () => setAddresses(getSavedAddresses());
    window.addEventListener('krawing_addresses_updated', handleUpdate);
    return () => window.removeEventListener('krawing_addresses_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleSetDefault = (id) => {
    const target = addresses.find(a => a.id === id);
    const updated = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(updated);
    saveAddresses(updated);

    if (target) {
      const selected = { ...target, isDefault: true };
      setActiveAddress(selected);
      try { toast.success(`"${target.title}" set as default location`); } catch (e) {}
    }
  };

  const handleSelectSavedAddress = (item) => {
    const selected = { ...item, isDefault: true };
    const updated = addresses.map(a => ({
      ...a,
      isDefault: a.id === item.id
    }));
    setAddresses(updated);
    saveAddresses(updated);
    setActiveAddress(selected);

    if (onSelectAddress) {
      onSelectAddress(selected);
    }
    try { toast.success(`Selected "${selected.title}"`); } catch (e) {}
    onClose();
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

  // 1-Click: Take location from Map Pin, validate coordinates exist, save to Saved Addresses, and update active location
  const handleConfirmMapPinLocation = async () => {
    if (!newAddr.latitude || !newAddr.longitude) {
      toast.error('Location coordinates not set! Please click "Use live GPS" or point on the map first.');
      return;
    }

    let street = newAddr.street;
    let city = newAddr.city;
    let state = newAddr.state;
    let pincode = newAddr.pincode;

    if (!street) {
      try {
        const geoResult = await reverseGeocode(newAddr.latitude, newAddr.longitude);
        street = geoResult.street;
        city = geoResult.city || city;
        state = geoResult.state || state;
        pincode = geoResult.pincode || pincode;
      } catch (e) {}
    }

    const mapAddr = {
      id: `addr-map-${Date.now()}`,
      title: newAddr.title || 'Pinned Location 📍',
      street: street || `Doorstep Location (${newAddr.latitude.toFixed(4)}, ${newAddr.longitude.toFixed(4)})`,
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      phone: newAddr.phone || '',
      latitude: newAddr.latitude,
      longitude: newAddr.longitude,
      lat: newAddr.latitude,
      lng: newAddr.longitude,
      isDefault: true
    };

    const updated = [mapAddr, ...addresses.map(a => ({ ...a, isDefault: false }))];
    setAddresses(updated);
    saveAddresses(updated);
    setActiveAddress(mapAddr);

    if (onSelectAddress) {
      onSelectAddress(mapAddr);
    }
    try { toast.success('Location confirmed from map & saved!'); } catch (e) {}
    onClose();
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newAddr.latitude || !newAddr.longitude) {
      toast.error('Location coordinates missing! Please use live GPS or pick your location on the map.');
      return;
    }
    if (!newAddr.street || !newAddr.city || !newAddr.pincode) {
      toast.error('Please enter complete delivery address details.');
      return;
    }

    const created = {
      id: `addr-${Date.now()}`,
      ...newAddr,
      lat: newAddr.latitude,
      lng: newAddr.longitude,
      isDefault: true
    };
    const updated = [created, ...addresses.map(a => ({ ...a, isDefault: false }))];
    setAddresses(updated);
    saveAddresses(updated);
    setActiveAddress(created);

    setShowAddForm(false);
    if (onSelectAddress) {
      onSelectAddress(created);
    }
    try { toast.success('Address saved and selected!'); } catch (e) {}
    onClose();
  };

  const acquirePosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation not supported'));
      }
      navigator.geolocation.getCurrentPosition(
        resolve,
        () => {
          // Low-accuracy fallback
          navigator.geolocation.getCurrentPosition(
            resolve,
            (err) => reject(err),
            { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 4500, maximumAge: 30000 }
      );
    });
  };

  const handleFetchDeviceLocation = async () => {
    setLocating(true);
    let latitude = null;
    let longitude = null;

    try {
      const position = await acquirePosition();
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    } catch (geoErr) {
      console.warn('Geolocation fallback to IP coordinates:', geoErr);
      try {
        const ipRes = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.latitude && ipData.longitude) {
            latitude = Number(ipData.latitude);
            longitude = Number(ipData.longitude);
          }
        }
      } catch (ipErr) {
        console.warn('IP fallback failed:', ipErr);
      }
    }

    if (!latitude || !longitude) {
      setLocating(false);
      try { toast.error('Could not detect location. Please click on the map to set your doorstep.'); } catch (e) {}
      return;
    }

    try {
      const geoResult = await reverseGeocode(latitude, longitude);

      const liveAddr = {
        id: 'addr-live-current',
        title: 'Live Location 📍',
        street: geoResult.street || `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        city: geoResult.city || '',
        state: geoResult.state || '',
        pincode: geoResult.pincode || '',
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        phone: newAddr.phone || '',
        isDefault: true
      };

      setNewAddr(prev => ({
        ...prev,
        street: geoResult.street || prev.street,
        city: geoResult.city || prev.city,
        state: geoResult.state || prev.state,
        pincode: geoResult.pincode || prev.pincode,
        latitude,
        longitude
      }));

      const nonLive = addresses.filter(a => !(a.id?.startsWith('addr-live') || a.title?.includes('Live Location')));
      const updated = [liveAddr, ...nonLive.map(a => ({ ...a, isDefault: false }))];
      setAddresses(updated);
      saveAddresses(updated);
      setActiveAddress(liveAddr);

      if (onSelectAddress) {
        onSelectAddress(liveAddr);
      }
      try { toast.success('Live GPS location detected and saved!'); } catch (e) {}
      onClose();
    } catch (err) {
      console.error('Error getting location address:', err);
      try { toast.error('Could not fetch address details for coordinates.'); } catch (e) {}
    } finally {
      setLocating(false);
    }
  };

  const mapCenterLat = newAddr.latitude || 20.5937;
  const mapCenterLng = newAddr.longitude || 78.9629;
  const mapInitialZoom = (newAddr.latitude && newAddr.longitude) ? 15 : 4;

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
              <p className="text-xs text-gray-500 mt-0.5">Use live GPS, pick doorstep on map, or select saved address.</p>
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
            {showAddForm ? 'View saved addresses' : 'Pick on map / Add pin'}
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-4 overflow-y-auto space-y-4">
          
          {/* ADD ADDRESS FORM WITH MAP PIN SELECTOR */}
          {showAddForm && (
            <form onSubmit={handleAddSubmit} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-gray-900">Map doorstep location</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Doorstep Pin</span>
              </div>

              {/* INTERACTIVE MAP PIN SELECTOR */}
              <div className="space-y-2">
                <div className="relative w-full h-56 rounded-xl overflow-hidden border border-gray-300 shadow-inner z-0">
                  <MapContainer
                    center={[mapCenterLat, mapCenterLng]}
                    zoom={mapInitialZoom}
                    scrollWheelZoom={false}
                    className="w-full h-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapResizer />
                    <MapRecenter lat={newAddr.latitude} lng={newAddr.longitude} />
                    <AutoLocateMap onLocated={handlePinMove} hasCoords={Boolean(newAddr.latitude && newAddr.longitude)} />
                    <DraggablePinMarker
                      lat={newAddr.latitude}
                      lng={newAddr.longitude}
                      onPositionChange={handlePinMove}
                    />
                  </MapContainer>

                  {resolvingPin && (
                    <div className="absolute top-2 right-2 z-[400] bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-700 shadow-sm flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>Updating address from map…</span>
                    </div>
                  )}

                  {!newAddr.latitude && (
                    <div className="absolute inset-x-3 bottom-3 z-[400] bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-rose-200 text-xs font-semibold text-rose-800 shadow-md flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Click anywhere on the map or use GPS to set your delivery doorstep.</span>
                    </div>
                  )}
                </div>

                {/* CURRENT PIN LOCATION & 1-CLICK USE BUTTON */}
                <div className="p-2.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between gap-2 shadow-xs">
                  <div className="min-w-0 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate">
                        {newAddr.street || (newAddr.latitude ? `GPS (${newAddr.latitude.toFixed(4)}, ${newAddr.longitude.toFixed(4)})` : 'No location selected yet')}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {[newAddr.city, newAddr.pincode].filter(Boolean).join(' - ') || (newAddr.latitude ? 'Location set on map' : 'Click map to place pin')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmMapPinLocation}
                    disabled={!newAddr.latitude || !newAddr.longitude}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-white font-extrabold text-xs shadow-xs transition hover:opacity-95 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'var(--fc-fresh)' }}
                  >
                    <span>Use this location</span>
                  </button>
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
                  placeholder="e.g. Flat 302, Building A, Main Road"
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
                    placeholder="City"
                  />
                </label>
                <label className="block">
                  <span className="fc-label">Pincode *</span>
                  <input
                    className="fc-input"
                    required
                    value={newAddr.pincode}
                    onChange={e => setNewAddr({ ...newAddr, pincode: e.target.value })}
                    placeholder="Pincode"
                  />
                </label>
              </div>

              {/* PHONE */}
              <label className="block">
                <span className="fc-label">Mobile Number *</span>
                <input
                  className="fc-input"
                  required
                  type="tel"
                  value={newAddr.phone}
                  onChange={e => setNewAddr({ ...newAddr, phone: e.target.value })}
                  placeholder="Enter mobile number for delivery"
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

          {/* SAVED ADDRESSES SECTION */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Saved Addresses</span>
              <span className="text-xs text-gray-400 font-medium">{addresses.length} saved</span>
            </div>

            {addresses.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                <MapPin className="w-8 h-8 mx-auto text-gray-300" />
                <p className="mt-2.5 font-medium">No saved addresses yet.</p>
                <p className="text-xs text-gray-400 mt-1">Please use live GPS or pick a location on the map above.</p>
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
                          {item.phone && <p className="text-[11px] text-gray-400 mt-0.5">{item.phone}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!item.isDefault && (
                          <button onClick={() => handleSetDefault(item.id)} className="text-[11px] font-bold text-gray-500 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100 transition">
                            Set default
                          </button>
                        )}
                        <button onClick={() => handleSelectSavedAddress(item)} className="fc-btn !px-3 !py-1.5 text-xs text-white" style={{background:'var(--fc-green)',borderColor:'var(--fc-green)'}}>
                          Select
                        </button>
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
    </div>
  );

  return createPortal(modalContent, document.body);
}
