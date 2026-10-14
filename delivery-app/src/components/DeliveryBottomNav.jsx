import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bike, Navigation, History, Settings } from 'lucide-react';

export default function DeliveryBottomNav({ hasActiveTrip = false }) {
  const location = useLocation();

  const navItems = [
    {
      to: '/delivery/dashboard',
      label: 'Dashboard',
      icon: Bike,
      isActive: location.pathname === '/delivery/dashboard'
    },
    {
      to: '/delivery/active-trip',
      label: 'Active Trip',
      icon: Navigation,
      badge: hasActiveTrip ? '!' : null,
      isActive: location.pathname.includes('/active-trip')
    },
    {
      to: '/delivery/history',
      label: 'Trips',
      icon: History,
      isActive: location.pathname.includes('/history') || location.pathname === '/orders' || location.pathname === '/trips'
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      isActive: location.pathname === '/settings'
    }
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 safe-bottom sm:hidden">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center relative transition ${
                item.isActive ? 'text-sky-600 font-black' : 'text-slate-500 font-semibold hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${item.isActive ? 'stroke-[2.5]' : ''}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
