import React from 'react';
import { useMode } from '../context/ModeContext';

export default function MilegaLogo({ size = 'medium', className = '', showTagline = true }) {
  const { isFresh } = useMode();
  const logoHeight = size === 'small' ? 'h-7' : size === 'large' ? 'h-10' : 'h-8';
  const wordSize = size === 'small' ? 'text-lg' : size === 'large' ? 'text-2xl' : 'text-xl';
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src="/logo-icon@2x.png"
        alt="Milega Food"
        className={`${logoHeight} w-auto object-contain`}
        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo-icon.png'; }}
      />
      <div className="leading-none">
        <div className={`font-extrabold tracking-tight ${wordSize}`}>
          <span className="text-[#21313c]">Milega</span><span className="ml-1 text-[#0aad0a]">Food</span>
        </div>
        {showTagline && <div className="text-[8px] mt-1 font-bold tracking-[.08em] uppercase text-[#889397]">{isFresh ? 'Fresh sabzi & produce' : 'Hyperlocal food & meals'}</div>}
      </div>
    </div>
  );
}

export function MilegaLogoBanner({ className = '', height = 'h-8' }) {
  return <img src="/logo-transparent.png" alt="Milega Food" className={`${height} w-auto object-contain ${className}`} />;
}
