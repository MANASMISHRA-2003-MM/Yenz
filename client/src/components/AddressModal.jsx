import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Plus, Trash2, CheckCircle2, Home, Briefcase, Navigation, X, Edit2 } from 'lucide-react';

const DEFAULT_ADDRESSES = [
  {
    id: 'addr-1',
    title: 'Home',
    street: 'Flat 402, Shiv Durga Vihar',
    city: 'Faridabad',
    state: 'Haryana',
    pincode: '121009',
    phone: '+91 98765 43210',
    isDefault: true
  }
];

export function getSavedAddresses() {
  try {
    const data = localStorage.getItem('krawing_user_saved_addresses');
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading saved addresses:', e);
  }
  return DEFAULT_ADDRESSES;
}

export function saveAddresses(addresses) {
  try {
    localStorage.setItem('krawing_user_saved_addresses', JSON.stringify(addresses));
    window.dispatchEvent(new Event('krawing_addresses_updated'));
  } catch (e) {
    console.error('Error saving addresses:', e);
  }
}

export default function AddressModal({ isOpen, onClose, onSelectAddress }) {
  const [addresses, setAddresses] = useState(getSavedAddresses());
  const [showAddForm, setShowAddForm] = useState(false);
  const [locating, setLocating] = useState(false);

  const [newAddr, setNewAddr] = useState({
    title: 'Home',
    street: '',
    city: 'Faridabad',
    state: 'Haryana',
    pincode: '121009',
    phone: '+91 98765 43210'
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

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newAddr.street || !newAddr.city || !newAddr.pincode) return;

    const created = {
      id: `addr-${Date.now()}`,
      ...newAddr,
      isDefault: addresses.length === 0
    };
    const updated = [...addresses, created];
    setAddresses(updated);
    saveAddresses(updated);
    setShowAddForm(false);
    setNewAddr({
      title: 'Home',
      street: '',
      city: 'Faridabad',
      state: 'Haryana',
      pincode: '121009',
      phone: '+91 98765 43210'
    });
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
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          let street = '';
          let city = '';
          let pincode = '';
          let state = '';

          if (data && data.address) {
            const a = data.address;
            const sub = a.suburb || a.neighbourhood || a.residential || a.road || a.subdistrict || '';
            const house = a.house_number || a.building || '';
            street = [house, sub, a.amenity].filter(Boolean).join(', ') || data.display_name.split(',')[0];
            city = a.city || a.town || a.district || a.county || 'Faridabad';
            state = a.state || 'Haryana';
            pincode = a.postcode || '121009';
          } else {
            street = `GPS Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            city = 'Faridabad';
            state = 'Haryana';
            pincode = '121009';
          }

          const liveAddr = {
            id: `addr-live-${Date.now()}`,
            title: 'Live Location 📍',
            street,
            city,
            state,
            pincode,
            phone: '+91 98765 43210',
            isDefault: true
          };

          const updated = [liveAddr, ...addresses.map(a => ({ ...a, isDefault: false }))];
          setAddresses(updated);
          saveAddresses(updated);

          if (onSelectAddress) {
            onSelectAddress(liveAddr);
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
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 my-0 sm:my-auto">

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#E51B4B] flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">Select Delivery Location</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-tight">Manage your addresses or pick your location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition flex-shrink-0"
            aria-label="Close address modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-white grid grid-cols-2 gap-2">
          <button
            onClick={handleFetchDeviceLocation}
            disabled={locating}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold transition active:scale-95"
          >
            <Navigation className={`w-4 h-4 ${locating ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{locating ? 'Locating...' : 'Use Live GPS'}</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Address</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">

          {/* Add New Address Form */}
          {showAddForm && (
            <form onSubmit={handleAddSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <h3 className="font-extrabold text-slate-900 flex items-center justify-between">
                <span>New Address Profile</span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Fill Details</span>
              </h3>

              <div className="flex gap-2">
                {['Home', 'Work', 'Other'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewAddr({ ...newAddr, title: type })}
                    className={`px-3 py-1.5 rounded-lg font-bold border transition ${newAddr.title === type
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Street / Apartment / Area</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 101, Sunshine Heights"
                  value={newAddr.street}
                  onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={newAddr.city}
                    onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pincode</label>
                  <input
                    type="text"
                    value={newAddr.pincode}
                    onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newAddr.phone}
                  onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
                >
                  Save Address
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* List of Saved Addresses */}
          <div className="space-y-3">
            {addresses.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No saved addresses yet. Click "Add New Address" or "Use Live GPS".</p>
              </div>
            ) : (
              addresses.map(item => (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition relative ${item.isDefault
                      ? 'bg-rose-50/50 border-[#E51B4B] shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.title.toLowerCase().includes('home') ? (
                        <Home className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      ) : item.title.toLowerCase().includes('work') ? (
                        <Briefcase className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                      ) : (
                        <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      )}
                      <span className="font-extrabold text-xs text-slate-900">{item.title}</span>
                      {item.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#E51B4B] text-white">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!item.isDefault && (
                        <button
                          onClick={() => handleSetDefault(item.id)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline px-1"
                        >
                          Set Default
                        </button>
                      )}
                      {onSelectAddress && (
                        <button
                          onClick={() => {
                            onSelectAddress(item);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition"
                        >
                          Select
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete Address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-medium mt-2 leading-relaxed">
                    {item.street}, {item.city} - {item.pincode}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono font-medium mt-1">
                    Phone: {item.phone}
                  </p>
                </div>
              ))
            )}
          </div>

        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
