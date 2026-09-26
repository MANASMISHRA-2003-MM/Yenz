import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMode } from '../context/ModeContext';
import KrawingLogo from './KrawingLogo';
import ModeSwitcher from './ModeSwitcher';
import LocationSelector from './LocationSelector';
import AddressModal from './AddressModal';
import { Search, ShoppingBag, MapPin, LogOut, Receipt, User } from 'lucide-react';

export default function Navbar({ onVegToggle }) {
  const { user, logout } = useAuth();
  const { cravingsCart, freshCart } = useCart();
  const { isFresh: globalIsFresh } = useMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [profileOpen, setProfileOpen] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Route-authoritative mode determination
  const isFreshRoute = location.pathname.includes('fresh-mandi');
  const isCravingsRoute = location.pathname.includes('cravings');
  const isFresh = isFreshRoute ? true : (isCravingsRoute ? false : globalIsFresh);

  // Active cart derived strictly from route-authoritative mode
  const activeCart = isFresh ? (freshCart || { items: [] }) : (cravingsCart || { items: [] });
  const itemCount = activeCart.items && Array.isArray(activeCart.items)
    ? activeCart.items.reduce((acc, item) => acc + (item.quantity || 0), 0)
    : 0;
  const subtotal = activeCart.items && Array.isArray(activeCart.items)
    ? activeCart.items.reduce((acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 0), 0)
    : 0;

  // Global VEG Mode toggle state
  const [isVegOnly, setIsVegOnly] = useState(() => {
    return localStorage.getItem('krawing_veg_only') === 'true';
  });

  // Role Gating & Portal Routing
  const roleUpper = (user?.role || '').toUpperCase();
  const isVendor = roleUpper === 'VENDOR';
  const isDelivery = roleUpper === 'DELIVERY_PARTNER';
  const isAdmin = roleUpper === 'ADMIN';
  const isPortalUser = isVendor || isDelivery || isAdmin;

  const portalDashboardUrl = isVendor
    ? '/vendor/dashboard'
    : (isDelivery ? '/delivery/dashboard' : (isAdmin ? '/admin/dashboard' : '/'));

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const toggleVegMode = () => {
    const nextState = !isVegOnly;
    setIsVegOnly(nextState);
    localStorage.setItem('krawing_veg_only', String(nextState));
    window.dispatchEvent(new CustomEvent('krawing_veg_toggled', { detail: { isVegOnly: nextState } }));
    if (onVegToggle) onVegToggle(nextState);
  };

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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8E9ED] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ================= DESKTOP HEADER (≥ 1024px) ================= */}
          <div className="hidden lg:flex items-center justify-between h-16 gap-4">
            
            {/* Logo & Portal Badge or Location Selector */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <Link to={portalDashboardUrl} className="flex items-center focus:outline-none">
                <KrawingLogo size="medium" />
              </Link>
              
              {isPortalUser ? (
                <div className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  {isVendor && <span>🏪 Store Vendor Portal</span>}
                  {isDelivery && <span className="text-blue-900">🛵 Delivery Fleet Portal</span>}
                  {isAdmin && <span className="text-purple-900">⚙️ Platform Admin Portal</span>}
                </div>
              ) : (
                <LocationSelector variant="desktop" />
              )}
            </div>

            {/* Consumer Mode Switcher & Search Bar (Hidden for Vendors / Drivers) */}
            {!isPortalUser && (
              <div className="flex-1 max-w-xl min-w-[260px] flex items-center gap-3">
                <ModeSwitcher routeMode={isFresh ? 'fresh' : 'cravings'} />

                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={isFresh ? "Search vegetables, fruits, essentials..." : "Search dishes, biryani, pizza..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F5F6F7] border border-[#E8E9ED] rounded-xl text-xs font-medium text-[#17181C] placeholder-[#9095A1] focus:outline-none focus:bg-white focus:border-[#CBD5E1] transition"
                  />
                </form>
              </div>
            )}

            {/* VEG Toggle, Basket & Profile Dropdown */}
            <div className="flex items-center gap-3 flex-shrink-0">
              
              {!isPortalUser && (
                <>
                  {/* Global VEG Toggle Switch */}
                  <button
                    onClick={toggleVegMode}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold transition ${
                      isVegOnly
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                        : 'bg-[#F5F6F7] text-[#686D78] border-[#E8E9ED] hover:bg-[#E8E9ED]'
                    }`}
                    title="Toggle Veg Only Mode"
                  >
                    <span className="text-[10px] uppercase font-black">VEG</span>
                    <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${isVegOnly ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isVegOnly ? 'translate-x-3' : 'translate-x-0'}`} />
                    </div>
                  </button>

                  {/* Basket Button */}
                  <Link
                    to={isFresh ? '/checkout/fresh-mandi' : '/checkout/cravings'}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-extrabold text-xs transition border ${
                      itemCount > 0
                        ? isFresh
                          ? 'bg-[#168A5B] text-white border-[#0F6945] shadow-sm'
                          : 'bg-[#E51B4B] text-white border-[#B90F38] shadow-sm'
                        : 'bg-[#F5F6F7] text-[#17181C] border-[#E8E9ED] hover:bg-[#E8E9ED]'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      {itemCount > 0 ? `Basket (₹${subtotal})` : 'Cart'}
                    </span>
                    {itemCount > 0 && (
                      <span className="w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center bg-slate-900 text-white border-2 border-white">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {/* User Profile */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#F5F6F7] border border-transparent hover:border-[#E8E9ED] transition"
                  >
                    <img
                      src={(user.avatar && !user.avatar.includes('user-avatar.jpg')) ? user.avatar : 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'}
                      alt={user.name}
                      className="w-9 h-9 rounded-xl object-cover border border-[#E8E9ED]"
                    />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E8E9ED] shadow-xl z-50 p-2 space-y-1">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-xs font-extrabold text-[#17181C] truncate">{user.name}</p>
                        <p className="text-[10px] text-[#9095A1] font-mono font-bold capitalize">{user.role} Account</p>
                      </div>

                      {isPortalUser && (
                        <Link
                          to={portalDashboardUrl}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]"
                        >
                          <ShoppingBag className="w-4 h-4 text-emerald-600" />
                          <span>My Dashboard</span>
                        </Link>
                      )}

                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]"
                      >
                        <User className="w-4 h-4 text-[#9095A1]" />
                        <span>My Profile</span>
                      </Link>

                      {!isPortalUser && (
                        <>
                          <Link
                            to="/orders"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]"
                          >
                            <Receipt className="w-4 h-4 text-[#9095A1]" />
                            <span>My Orders</span>
                          </Link>

                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              setShowAddressModal(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7] transition text-left"
                          >
                            <MapPin className="w-4 h-4 text-[#E51B4B]" />
                            <span>Saved Address</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 bg-[#E51B4B] text-white rounded-xl font-extrabold text-xs shadow-sm hover:bg-[#B90F38] transition"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>

          {/* ================= TABLET HEADER (768px to 1023px) ================= */}
          <div className="hidden md:flex lg:hidden flex-col py-2.5 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-shrink-0">
                <Link to={portalDashboardUrl} className="flex items-center focus:outline-none">
                  <KrawingLogo size="small" />
                </Link>
                {isPortalUser ? (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[10px] font-black uppercase">
                    {isVendor ? '🏪 Vendor Portal' : (isDelivery ? '🛵 Delivery Portal' : '⚙️ Admin Portal')}
                  </span>
                ) : (
                  <LocationSelector variant="desktop" />
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!isPortalUser && (
                  <>
                    <ModeSwitcher routeMode={isFresh ? 'fresh' : 'cravings'} />
                    <button
                      onClick={toggleVegMode}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-extrabold transition ${
                        isVegOnly
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                          : 'bg-[#F5F6F7] text-[#686D78] border-[#E8E9ED] hover:bg-[#E8E9ED]'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-black">VEG</span>
                      <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors ${isVegOnly ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                        <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${isVegOnly ? 'translate-x-2.5' : 'translate-x-0'}`} />
                      </div>
                    </button>
                    <Link
                      to={isFresh ? '/checkout/fresh-mandi' : '/checkout/cravings'}
                      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-extrabold text-xs bg-[#E51B4B] text-white"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{itemCount > 0 ? `₹${subtotal}` : 'Cart'}</span>
                    </Link>
                  </>
                )}

                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center p-1 rounded-xl hover:bg-[#F5F6F7] border border-transparent hover:border-[#E8E9ED] transition"
                    >
                      <img
                        src={(user.avatar && !user.avatar.includes('user-avatar.jpg')) ? user.avatar : 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'}
                        alt={user.name}
                        className="w-8 h-8 rounded-xl object-cover border border-[#E8E9ED]"
                      />
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E8E9ED] shadow-xl z-50 p-2 space-y-1">
                        <div className="px-3 py-2 border-b border-slate-100">
                          <p className="text-xs font-extrabold text-[#17181C] truncate">{user.name}</p>
                          <p className="text-[10px] text-[#9095A1] font-mono font-bold capitalize">{user.role} Account</p>
                        </div>
                        {isPortalUser && (
                          <Link to={portalDashboardUrl} onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]">
                            <ShoppingBag className="w-4 h-4 text-emerald-600" />
                            <span>My Dashboard</span>
                          </Link>
                        )}
                        <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]">
                          <User className="w-4 h-4 text-[#9095A1]" />
                          <span>My Profile</span>
                        </Link>
                        {!isPortalUser && (
                          <Link to="/orders" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]">
                            <Receipt className="w-4 h-4 text-[#9095A1]" />
                            <span>My Orders</span>
                          </Link>
                        )}
                        <button onClick={() => { setProfileOpen(false); logout(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 text-left">
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link to="/login" className="px-3 py-1.5 bg-[#E51B4B] text-white rounded-xl font-extrabold text-xs">Sign In</Link>
                )}
              </div>
            </div>

            {!isPortalUser && (
              <form onSubmit={handleSearchSubmit} className="w-full relative">
                <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={isFresh ? "Search vegetables, fruits, essentials..." : "Search dishes, biryani, pizza..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F5F6F7] border border-[#E8E9ED] rounded-xl text-xs font-semibold text-[#17181C] placeholder-[#9095A1] focus:outline-none focus:bg-white transition"
                />
              </form>
            )}
          </div>

          {/* ================= MOBILE HEADER (< 768px) ================= */}
          <div className="md:hidden py-2.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              {isPortalUser ? (
                <div className="flex items-center gap-2">
                  <Link to={portalDashboardUrl} className="flex items-center focus:outline-none">
                    <KrawingLogo size="small" />
                  </Link>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-[9px] font-black uppercase">
                    {isVendor ? 'Vendor' : (isDelivery ? 'Delivery' : 'Admin')}
                  </span>
                </div>
              ) : (
                <LocationSelector variant="mobile" />
              )}

              <div className="flex items-center gap-1.5">
                {!isPortalUser && (
                  <>
                    <ModeSwitcher routeMode={isFresh ? 'fresh' : 'cravings'} />
                    <button
                      onClick={toggleVegMode}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-extrabold transition ${
                        isVegOnly ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-[#F5F6F7] text-[#686D78] border-[#E8E9ED]'
                      }`}
                    >
                      <span className="font-black">VEG</span>
                      <div className={`w-5 h-3 rounded-full p-0.5 transition-colors ${isVegOnly ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                        <div className={`w-2 h-2 rounded-full bg-white transition-transform ${isVegOnly ? 'translate-x-2' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </>
                )}

                {user ? (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center p-0.5 rounded-full border border-transparent hover:border-[#E8E9ED] transition"
                    >
                      <img
                        src={(user.avatar && !user.avatar.includes('user-avatar.jpg')) ? user.avatar : 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover border border-[#E8E9ED]"
                      />
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E8E9ED] shadow-xl z-50 p-2 space-y-1">
                        <div className="px-3 py-2 border-b border-slate-100">
                          <p className="text-xs font-extrabold text-[#17181C] truncate">{user.name}</p>
                          <p className="text-[10px] text-[#9095A1] font-mono font-bold capitalize">{user.role} Account</p>
                        </div>

                        {isPortalUser && (
                          <Link to={portalDashboardUrl} onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]">
                            <ShoppingBag className="w-4 h-4 text-emerald-600" />
                            <span>My Dashboard</span>
                          </Link>
                        )}

                        <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]">
                          <User className="w-4 h-4 text-[#9095A1]" />
                          <span>My Profile</span>
                        </Link>

                        {!isPortalUser && (
                          <Link to="/orders" onClick={() => setProfileOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#17181C] hover:bg-[#F5F6F7]">
                            <Receipt className="w-4 h-4 text-[#9095A1]" />
                            <span>My Orders</span>
                          </Link>
                        )}

                        <button onClick={() => { setProfileOpen(false); logout(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 text-left">
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link to="/login" className="px-3 py-1 bg-[#E51B4B] text-white rounded-lg text-[10px] font-extrabold">Login</Link>
                )}
              </div>
            </div>

            {!isPortalUser && (
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={isFresh ? 'Search "tamatar", "apple", "spinach"...' : 'Search "chatpata", "biryani", "pizza"...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F5F6F7] border border-[#E8E9ED] rounded-2xl text-xs font-semibold text-[#17181C] placeholder-[#9095A1] focus:outline-none focus:bg-white transition"
                />
              </form>
            )}
          </div>

        </div>
      </header>

      {showAddressModal && (
        <AddressModal
          isOpen={showAddressModal}
          onClose={() => setShowAddressModal(false)}
          onSelectAddress={() => {
            setShowAddressModal(false);
            window.dispatchEvent(new Event('krawing_location_changed'));
          }}
        />
      )}
    </>
  );
}
