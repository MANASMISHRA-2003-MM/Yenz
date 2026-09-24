import React, { useState, useRef, useEffect } from 'react';
import { useMode } from '../context/ModeContext';
import { ChevronDown, Check } from 'lucide-react';

export default function ModeSwitcher() {
  const { activeMode, switchMode, isFresh } = useMode();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (newMode) => {
    switchMode(newMode);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left z-50" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Switch Shopping Mode"
        className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl font-extrabold text-xs transition-all border shadow-sm ${
          isFresh
            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100/80 shadow-emerald-500/10'
            : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100/80 shadow-rose-500/10'
        }`}
      >
        <span className="flex items-center gap-1.5 text-sm">
          {isFresh ? '🥬' : '🍔'}
          <span className="font-heading font-extrabold text-xs tracking-tight">
            {isFresh ? 'Fresh Mandi' : 'Cravings Food'}
          </span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          tabIndex="-1"
          className="absolute left-0 mt-2 w-64 rounded-3xl bg-white border border-slate-200 shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-1.5 border-b border-slate-100">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Select Shopping Experience</p>
          </div>

          {/* Option 1: Cravings */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('cravings')}
            className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-colors ${
              activeMode === 'cravings'
                ? 'bg-rose-50 border border-rose-200 text-rose-950 font-bold'
                : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-base">
                🍔
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900">🍔 Cravings</p>
                <p className="text-[11px] text-slate-500 font-medium">Gourmet meals, restaurants & dishes</p>
              </div>
            </div>
            {activeMode === 'cravings' && <Check className="w-4 h-4 text-rose-600" />}
          </button>

          {/* Option 2: Fresh */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('fresh')}
            className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-colors ${
              activeMode === 'fresh'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold'
                : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-base">
                🥬
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900">🥬 Fresh Mandi</p>
                <p className="text-[11px] text-slate-500 font-medium">Daily vegetables, fruits & staples</p>
              </div>
            </div>
            {activeMode === 'fresh' && <Check className="w-4 h-4 text-emerald-600" />}
          </button>
        </div>
      )}
    </div>
  );
}
