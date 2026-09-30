import React from 'react';
import { useMode } from '../context/ModeContext';

/**
 * MilegaLogo - Primary brand identity component for Milega Food.
 * Features the signature stylized orange "M" speed-emblem with fresh green leaves
 * paired with high-legibility brand typography ("Milega" in dark charcoal, "Food" in vibrant orange).
 */
export default function MilegaLogo({ size = 'medium', className = '', showTagline = true }) {
  const { isFresh } = useMode();

  const iconHeight = size === 'small' ? 'h-7' : size === 'large' ? 'h-10' : 'h-8';
  const textMain = size === 'small' ? 'text-lg' : size === 'large' ? 'text-2xl' : 'text-xl';
  const taglineSize = size === 'small' ? 'text-[8px]' : 'text-[9px]';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Logo Emblem Mark */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        <img
          src="/logo-icon@2x.png"
          alt="Milega Food Logo"
          decoding="async"
          fetchPriority="high"
          className={`${iconHeight} w-auto object-contain transition-transform duration-200 hover:scale-105 drop-shadow-sm`}
          onError={(e) => {
            // Graceful fallback to standard resolution icon or transparent banner
            e.currentTarget.src = '/logo-icon.png';
          }}
        />
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center font-heading font-black tracking-tight">
          <span className={`text-[#1D2529] ${textMain}`}>
            Milega
          </span>
          <span className={`text-[#FC6E2F] ml-1.5 ${textMain}`}>
            Food
          </span>
        </div>
        {showTagline && (
          <span className={`${taglineSize} font-extrabold tracking-widest text-slate-400 uppercase mt-0.5`}>
            {isFresh ? 'FRESH SABZI & PRODUCE' : 'HYPERLOCAL FOOD & MEALS'}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Direct image banner variant of Milega Food logo
 */
export function MilegaLogoBanner({ className = '', height = 'h-8' }) {
  return (
    <img
      src="/logo-transparent.png"
      alt="Milega Food"
      className={`${height} w-auto object-contain select-none ${className}`}
    />
  );
}
