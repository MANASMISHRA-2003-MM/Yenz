import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Flame, MapPin, ShoppingBag, User, LogOut, Search, ChevronDown, Shield, Store, Bike } from 'lucide-react';

export default function Navbar({ onSearchChange }) {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [locationText] = useState('Sector 18, Noida');

  const getRoleBadge = (role) => {
    switch (role) {
      case 'vendor':
        return { label: 'Vendor Panel', icon: Store, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'delivery_partner':
        return { label: 'Delivery Driver', icon: Bike, bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case 'admin':
        return { label: 'Super Admin', icon: Shield, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: 'Consumer', icon: User, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      navigate(`/search?q=${encodeURIComponent(e.target.value)}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Location */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-500 to-rose-600 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Flame className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                  KRAWING
                </span>
                <span className="block text-[10px] font-bold text-brand-600 tracking-widest uppercase -mt-1">
                  Hyperlocal Food
                </span>
              </div>
            </Link>

            {/* Location Selector */}
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 transition cursor-pointer">
              <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <div className="text-xs">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Deliver to</span>
                <span className="font-bold text-slate-800">{locationText}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search dishes (e.g. Paneer, Pizza, Snacks)..."
                onChange={(e) => {
                  if (onSearchChange) onSearchChange(e.target.value);
                }}
                onKeyDown={handleSearchSubmit}
                onFocus={() => {
                  if (window.location.pathname !== '/search' && !onSearchChange) {
                    navigate('/search');
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100/70 border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
              />
            </div>
          </div>

          {/* Navigation Right Actions */}
          <div className="flex items-center gap-3">
            {/* Search Icon Link for mobile/quick access */}
            <Link
              to="/search"
              className="p-2.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 text-slate-700 rounded-xl transition md:hidden"
              title="Search Dishes"
            >
              <Search className="w-5 h-5 text-slate-700" />
            </Link>

            {user ? (
              <>
                {/* Role Badge */}
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${roleInfo.bg}`}>
                  <RoleIcon className="w-3.5 h-3.5" />
                  <span>{roleInfo.label}</span>
                </div>

                {/* Consumer Cart Icon */}
                {user.role === 'consumer' && (
                  <Link
                    to="/cart"
                    className="relative p-2.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 text-slate-700 rounded-xl transition"
                  >
                    <ShoppingBag className="w-5 h-5 text-slate-700" />
                    {itemCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md shadow-brand-500/30">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Orders Link */}
                <Link
                  to={
                    user.role === 'vendor'
                      ? '/vendor/dashboard'
                      : user.role === 'delivery_partner'
                      ? '/delivery/dashboard'
                      : user.role === 'admin'
                      ? '/admin/dashboard'
                      : '/orders'
                  }
                  className="hidden sm:inline-flex px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-brand-600 transition"
                >
                  My Orders
                </Link>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="p-2.5 bg-slate-100 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 rounded-xl transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-brand-600 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-extrabold rounded-xl shadow-md shadow-brand-500/20 transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
