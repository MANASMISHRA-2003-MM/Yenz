import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Clock3, User, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function MobileBottomNavigation() {
  const { pathname } = useLocation();
  const { itemCount } = useCart();

  const items = [
    ['/home', 'Home', Home],
    ['/search', 'Explore', Search],
    ['/orders', 'Orders', Clock3],
    ['/cart', 'Cart', ShoppingBag],
    ['/profile', 'Account', User]
  ];

  return (
    <nav className="fc-mobile-dock fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] safe-bottom">
      <div className="grid grid-cols-5 max-w-xl mx-auto px-2 py-1.5">
        {items.map(([path, label, Icon]) => {
          const active =
            pathname === path ||
            (path === '/home' && pathname === '/') ||
            (path !== '/home' && pathname.startsWith(path));

          return (
            <Link
              key={path}
              to={path}
              className={`relative flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-all ${
                active ? 'text-emerald-600 font-bold scale-105' : 'text-gray-500 font-medium hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${active ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                {path === '/cart' && itemCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 bg-emerald-600 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-sm">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{label}</span>
              {active && <span className="w-1 h-1 bg-emerald-600 rounded-full -mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
