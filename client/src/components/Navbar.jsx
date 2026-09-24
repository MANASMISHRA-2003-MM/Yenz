import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMode } from '../context/ModeContext';
import KrawingLogo from './KrawingLogo';
import ModeSwitcher from './ModeSwitcher';
import { Search, ShoppingBag, MapPin, LogOut, ShieldCheck, Store, Bike, Receipt, Home as HomeIcon } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount, subtotal } = useCart();
  const { isFresh } = useMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <>
      {/* Top Desktop & Tablet Header */}
      <header className="sticky top-0 z-40 glass-header border-b border-[#E8E9ED]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Left: Brand Logo & Dynamic Location Selector */}
            <div className="flex items-center gap-5">
              <Link to="/" className="flex items-center focus:outline-none">
                <KrawingLogo size="medium" />
              </Link>

              {/* Dynamic Location Pill */}
              <div className="hidden md:flex items-center gap-2 bg-[#F5F6F7] hover:bg-[#E8E9ED] border border-[#E8E9ED] px-3 py-1.5 rounded-xl cursor-pointer transition text-xs font-medium text-[#17181C]">
                <MapPin className={`w-4 h-4 flex-shrink-0 ${isFresh ? 'text-[#168A5B]' : 'text-[#E51B4B]'}`} />
                <div className="leading-tight">
                  <span className="text-[10px] uppercase font-extrabold text-[#9095A1] block">Deliver to</span>
                  <span className="font-extrabold text-[#17181C] truncate max-w-[150px] block">Lakkarpur, Faridabad</span>
                </div>
              </div>
            </div>

            {/* Center: Search Bar Input & Mode Switcher */}
            <div className="flex-1 max-w-md hidden sm:flex items-center gap-3">
              <ModeSwitcher />

              <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                <Search className="w-4 h-4 text-[#9095A1] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isFresh ? "Search vegetables, fruits, essentials..." : "Search dishes, biryani, pizza..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F5F6F7] border border-[#E8E9ED] rounded-xl text-xs font-medium text-[#17181C] placeholder-[#9095A1] focus:outline-none focus:bg-white focus:border-[#CBD5E1] transition"
                />
              </form>
            </div>

            {/* Right: Cart & User Account Menu */}
            <div className="flex items-center gap-3">
              
              {/* Mobile Mode Switcher */}
              <div className="sm:hidden">
                <ModeSwitcher />
              </div>

              {/* Shopping Cart Button */}
              <Link
                to="/cart"
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold text-xs transition border ${
                  itemCount > 0
                    ? isFresh
                      ? 'bg-[#168A5B] text-white border-[#168A5B] shadow-sm'
                      : 'bg-[#E51B4B] text-white border-[#E51B4B] shadow-sm'
                    : 'bg-[#F5F6F7] text-[#17181C] border-[#E8E9ED] hover:bg-[#E8E9ED]'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden md:inline font-extrabold">
                  {itemCount > 0 ? `Basket (₹${subtotal})` : 'Cart'}
                </span>

                {itemCount > 0 && (
                  <span className="w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center bg-slate-900 text-white border-2 border-white">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* User Account Menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#F5F6F7] border border-transparent hover:border-[#E8E9ED] transition"
                  >
                    <img
                      src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'}
                      alt={user.name}
                      className="w-9 h-9 rounded-xl object-cover border border-[#E8E9ED]"
                    />
                  </button>

                  {/* Profile Dropdown */}
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E8E9ED] shadow-xl z-50 p-2 space-y-1">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-xs font-extrabold text-[#17181C] truncate">{user.name}</p>
                        <p className="text-[10px] text-[#9095A1] font-mono font-bold capitalize">{user.role} Account</p>
                      </div>

                      {user.role === 'consumer' && (
                        <Link
                          to="/orders"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]"
                        >
                          <Receipt className="w-4 h-4 text-[#9095A1]" />
                          <span>My Orders</span>
                        </Link>
                      )}

                      {(user.role === 'vendor' || user.role === 'admin') && (
                        <Link
                          to="/vendor/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]"
                        >
                          <Store className="w-4 h-4 text-amber-500" />
                          <span>Vendor Dashboard</span>
                        </Link>
                      )}

                      {(user.role === 'delivery_partner' || user.role === 'admin') && (
                        <Link
                          to="/delivery/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]"
                        >
                          <Bike className="w-4 h-4 text-cyan-500" />
                          <span>Driver Panel</span>
                        </Link>
                      )}

                      {user.role === 'admin' && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-500" />
                          <span>Admin Control Panel</span>
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          logout();
                          setProfileOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#E51B4B] hover:bg-[#FFF0F3] transition"
                      >
                        <LogOut className="w-4 h-4 text-[#E51B4B]" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-[#17181C] hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold shadow-sm transition"
                >
                  Sign In
                </Link>
              )}

            </div>

          </div>
        </div>
      </header>

      {/* Mobile Bottom Sticky Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E9ED] px-4 py-2 flex items-center justify-around">
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold ${
            location.pathname === '/' || location.pathname === '/home' ? (isFresh ? 'text-[#168A5B]' : 'text-[#E51B4B]') : 'text-[#9095A1]'
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link
          to="/search"
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold ${
            location.pathname === '/search' ? (isFresh ? 'text-[#168A5B]' : 'text-[#E51B4B]') : 'text-[#9095A1]'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Search</span>
        </Link>

        <Link
          to="/cart"
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold relative ${
            location.pathname === '/cart' ? (isFresh ? 'text-[#168A5B]' : 'text-[#E51B4B]') : 'text-[#9095A1]'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span>Cart</span>
          {itemCount > 0 && (
            <span className={`absolute -top-1 right-1 w-4 h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center text-white ${
              isFresh ? 'bg-[#168A5B]' : 'bg-[#E51B4B]'
            }`}>
              {itemCount}
            </span>
          )}
        </Link>

        <Link
          to="/orders"
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold ${
            location.pathname === '/orders' ? (isFresh ? 'text-[#168A5B]' : 'text-[#E51B4B]') : 'text-[#9095A1]'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span>Orders</span>
        </Link>
      </nav>
    </>
  );
}
