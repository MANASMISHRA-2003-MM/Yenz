import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Navigation } from 'lucide-react';
import AddressModal from './AddressModal';

export default function LocationSelector({ variant = 'desktop', onLocationUpdate }) {
  const [addressTitle, setAddressTitle] = useState('Lakkarpur, Faridabad');
  const [addressSubtext, setAddressSubtext] = useState('Shiv Durga Vihar, Haryana');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    loadSavedAddress();
    const handleLocationEvent = () => loadSavedAddress();
    window.addEventListener('krawing_location_changed', handleLocationEvent);
    return () => window.removeEventListener('krawing_location_changed', handleLocationEvent);
  }, []);

  const loadSavedAddress = () => {
    try {
      const saved = localStorage.getItem('krawing_user_address');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.street || parsed.area) {
          setAddressTitle(parsed.title || parsed.area || 'Saved Location');
          setAddressSubtext([parsed.street, parsed.city || 'Faridabad'].filter(Boolean).join(', '));
        }
      }
    } catch (e) {}
  };

  const handleUseLiveGPS = (e) => {
    e.stopPropagation();
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = { lat: latitude, lng: longitude };
        localStorage.setItem('krawing_user_coords', JSON.stringify(coords));
        const gpsAddress = { title: 'Live Location', area: 'Lakkarpur', city: 'Faridabad', street: 'Current GPS Position' };
        localStorage.setItem('krawing_user_address', JSON.stringify(gpsAddress));
        setAddressTitle('Live Location');
        setAddressSubtext('Lakkarpur, Faridabad');
        setGettingLocation(false);
        window.dispatchEvent(new Event('krawing_location_changed'));
        if (onLocationUpdate) onLocationUpdate(coords);
      },
      (err) => {
        setGettingLocation(false);
        alert('Could not access live location. Please select address manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  if (variant === 'mobile') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 text-left group text-[#17181C] max-w-[220px] sm:max-w-xs"
        >
          <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200/80 flex items-center justify-center flex-shrink-0 text-[#E51B4B]">
            <MapPin className="w-4 h-4 fill-[#E51B4B]" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1 font-heading font-extrabold text-xs text-[#17181C] group-hover:text-[#E51B4B] transition-colors leading-tight truncate">
              <span className="truncate">{addressTitle}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            </div>
            <p className="text-[10px] text-[#686D78] font-medium truncate leading-tight mt-0.5">
              {addressSubtext}
            </p>
          </div>
        </button>

        {isModalOpen && (
          <AddressModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSelectAddress={(addr) => {
              setAddressTitle(addr.title || addr.area || 'Selected Address');
              setAddressSubtext([addr.street, addr.city].filter(Boolean).join(', '));
              setIsModalOpen(false);
              window.dispatchEvent(new Event('krawing_location_changed'));
            }}
          />
        )}
      </>
    );
  }

  // Desktop Variant
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#E8E9ED] text-left transition group"
      >
        <MapPin className="w-4 h-4 text-[#E51B4B] fill-[#E51B4B]" />
        <div>
          <span className="text-[10px] font-extrabold uppercase text-[#9095A1] tracking-wider block leading-none">
            DELIVER TO
          </span>
          <span className="text-xs font-extrabold text-[#17181C] group-hover:text-[#E51B4B] transition-colors flex items-center gap-1 leading-tight">
            <span>{addressTitle}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </span>
        </div>
      </button>

      {isModalOpen && (
        <AddressModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectAddress={(addr) => {
            setAddressTitle(addr.title || addr.area || 'Selected Address');
            setAddressSubtext([addr.street, addr.city].filter(Boolean).join(', '));
            setIsModalOpen(false);
            window.dispatchEvent(new Event('krawing_location_changed'));
          }}
        />
      )}
    </>
  );
}
