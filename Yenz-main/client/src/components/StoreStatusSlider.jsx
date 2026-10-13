import React from 'react';
import { Store, Power, CheckCircle2, XCircle } from 'lucide-react';

export default function StoreStatusSlider({ isOpen, onToggle, loading = false, disabled = false, showLabel = true }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Slider Track Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={isOpen}
        disabled={disabled || loading}
        onClick={onToggle}
        className={`relative inline-flex h-11 w-24 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner ${
          isOpen ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      >
        <span className="sr-only">Toggle Shop Status</span>
        
        {/* Track Icons */}
        <span className="absolute inset-0 flex items-center justify-between px-2.5 text-white font-extrabold text-[10px] pointer-events-none select-none">
          <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>ON</span>
          <span className={`transition-opacity duration-200 ${isOpen ? 'opacity-0' : 'opacity-100'}`}>OFF</span>
        </span>

        {/* Sliding Knob */}
        <span
          className={`pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
            isOpen ? 'translate-x-13' : 'translate-x-0'
          }`}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : isOpen ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600" />
          )}
        </span>
      </button>

      {/* Dynamic Status Text Label */}
      {showLabel && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className={`text-xs font-extrabold tracking-wide uppercase ${isOpen ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isOpen ? '🟢 SHOP IS ONLINE (Accepting Orders)' : '🔴 SHOP IS OFFLINE (Closed)'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">
            {isOpen ? 'Customers can view menu & place live orders' : 'Customers can view shop but cannot place orders'}
          </span>
        </div>
      )}
    </div>
  );
}
