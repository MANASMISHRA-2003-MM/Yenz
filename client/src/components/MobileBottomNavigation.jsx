import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Clock, User, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMode } from '../context/ModeContext';

export default function MobileBottomNavigation() {
  const location = useLocation();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { isFresh } = useMode();

  const activePath = location.pathname;

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'Orders', path: '/orders', icon: Clock },
    { label: 'Cart', path: isFresh ? '/checkout/fresh-mandi' : '/checkout/cravings', icon: ShoppingBag, badge: itemCount },
    { label: 'Profile', path: user ? '/profile' : '/login', icon: User }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E9ED] md:hidden pb-safe">
      <div className="flex items-center justify-around h-14 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePath === item.path || (item.path !== '/' && activePath.startsWith(item.path));

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                isActive
                  ? isFresh ? 'text-[#168A5B]' : 'text-[#E51B4B]'
                  : 'text-[#686D78] hover:text-[#17181C]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge > 0 && (
                  <span className={`absolute -top-1.5 -right-2.5 text-[9px] font-extrabold text-white px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-sm ${
                    isFresh ? 'bg-[#168A5B]' : 'bg-[#E51B4B]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-extrabold mt-0.5 ${isActive ? 'font-black' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
