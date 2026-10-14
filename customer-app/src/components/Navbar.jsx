import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMode } from '../context/ModeContext';
import MilegaLogo from './MilegaLogo';
import LocationSelector from './LocationSelector';
import AddressModal, { getSavedAddresses } from './AddressModal';
import { Search, ShoppingBag, MapPin, LogOut, Receipt, User, Menu, X, ChevronDown, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { getUniversalProfileIcon } from '../utils/imageUtils';

export default function Navbar({ onVegToggle }) {
  const { user, logout } = useAuth();
  const { cravingsCart, freshCart } = useCart();
  const { isFresh: globalIsFresh } = useMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeSavedAddress, setActiveSavedAddress] = useState(null);

  const isFreshRoute = location.pathname.includes('fresh-mandi');
  const isCravingsRoute = location.pathname.includes('cravings');
  const isFresh = isFreshRoute ? true : (isCravingsRoute ? false : globalIsFresh);
  const activeCart = isFresh ? (freshCart || { items: [] }) : (cravingsCart || { items: [] });
  const itemCount = activeCart.items?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;

  const [isVegOnly, setIsVegOnly] = useState(() => localStorage.getItem('krawing_veg_only') === 'true');

  useEffect(() => setSearchQuery(searchParams.get('q') || ''), [searchParams]);

  const loadSavedAddr = () => {
    try {
      const savedRaw = localStorage.getItem('krawing_user_address') || localStorage.getItem('krawing_selected_address');
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && (parsed.street || parsed.title || parsed.area || parsed.city)) {
          setActiveSavedAddress(parsed);
          return;
        }
      }
      const list = getSavedAddresses();
      if (list && list.length > 0) {
        setActiveSavedAddress(list.find(a => a.isDefault) || list[0]);
      } else {
        setActiveSavedAddress(null);
      }
    } catch {
      setActiveSavedAddress(null);
    }
  };

  useEffect(() => {
    loadSavedAddr();
    const handleUpdate = () => loadSavedAddr();
    window.addEventListener('krawing_addresses_updated', handleUpdate);
    window.addEventListener('krawing_location_changed', handleUpdate);
    return () => {
      window.removeEventListener('krawing_addresses_updated', handleUpdate);
      window.removeEventListener('krawing_location_changed', handleUpdate);
    };
  }, []);

  const toggleVegMode = () => {
    const nextVal = !isVegOnly;
    setIsVegOnly(nextVal);
    localStorage.setItem('krawing_veg_only', String(nextVal));
    if (onVegToggle) onVegToggle(nextVal);
    window.dispatchEvent(new CustomEvent('krawing_veg_toggle', { detail: { vegOnly: nextVal } }));
    toast.success(nextVal ? 'Pure Veg filter activated' : 'Showing all items (Veg & Non-Veg)');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
    setMobileOpen(false);
  };

  const goTo = (path) => {
    navigate(path);
    setMobileOpen(false);
    setDeptOpen(false);
  };

  return (
    <>
      <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} />

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3 justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <MilegaLogo size="medium" showTagline={false} />
            </Link>

            {/* Location selector (Desktop) */}
            <div className="hidden xl:block min-w-[190px] max-w-[240px]">
              <LocationSelector variant="desktop" />
            </div>

            {/* Search bar - Visible across screen sizes */}
            <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 max-w-2xl mx-1.5 sm:mx-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                aria-label="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isFresh ? 'Search fresh vegetables, fruits & groceries' : 'Search for dishes, restaurants & cravings'}
                className="fc-input pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-gray-50 border-gray-200 focus:bg-white rounded-lg sm:rounded-xl truncate placeholder:text-gray-400 placeholder:text-xs sm:placeholder:text-sm"
              />
            </form>

            {/* Right action icons */}
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Veg toggle */}
              <button
                onClick={toggleVegMode}
                className={`hidden md:flex text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                  isVegOnly
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {isVegOnly ? '🥬 Veg Only' : '🥬 Pure Veg'}
              </button>

              {/* Cart button - Hidden on mobile screens (< sm) */}
              <button
                onClick={() => navigate('/cart')}
                className="hidden sm:flex relative items-center gap-2 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition"
                aria-label="Cart"
              >
                <ShoppingBag className="w-5 h-5 text-gray-700" />
                <span className="hidden md:block text-xs font-semibold text-gray-700">Cart</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-scale-in">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Profile dropdown - Hidden on mobile screens (< md) */}
              {user ? (
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg sm:rounded-xl hover:bg-gray-50 transition"
                    aria-expanded={profileOpen}
                  >
                    <img
                      src={getUniversalProfileIcon(user.avatar)}
                      alt={user.name || 'Profile'}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-200"
                    />
                    <span className="hidden md:block max-w-[100px] truncate text-xs font-semibold text-gray-700">
                      {user.name || user.fullName || 'Account'}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-up">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/70">
                        <div className="font-bold text-sm text-gray-900 truncate">{user.name || user.fullName || 'Account'}</div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">{user.email || user.phone}</div>
                      </div>
                      <div className="p-2 space-y-0.5">
                        <Link
                          to="/search"
                          onClick={() => setProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2.5 transition"
                        >
                          <Search className="w-4 h-4 text-gray-500" /> Shop / Search
                        </Link>
                        <Link
                          to="/orders"
                          onClick={() => setProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2.5 transition"
                        >
                          <Receipt className="w-4 h-4 text-gray-500" /> My Orders
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2.5 transition"
                        >
                          <User className="w-4 h-4 text-gray-500" /> Customer Account
                        </Link>
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            logout();
                            toast.success('Logged out successfully');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 border-t border-gray-100 mt-1 pt-2 transition"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="hidden sm:inline-flex fc-btn fc-btn-primary py-2 px-3 text-xs rounded-xl">
                  Sign In
                </Link>
              )}

              {/* Mobile Hamburger Menu Button on the Right End */}
              <button
                className="lg:hidden p-2 rounded-lg sm:rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition shrink-0"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subheader bar for Desktop */}
          <div className="hidden lg:flex items-center gap-6 pt-3 mt-3 border-t border-gray-100 text-sm">
            <div className="relative">
              <button
                onClick={() => setDeptOpen(!deptOpen)}
                className="fc-btn fc-btn-primary py-1.5 px-3.5 text-xs rounded-xl flex items-center gap-1.5"
                type="button"
              >
                <LayoutGrid className="w-4 h-4" /> All Categories <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {deptOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-2 animate-slide-up">
                  {(isFresh
                    ? ['Fruits & Vegetables', 'Dairy, Bread & Eggs', 'Atta, Rice & Dal', 'Oils & Ghee', 'Snacks & Munchies', 'Cleaning Essentials']
                    : ['Biryani', 'Pizza', 'Burgers', 'Momos', 'North Indian', 'Sweets']
                  ).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => goTo(`/search?q=${encodeURIComponent(cat)}`)}
                      className="block w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium hover:bg-gray-50 text-gray-700 transition"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => goTo('/home')} className={`fc-nav-link ${location.pathname === '/' || location.pathname === '/home' ? 'active' : ''}`}>
              Home
            </button>
            <button onClick={() => goTo('/search')} className="fc-nav-link">
              Shop & Explore
            </button>
            <button onClick={() => goTo('/orders')} className="fc-nav-link">
              My Orders
            </button>
            {user && (
              <button onClick={() => goTo('/profile')} className="fc-nav-link">
                My Profile
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Location Sub-bar */}
      <div className="lg:hidden border-b border-gray-100 bg-white px-4 py-2">
        <LocationSelector variant="mobile" />
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden transition-opacity" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-[310px] max-w-[88vw] bg-white shadow-2xl p-5 overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <MilegaLogo size="medium" showTagline={false} />
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit} className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food or items..."
                className="fc-input pl-10 pr-4 py-2 text-sm bg-gray-50 rounded-xl"
              />
            </form>

            {/* Saved Address Widget */}
            <div className="mb-4 p-3 rounded-2xl border border-gray-200 bg-gray-50/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" /> Delivery Address
                </span>
                <button onClick={() => { setMobileOpen(false); setShowAddressModal(true); }} className="text-xs font-bold text-rose-600 hover:underline">
                  {activeSavedAddress ? 'Change' : 'Select'}
                </button>
              </div>
              {activeSavedAddress ? (
                <div>
                  <div className="text-xs font-bold text-gray-900 truncate flex items-center gap-1">
                    {activeSavedAddress.title || 'Saved Location'}
                    {activeSavedAddress.isDefault && <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded font-bold">Default</span>}
                  </div>
                  <div className="text-xs text-gray-600 truncate mt-0.5">
                    {activeSavedAddress.street || activeSavedAddress.area || activeSavedAddress.addressLine || 'No street details'}
                  </div>
                </div>
              ) : (
                <button onClick={() => { setMobileOpen(false); setShowAddressModal(true); }} className="text-xs text-gray-600 hover:text-gray-900 w-full text-left py-1">
                  + Add delivery location
                </button>
              )}
            </div>

            {/* Navigation Links */}
            <div className="space-y-1">
              <button onClick={() => goTo('/home')} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-100 font-semibold text-sm">
                Home
              </button>
              <button onClick={() => goTo('/search')} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-100 font-semibold text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" /> Shop & Search
              </button>
              <button onClick={() => goTo('/cart')} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-100 font-semibold text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-gray-500" /> Cart {itemCount > 0 && `(${itemCount})`}
              </button>
              {user && (
                <button onClick={() => goTo('/orders')} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-100 font-semibold text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-gray-500" /> My Orders
                </button>
              )}
              {user && (
                <button onClick={() => goTo('/profile')} className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-100 font-semibold text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" /> Customer Account
                </button>
              )}
              <button
                onClick={() => { setMobileOpen(false); setShowAddressModal(true); }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-100 font-semibold text-sm flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-gray-500" /> Manage Addresses
              </button>
            </div>

            {/* Auth / Logout Button */}
            <div className="mt-auto pt-4 border-t border-gray-100">
              {user ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                    toast.success('Logged out successfully');
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold text-sm flex items-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4 text-rose-600" /> Sign Out
                </button>
              ) : (
                <button
                  onClick={() => goTo('/login')}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-700 font-semibold text-sm flex items-center gap-2 transition"
                >
                  <User className="w-4 h-4 text-emerald-600" /> Sign In / Create Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
