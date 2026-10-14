import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Navigation } from 'lucide-react';
import AddressModal from './AddressModal';
import { getActiveAddress, setActiveAddress, getSavedAddresses, saveAddresses, safeStorage } from '../utils/addressStorage';
import { reverseGeocode } from '../utils/reverseGeocode';

export default function LocationSelector({ variant = 'desktop', onLocationUpdate }) {
  const [addressTitle, setAddressTitle] = useState(() => {
    const active = getActiveAddress();
    return active?.street || active?.title || active?.area || 'Choose location 📍';
  });

  const [addressSubtext, setAddressSubtext] = useState(() => {
    const active = getActiveAddress();
    if (active) {
      return [active.city, active.pincode].filter(Boolean).join(' - ') || active.state || 'Choose location & enter mobile number';
    }
    return 'Choose location & enter mobile number';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const syncAddress = (addr) => {
      const target = addr || getActiveAddress();
      if (target && (target.street || target.title || target.area || target.city)) {
        const titleStr = target.street || target.title || target.area || 'Choose location 📍';
        const subtextStr = [target.city, target.pincode].filter(Boolean).join(' - ') || target.state || 'Choose location & enter mobile number';
        setAddressTitle(titleStr);
        setAddressSubtext(subtextStr);
      } else {
        setAddressTitle('Choose location 📍');
        setAddressSubtext('Choose location & enter mobile number');
      }
    };

    syncAddress();

    const handleLocationEvent = (e) => {
      syncAddress(e?.detail?.address);
    };
    const handleAddressesEvent = () => {
      syncAddress();
    };

    window.addEventListener('krawing_location_changed', handleLocationEvent);
    window.addEventListener('krawing_addresses_updated', handleAddressesEvent);

    return () => {
      window.removeEventListener('krawing_location_changed', handleLocationEvent);
      window.removeEventListener('krawing_addresses_updated', handleAddressesEvent);
    };
  }, []);

  const handleSelectAddress = (addr) => {
    if (!addr) return;
    setActiveAddress(addr);
    const titleStr = addr.street || addr.title || addr.area || 'Selected Address';
    const subtextStr = [addr.city, addr.pincode].filter(Boolean).join(' - ') || addr.state || 'Saved Location';
    setAddressTitle(titleStr);
    setAddressSubtext(subtextStr);
    setIsModalOpen(false);

    const lat = addr.lat || addr.latitude;
    const lng = addr.lng || addr.longitude;
    if (onLocationUpdate && lat && lng) {
      onLocationUpdate({ lat: Number(lat), lng: Number(lng) });
    }
  };

  const handleUseLiveGPS = (e) => {
    if (e) e.stopPropagation();
    setGettingLocation(true);

    const processCoords = async (latitude, longitude) => {
      try {
        const geoResult = await reverseGeocode(latitude, longitude);

        const gpsAddress = {
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
          phone: '',
          isDefault: true
        };

        const savedList = getSavedAddresses();
        const nonLive = savedList.filter(a => !(a.id?.startsWith('addr-live') || a.title?.includes('Live Location')));
        const updatedList = [gpsAddress, ...nonLive.map(a => ({ ...a, isDefault: false }))];
        saveAddresses(updatedList);
        setActiveAddress(gpsAddress);

        setAddressTitle(gpsAddress.street);
        setAddressSubtext([geoResult.city, geoResult.pincode].filter(Boolean).join(' - ') || 'Live Location');
        if (onLocationUpdate) onLocationUpdate({ lat: latitude, lng: longitude });
      } catch (err) {
        console.error('Error reverse geocoding:', err);
      } finally {
        setGettingLocation(false);
      }
    };

    if (!navigator.geolocation) {
      fallbackIP();
      return;
    }

    function fallbackIP() {
      fetch('https://api.bigdatacloud.net/data/reverse-geocode-client')
        .then(r => r.json())
        .then(d => {
          if (d.latitude && d.longitude) {
            processCoords(Number(d.latitude), Number(d.longitude));
          } else {
            setGettingLocation(false);
          }
        })
        .catch(() => setGettingLocation(false));
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => processCoords(pos.coords.latitude, pos.coords.longitude),
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => processCoords(pos.coords.latitude, pos.coords.longitude),
          () => fallbackIP(),
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
        );
      },
      { timeout: 4500, enableHighAccuracy: true, maximumAge: 30000 }
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
