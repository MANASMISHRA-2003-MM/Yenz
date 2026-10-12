import React, { useState, useEffect, useRef, useMemo } from 'react';
import API from '../services/api';
import { Upload, X, Store, LocateFixed, Crosshair, MapPin, Navigation, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';
import StoreStatusSlider from './StoreStatusSlider';
import { reverseGeocode } from '../utils/reverseGeocode';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Pure pinpoint marker for pixel-perfect location pointing, zero text/words
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

function DraggableStoreMarker({ lat, lng, onPositionChange }) {
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

export default function VendorModal({ isOpen, onClose, vendor, defaultType = 'CRAVINGS', onSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    vendorType: defaultType,
    phone: '',
    email: '',
    address: '',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    latitude: '',
    longitude: '',
    deliveryFee: '30',
    deliveryTime: '25-35 min',
    image: '',
    bannerImage: '',
    status: 'open'
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);
  const [syncingAddress, setSyncingAddress] = useState(false);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || '',
        vendorType: vendor.vendorType || defaultType,
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        city: vendor.city || 'Noida',
        state: vendor.state || 'Uttar Pradesh',
        pincode: vendor.pincode || '201301',
        latitude: (vendor.latitude !== undefined && vendor.latitude !== null) ? String(vendor.latitude) : '',
        longitude: (vendor.longitude !== undefined && vendor.longitude !== null) ? String(vendor.longitude) : '',
        deliveryFee: vendor.deliveryFee ? String(vendor.deliveryFee) : '30',
        deliveryTime: vendor.deliveryTime || '25-35 min',
        image: vendor.image || '',
        bannerImage: vendor.bannerImage || '',
        status: vendor.status || 'open'
      });
    } else {
      setFormData({
        name: '',
        vendorType: defaultType,
        phone: '',
        email: '',
        address: '',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        latitude: '',
        longitude: '',
        deliveryFee: '30',
        deliveryTime: '25-35 min',
        image: '',
        bannerImage: '',
        status: 'open'
      });
    }
  }, [vendor, defaultType, isOpen]);

  if (!isOpen) return null;

  const numLat = Number(formData.latitude);
  const numLng = Number(formData.longitude);
  const hasValidCoords = !isNaN(numLat) && !isNaN(numLng) && formData.latitude !== '' && formData.longitude !== '' && numLat !== 0 && numLng !== 0;
  const mapCenter = hasValidCoords ? [numLat, numLng] : [28.5355, 77.3910];

  // Fetch live GPS from browser/device like in customer location modal
  const handleFetchLiveGps = (e) => {
    if (e) e.preventDefault();
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const latVal = Number(latitude.toFixed(6));
          const lngVal = Number(longitude.toFixed(6));

          // Run multi-provider reverse geocoding to resolve street, city, state, pincode
          const geo = await reverseGeocode(latVal, lngVal);

          setFormData(prev => ({
            ...prev,
            latitude: String(latVal),
            longitude: String(lngVal),
            address: geo.street || prev.address || 'Store Location',
            city: geo.city || prev.city || 'Noida',
            state: geo.state || prev.state || 'Uttar Pradesh',
            pincode: geo.pincode || prev.pincode || '201301'
          }));

          toast.success(`Live GPS fetched: ${latVal.toFixed(4)}, ${lngVal.toFixed(4)} and address auto-filled!`);
        } catch (err) {
          console.error('Reverse geocode error:', err);
          toast.warning('Captured GPS coordinates, but could not resolve address automatically.');
        } finally {
          setFetchingGps(false);
        }
      },
      (err) => {
        setFetchingGps(false);
        toast.error(`GPS Error: ${err.message || 'Permission denied or timed out'}`);
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // When marker is dragged or map is clicked
  const handleMapPositionChange = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: String(lat),
      longitude: String(lng)
    }));
  };

  // Reverse geocode from current coordinate inputs
  const handleSyncAddressFromCoords = async () => {
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (!formData.latitude || !formData.longitude || isNaN(lat) || isNaN(lng)) {
      toast.error('Please enter valid numeric latitude and longitude');
      return;
    }
    setSyncingAddress(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      setFormData(prev => ({
        ...prev,
        address: geo.street || prev.address,
        city: geo.city || prev.city,
        state: geo.state || prev.state,
        pincode: geo.pincode || prev.pincode
      }));
      toast.success(`Address updated: ${geo.street || geo.city || 'Coordinates resolved'}`);
    } catch (e) {
      toast.error('Could not fetch address for these coordinates');
    } finally {
      setSyncingAddress(false);
    }
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        if (field === 'image') setUploadingImage(true);
        else setUploadingBanner(true);

        const base64 = reader.result;
        const res = await API.post('/admin/upload-image', { image: base64, folder: `krawing/vendors/${field}s` });
        if (res.data.success) {
          setFormData(prev => ({ ...prev, [field]: res.data.secureUrl }));
          toast.success(`${field === 'image' ? 'Store Logo' : 'Banner'} uploaded to Cloudinary`);
        }
      } catch (err) {
        toast.error('Image upload failed');
      } finally {
        setUploadingImage(false);
        setUploadingBanner(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Store name is required');
      return;
    }
    if (!formData.address?.trim()) {
      toast.error('Store address is required');
      return;
    }

    try {
      const parsedLat = (formData.latitude !== '' && formData.latitude !== null && !isNaN(Number(formData.latitude)))
        ? Number(formData.latitude)
        : null;
      const parsedLng = (formData.longitude !== '' && formData.longitude !== null && !isNaN(Number(formData.longitude)))
        ? Number(formData.longitude)
        : null;

      const payload = {
        name: formData.name.trim(),
        vendorType: formData.vendorType,
        address: formData.address?.trim() || 'Main Market',
        city: formData.city?.trim() || 'Noida',
        state: formData.state?.trim() || 'Uttar Pradesh',
        pincode: formData.pincode?.trim() || '201301',
        latitude: parsedLat,
        longitude: parsedLng,
        deliveryFee: Number(formData.deliveryFee) || 30,
        deliveryTime: formData.deliveryTime || '25-35 min',
        status: formData.status || 'open',
        image: formData.image && formData.image.trim() ? formData.image.trim() : (formData.bannerImage && formData.bannerImage.trim() ? formData.bannerImage.trim() : '/favicon.png'),
        bannerImage: formData.bannerImage && formData.bannerImage.trim() ? formData.bannerImage.trim() : (formData.image && formData.image.trim() ? formData.image.trim() : '/favicon.png'),
        phone: formData.phone && formData.phone.trim() ? formData.phone.trim() : undefined,
        email: formData.email && formData.email.trim() ? formData.email.trim() : null
      };

      let res;
      if (vendor?._id || vendor?.id) {
        res = await API.put(`/restaurants/${vendor._id || vendor.id}`, payload);
      } else {
        res = await API.post('/restaurants', payload);
      }

      if (res.data.success) {
        toast.success(vendor ? 'Store updated successfully' : 'Store created with exact GPS location!');
        onSaved();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save store');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-6">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                {vendor ? 'Manage Store Profile' : (defaultType === 'FRESH' ? 'Add Fresh Mandi Vendor' : 'Add Cravings Restaurant')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">PostgreSQL store details, exact GPS pin, & Cloudinary media links</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-700">
          
          {/* STORE NAME & OPERATING MODE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Store Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Royal Punjab Dhaba"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Operating Mode</label>
              <select
                value={formData.vendorType}
                onChange={e => setFormData({ ...formData, vendorType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              >
                <option value="CRAVINGS">CRAVINGS (Food Restaurant)</option>
                <option value="FRESH">FRESH MANDI (Groceries & Produce)</option>
              </select>
            </div>
          </div>

          {/* PHONE & EMAIL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Contact Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="store@milegafoods.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* STORE PHYSICAL LOCATION & LIVE GPS SECTION */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg">
                  <LocateFixed className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 tracking-tight">Storefront GPS Coordinates & Map Pin</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Actual shop pickup coordinates for Driver navigation, Customer tracking, & Vendor maps</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleFetchLiveGps}
                disabled={fetchingGps}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-xs font-extrabold shadow-sm transition shrink-0 cursor-pointer"
              >
                {fetchingGps ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Detecting GPS...</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Fetch from Live GPS</span>
                  </>
                )}
              </button>
            </div>

            {/* Latitude & Longitude Coordinate Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 font-extrabold text-slate-900 text-[11px] flex items-center justify-between">
                  <span>Store Latitude</span>
                  {hasValidCoords && (
                    <span className="text-[10px] text-emerald-600 font-bold">● Active Map Pin</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g. 28.535517"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-rose-500 text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-extrabold text-slate-900 text-[11px] flex items-center justify-between">
                  <span>Store Longitude</span>
                  {hasValidCoords && (
                    <a
                      href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      Verify on Google Maps <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g. 77.391029"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-rose-500 text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Coordinate Tools & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleSyncAddressFromCoords}
                disabled={syncingAddress || !hasValidCoords}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-lg transition shadow-xs cursor-pointer"
                title="Fetch street, city, state, & pincode from these coordinates"
              >
                <RefreshCw className={`w-3 h-3 ${syncingAddress ? 'animate-spin' : ''}`} />
                <span>{syncingAddress ? 'Resolving Address...' : 'Auto-fill Address from Coordinates'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <MapIcon className="w-3 h-3 text-slate-500" />
                <span>{showMap ? 'Hide Map Preview' : 'Show Interactive Map'}</span>
                {showMap ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Interactive Leaflet Map Preview & Click/Drag Pin */}
            {showMap && (
              <div className="mt-2 space-y-1.5">
                <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-0">
                  <MapContainer
                    center={mapCenter}
                    zoom={hasValidCoords ? 15 : 12}
                    scrollWheelZoom={false}
                    className="w-full h-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapResizer />
                    <MapRecenter lat={numLat} lng={numLng} />
                    <DraggableStoreMarker
                      lat={numLat}
                      lng={numLng}
                      onPositionChange={handleMapPositionChange}
                    />
                  </MapContainer>

                  {!hasValidCoords && (
                    <div className="absolute inset-x-3 bottom-3 z-[400] bg-slate-900/85 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-between pointer-events-none">
                      <span>📍 Click anywhere on map or tap "Fetch from Live GPS" to set restaurant coordinates</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 font-medium text-center">
                  Click anywhere on the map or drag the pin to adjust the exact storefront location.
                </p>
              </div>
            )}

            {/* Street Address & City / State / Pincode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70">
              <div className="sm:col-span-2">
                <label className="block mb-1 font-extrabold text-slate-900 text-[11px]">Address / Landmark / Street *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Sector 62, Main Market, Near Metro Station"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 font-extrabold text-slate-900 text-[11px]">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Noida"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 font-extrabold text-slate-900 text-[11px]">State / Region</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Uttar Pradesh"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium text-xs"
                />
              </div>

              <div>
                <label className="block mb-1 font-extrabold text-slate-900 text-[11px]">Pincode / Postal Code</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="201301"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium text-xs"
                />
              </div>
            </div>
          </div>

          {/* DELIVERY FEE, EST TIME & STATUS */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Delivery Fee (₹)</label>
              <input
                type="number"
                value={formData.deliveryFee}
                onChange={e => setFormData({ ...formData, deliveryFee: e.target.value })}
                placeholder="30"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Est. Time</label>
              <input
                type="text"
                value={formData.deliveryTime}
                onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
                placeholder="25-35 min"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              >
                <option value="open">OPEN</option>
                <option value="closed">CLOSED</option>
              </select>
            </div>
          </div>

          {/* Cloudinary Logo & Banner Uploads */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-extrabold text-slate-900 mb-1">Cloudinary Store Logo URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                />
                <label className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'image')} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="block font-extrabold text-slate-900 mb-1">Cloudinary Banner Image URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.bannerImage}
                  onChange={e => setFormData({ ...formData, bannerImage: e.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                />
                <label className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'bannerImage')} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Store Open/Closed Slider Control */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
            <StoreStatusSlider
              isOpen={formData.status === 'open'}
              onToggle={() => setFormData({ ...formData, status: formData.status === 'open' ? 'closed' : 'open' })}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition cursor-pointer">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer">
              Save Store
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
