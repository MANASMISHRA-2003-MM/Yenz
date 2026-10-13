import React, { useState, useRef, useEffect } from 'react';
import { useMode } from '../context/ModeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Check, Utensils, Leaf } from 'lucide-react';

export default function ModeSwitcher({ routeMode }) {
  const { activeMode: globalActiveMode, switchMode, isFresh: globalIsFresh } = useMode();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isFresh = routeMode ? routeMode === 'fresh' : globalIsFresh;
  const activeMode = routeMode || globalActiveMode;

  useEffect(() => {
    const outside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', key); };
  }, []);

  const handleSelect = (newMode) => {
    switchMode(newMode);
    setIsOpen(false);
    if (location.pathname.includes('/checkout/')) navigate(newMode === 'fresh' ? '/checkout/fresh-mandi' : '/checkout/cravings');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center gap-1 p-1 rounded-lg border border-gray-200 bg-white" aria-label="Switch shopping mode">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition ${!isFresh ? 'text-white bg-[rgb(229,27,75)]' : 'text-gray-600 hover:bg-gray-100'}`}>
          <Utensils className="w-3.5 h-3.5" /> Cravings
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition ${isFresh ? 'text-white bg-[rgb(22,138,91)]' : 'text-gray-600 hover:bg-gray-100'}`}>
          <Leaf className="w-3.5 h-3.5" /> Fresh Mandi
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 mr-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-[60]">
          <div className="px-3 py-2 border-b border-gray-200 mb-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Choose experience</div>
          </div>
          <button onClick={() => handleSelect('cravings')} className={`w-full p-3 rounded-md flex items-center justify-between text-left ${activeMode === 'cravings' ? 'bg-rose-50' : 'hover:bg-gray-50'}`}>
            <span className="flex items-center gap-3"><span className="w-9 h-9 rounded-md bg-rose-50 text-[rgb(229,27,75)] flex items-center justify-center"><Utensils className="w-4 h-4" /></span><span><b className="block text-sm text-gray-800">Cravings</b><small className="text-xs text-gray-500">Restaurants, meals and dishes</small></span></span>
            {activeMode === 'cravings' && <Check className="w-4 h-4 text-[rgb(229,27,75)]" />}
          </button>
          <button onClick={() => handleSelect('fresh')} className={`w-full p-3 rounded-md flex items-center justify-between text-left ${activeMode === 'fresh' ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
            <span className="flex items-center gap-3"><span className="w-9 h-9 rounded-md bg-emerald-50 text-[rgb(22,138,91)] flex items-center justify-center"><Leaf className="w-4 h-4" /></span><span><b className="block text-sm text-gray-800">Fresh Mandi</b><small className="text-xs text-gray-500">Vegetables, fruits and groceries</small></span></span>
            {activeMode === 'fresh' && <Check className="w-4 h-4 text-[rgb(22,138,91)]" />}
          </button>
        </div>
      )}
    </div>
  );
}
