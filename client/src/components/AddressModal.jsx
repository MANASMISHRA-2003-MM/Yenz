import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Plus, Trash2, CheckCircle2, Home, Briefcase, Navigation, X, Edit2 } from 'lucide-react';
import { reverseGeocode } from '../utils/reverseGeocode';

const DEFAULT_ADDRESSES = [];

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
    <div className="fixed inset-0 z-[9999] bg-gray-900/50 p-4 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-xl rounded-lg border border-gray-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:'rgba(229,27,75,.08)',color:'var(--fc-red)'}}><MapPin className="w-5 h-5" /></div><div><h2 className="font-semibold text-gray-900">Select delivery location</h2><p className="text-xs text-gray-500 mt-1">Manage saved addresses or use live GPS.</p></div></div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 border-b border-gray-200 grid grid-cols-2 gap-2">
          <button onClick={handleFetchDeviceLocation} disabled={locating} className="fc-btn" style={{color:'var(--fc-fresh)',background:'rgba(22,138,91,.06)',borderColor:'rgba(22,138,91,.25)'}}><Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />{locating ? 'Locating…' : 'Use live GPS'}</button>
          <button onClick={() => setShowAddForm(!showAddForm)} className="fc-btn" style={{background:'#1f2937',borderColor:'#1f2937',color:'#fff'}}><Plus className="w-4 h-4" />Add address</button>
        </div>
        <div className="p-4 overflow-y-auto">
          {showAddForm && <form onSubmit={handleAddSubmit} className="mb-4 p-4 rounded-md bg-gray-50 border border-gray-200 space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900">New address</h3><span className="text-[10px] uppercase tracking-wide text-gray-400">Saved locally</span></div><div className="flex gap-2">{['Home','Work','Other'].map(type => <button key={type} type="button" onClick={() => setNewAddr({...newAddr,title:type})} className={`px-3 py-1.5 rounded-md border text-xs font-semibold ${newAddr.title === type ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300'}`}>{type}</button>)}</div><label><span className="fc-label">Street / apartment / area</span><input className="fc-input" required value={newAddr.street} onChange={e=>setNewAddr({...newAddr,street:e.target.value})} placeholder="Flat 101, Sunshine Heights" /></label><div className="grid grid-cols-2 gap-3"><label><span className="fc-label">City</span><input className="fc-input" required value={newAddr.city} onChange={e=>setNewAddr({...newAddr,city:e.target.value})} /></label><label><span className="fc-label">Pincode</span><input className="fc-input" required value={newAddr.pincode} onChange={e=>setNewAddr({...newAddr,pincode:e.target.value})} /></label></div><label><span className="fc-label">Phone</span><input className="fc-input" required value={newAddr.phone} onChange={e=>setNewAddr({...newAddr,phone:e.target.value})} /></label><div className="flex gap-2"><button type="submit" className="fc-btn text-white flex-1" style={{background:'var(--fc-fresh)',borderColor:'var(--fc-fresh)'}}>Save address</button><button type="button" onClick={()=>setShowAddForm(false)} className="fc-btn-secondary">Cancel</button></div></form>}
          {addresses.length === 0 ? <div className="py-12 text-center text-sm text-gray-500"><MapPin className="w-8 h-8 mx-auto text-gray-300" /><p className="mt-3">No saved addresses yet.</p></div> : <div className="space-y-3">{addresses.map(item => <div key={item.id} className={`rounded-md border p-4 ${item.isDefault ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'}`}><div className="flex items-start justify-between gap-4"><div className="flex gap-3 min-w-0"><div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center shrink-0">{item.title.toLowerCase().includes('home') ? <Home className="w-4 h-4" /> : item.title.toLowerCase().includes('work') ? <Briefcase className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}</div><div className="min-w-0"><div className="flex items-center gap-2"><span className="font-semibold text-sm text-gray-900">{item.title}</span>{item.isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{background:'var(--fc-red)'}}>Default</span>}</div><p className="text-sm text-gray-600 mt-1">{item.street}, {item.city} - {item.pincode}</p><p className="text-xs text-gray-400 mt-1">{item.phone}</p></div></div><div className="flex items-center gap-1 shrink-0">{!item.isDefault && <button onClick={()=>handleSetDefault(item.id)} className="text-[10px] font-semibold text-gray-500 hover:text-gray-900 px-2">Set default</button>}{onSelectAddress && <button onClick={()=>{onSelectAddress(item);onClose();}} className="fc-btn !px-3 !py-1.5 text-xs text-white" style={{background:'var(--fc-green)',borderColor:'var(--fc-green)'}}>Select</button>}<button onClick={()=>handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600" title="Delete address"><Trash2 className="w-4 h-4" /></button></div></div></div>)}</div>}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
