import React from 'react';

export default function MilegaLogo({ size = 'medium', className = '', showTagline = true }) {
  const logoHeight = size === 'small' ? 'h-7' : size === 'large' ? 'h-10' : 'h-8';
  const wordSize = size === 'small' ? 'text-lg' : size === 'large' ? 'text-2xl' : 'text-xl';
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src="/logo-icon@2x.png"
        alt="Milega Vendor"
        className={`${logoHeight} w-auto object-contain`}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/logo-icon.png';
        }}
      />
      <div className="leading-none">
        <div className={`font-black tracking-tight ${wordSize}`}>
          <span className="text-slate-900">Milega</span>
          <span className="ml-1 text-emerald-600">Vendor</span>
        </div>
        {showTagline && (
          <div className="text-[9px] mt-1 font-bold tracking-wider uppercase text-slate-400">
            Store & Kitchen Partner
          </div>
        )}
      </div>
    </div>
  );
}

export function MilegaLogoBanner({ className = '', height = 'h-8' }) {
  return (
    <img
      src="/logo-transparent.png"
      alt="Milega Vendor"
      className={`${height} w-auto object-contain ${className}`}
    />
  );
}
