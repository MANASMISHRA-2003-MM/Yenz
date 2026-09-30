import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Navigation } from 'lucide-react';
import AddressModal, { getSavedAddresses, saveAddresses } from './AddressModal';
import { reverseGeocode } from '../utils/reverseGeocode';

export default function LocationSelector({ variant = 'desktop', onLocationUpdate }) {
  const [addressTitle, setAddressTitle] = useState('Detecting Location... 📍');
  const [addressSubtext, setAddressSubtext] = useState('Tap to use live GPS or select address');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    loadSavedAddress();
    const handleLocationEvent = () => loadSavedAddress();
    window.addEventListener('krawing_location_changed', handleLocationEvent);
    window.addEventListener('krawing_addresses_updated', handleLocationEvent);
    return () => {
      window.removeEventListener('krawing_location_changed', handleLocationEvent);
      window.removeEventListener('krawing_addresses_updated', handleLocationEvent);
    };
  }, []);

  const loadSavedAddress = () => {
    try {
      // 1. Check if user explicitly selected/saved a location
      const savedRaw = localStorage.getItem('krawing_user_address') || localStorage.getItem('krawing_selected_address');
      let targetAddr = null;
      if (savedRaw) {
        targetAddr = JSON.parse(savedRaw);
      }

      // 2. If no active selection, check saved addresses list for default or first address
      if (!targetAddr || (!targetAddr.street && !targetAddr.title && !targetAddr.area && !targetAddr.city)) {
        const savedList = getSavedAddresses();
        if (savedList && savedList.length > 0) {
          targetAddr = savedList.find(a => a.isDefault) || savedList[0];
        }
      }

      // 3. Format address display if targetAddr exists
      if (targetAddr && (targetAddr.street || targetAddr.title || targetAddr.area || targetAddr.city)) {
        const titleStr = targetAddr.street || targetAddr.title || targetAddr.area || 'Selected Address';
        const subtextStr = [targetAddr.city, targetAddr.pincode].filter(Boolean).join(' - ') || targetAddr.state || 'Saved Location';
        setAddressTitle(titleStr);
        setAddressSubtext(subtextStr);
        return;
      }

      // 4. Default state if no location is selected yet
      setAddressTitle('Select Delivery Location 📍');
      setAddressSubtext('Tap to enable GPS or choose address');
    } catch (e) {
      console.error('Error loading address:', e);
      setAddressTitle('Select Delivery Location 📍');
      setAddressSubtext('Tap to enable GPS or choose address');
    }
  };

  const handleSelectAddress = (addr) => {
    try {
      localStorage.setItem('krawing_user_address', JSON.stringify(addr));
      localStorage.setItem('krawing_selected_address', JSON.stringify(addr));
    } catch (e) {}
    const titleStr = addr.street || addr.title || addr.area || 'Selected Address';
    const subtextStr = [addr.city, addr.pincode].filter(Boolean).join(' - ') || 'Saved Location';
    setAddressTitle(titleStr);
    setAddressSubtext(subtextStr);
    setIsModalOpen(false);
    window.dispatchEvent(new Event('krawing_location_changed'));
  };

  const handleUseLiveGPS = (e) => {
    if (e) e.stopPropagation();
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = { lat: latitude, lng: longitude };
        localStorage.setItem('krawing_user_coords', JSON.stringify(coords));
        
        const geoResult = await reverseGeocode(latitude, longitude);

        const gpsAddress = {
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

        const savedList = getSavedAddresses();
        const nonLive = savedList.filter(a => !(a.id?.startsWith('addr-live') || a.title?.includes('Live Location')));
        const updatedList = [gpsAddress, ...nonLive.map(a => ({ ...a, isDefault: false }))];
        saveAddresses(updatedList);

        localStorage.setItem('krawing_user_address', JSON.stringify(gpsAddress));
        localStorage.setItem('krawing_selected_address', JSON.stringify(gpsAddress));
        
        setAddressTitle(geoResult.street || 'Live Location 📍');
        setAddressSubtext([geoResult.city, geoResult.pincode].filter(Boolean).join(' - '));
        setGettingLocation(false);
        window.dispatchEvent(new Event('krawing_location_changed'));
        if (onLocationUpdate) onLocationUpdate(coords);
      },
      (err) => {
        setGettingLocation(false);
        alert('Could not access live location. Please select address manually.');
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  if (variant === 'mobile') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 text-left group text-[#17181C] w-full min-w-0"
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
            onSelectAddress={handleSelectAddress}
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
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-[#E8E9ED] text-left transition group max-w-[170px] sm:max-w-[200px] lg:max-w-[240px]"
      >
        <MapPin className="w-4 h-4 text-[#E51B4B] fill-[#E51B4B] flex-shrink-0" />
        <div className="overflow-hidden min-w-0">
          <span className="text-[10px] font-extrabold uppercase text-[#9095A1] tracking-wider block leading-none">
            DELIVER TO
          </span>
          <span className="text-xs font-extrabold text-[#17181C] group-hover:text-[#E51B4B] transition-colors flex items-center gap-1 leading-tight truncate">
            <span className="truncate">{addressTitle}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
          </span>
        </div>
      </button>

      {isModalOpen && (
        <AddressModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectAddress={handleSelectAddress}
        />
      )}
    </>
  );
}
