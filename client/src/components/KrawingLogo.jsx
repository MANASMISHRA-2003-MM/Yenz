import React from 'react';
import { useMode } from '../context/ModeContext';

export default function KrawingLogo({ size = 'medium', className = '' }) {
  const { isFresh } = useMode();

  const height = size === 'small' ? 'h-7' : size === 'large' ? 'h-10' : 'h-8';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* SVG Brand Mark */}
      <div className={`relative flex items-center justify-center rounded-2xl transition-colors duration-300 ${
        size === 'small' ? 'w-8 h-8' : size === 'large' ? 'w-11 h-11' : 'w-9 h-9'
      } ${
        isFresh ? 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-md' : 'bg-rose-600 text-white shadow-rose-500/20 shadow-md'
      }`}>
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
          {/* Dual motif: Fork/Flame for Cravings + Fresh Leaf for Fresh */}
          {isFresh ? (
            <path
              d="M16 4C16 4 9 10 9 17C9 21.4183 12.5817 25 17 25C21.4183 25 25 21.4183 25 17C25 10 16 4 16 4ZM16 23C16 23 14 18 16 13C16 13 18 18 16 23Z"
              fill="currentColor"
            />
          ) : (
            <path
              d="M10 6V14C10 16.2091 11.7909 18 14 18V26H18V18C20.2091 18 22 16.2091 22 14V6M14 6V12M18 6V12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center">
          <span className="font-heading font-extrabold text-xl tracking-tight text-slate-900">
            KRA<span className={isFresh ? 'text-emerald-600' : 'text-rose-600'}>WING</span>
          </span>
        </div>
        <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase mt-0.5">
          {isFresh ? 'FRESH SABZI & PRODUCE' : 'HYPERLOCAL FOOD & MEALS'}
        </span>
      </div>
    </div>
  );
}
