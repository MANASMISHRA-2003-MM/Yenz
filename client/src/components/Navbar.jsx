import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMode } from '../context/ModeContext';
import MilegaLogo from './MilegaLogo';
import LocationSelector from './LocationSelector';
import AddressModal, { getSavedAddresses } from './AddressModal';
import { Search, ShoppingBag, MapPin, LogOut, Receipt, User, Menu, X, ChevronDown, Truck, LayoutGrid, Download, History, FileText, CreditCard } from 'lucide-react';
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
  const subtotal = activeCart.items?.reduce((acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 0), 0) || 0;

  const [isVegOnly, setIsVegOnly] = useState(() => localStorage.getItem('krawing_veg_only') === 'true');
  const roleUpper = (user?.role || '').toUpperCase();
  const isVendor = roleUpper === 'VENDOR';
  const isDelivery = roleUpper === 'DELIVERY_PARTNER';
  const isAdmin = roleUpper === 'ADMIN';
  const isPortalUser = isVendor || isDelivery || isAdmin;
  const portalDashboardUrl = isVendor ? '/vendor/dashboard' : (isDelivery ? '/delivery/dashboard' : (isAdmin ? '/admin/dashboard' : '/'));

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

  const [riderLocationInfo, setRiderLocationInfo] = useState(() => {
    try {
      const savedCoords = localStorage.getItem('milega_rider_coords');
      const savedAddrName = localStorage.getItem('milega_rider_address_name');
      const userAddrRaw = localStorage.getItem('krawing_user_address') || localStorage.getItem('krawing_selected_address');
      let initialAddr = savedAddrName || '';
      if (!initialAddr && userAddrRaw) {
        const parsed = JSON.parse(userAddrRaw);
        initialAddr = parsed.street || parsed.title || parsed.area || parsed.city || '';
      }
      return { coords: savedCoords ? JSON.parse(savedCoords) : null, addressName: initialAddr };
    } catch { return { coords: null, addressName: '' }; }
  });

  useEffect(() => {
    if (!isDelivery) return;
    const handleLocChange = (e) => e.detail && setRiderLocationInfo(prev => ({
      coords: (e.detail.lat && e.detail.lng) ? { lat: e.detail.lat, lng: e.detail.lng } : prev.coords,
      addressName: e.detail.addressName || prev.addressName
    }));
    window.addEventListener('milega_rider_location_changed', handleLocChange);
    return () => window.removeEventListener('milega_rider_location_changed', handleLocChange);
  }, [isDelivery]);

  const toggleVegMode = () => {
    const nextState = !isVegOnly;
    setIsVegOnly(nextState);
    localStorage.setItem('krawing_veg_only', String(nextState));
    window.dispatchEvent(new CustomEvent('krawing_veg_toggled', { detail: { isVegOnly: nextState } }));
    onVegToggle?.(nextState);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : '/search');
    setMobileOpen(false);
  };

  const goTo = (path) => { navigate(path); setMobileOpen(false); setDeptOpen(false); };

  return (
    <>
      <header className="fc-navbar">
        <div className="fc-topbar hidden lg:block">
          <div className="fc-container py-2 flex items-center justify-between gap-4 text-[11px] font-medium">
            <span>Free delivery on eligible orders · Fresh, local & fast</span>
            <div className="flex items-center gap-4">
              <span>Support</span>
              <a
                href="/downloads/yenz-app.apk"
                download="Yenz-App.apk"
                onClick={() => {
                  try { toast.info('Downloading Yenz Android App APK...'); } catch {}
                }}
                className="hover:underline flex items-center gap-1 cursor-pointer font-bold text-emerald-700"
              >
                <Download className="w-3 h-3" /> Download App (APK)
              </a>
            </div>
          </div>
        </div>

        <div className="fc-container py-4">
          <div className="flex items-center gap-3 justify-between">

            <Link to={portalDashboardUrl} className="flex-shrink-0">
              <MilegaLogo size="medium" showTagline={false} />
            </Link>

            {!isPortalUser && (
              <div className="hidden xl:block min-w-[190px] max-w-[240px]">
                <LocationSelector variant="desktop" />
              </div>
            )}

            {!isPortalUser && (
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl mx-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  aria-label="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isFresh ? 'Search fresh vegetables, fruits & groceries' : 'Search for dishes, restaurants & cravings'}
                  className="fc-input pl-10 pr-4 py-2.5 text-sm bg-gray-50 border-gray-300"
                />
              </form>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              {isPortalUser && (
                <Link to={portalDashboardUrl} className="hidden sm:inline-flex fc-btn fc-btn-soft py-2 px-3 text-xs">
                  {isVendor ? <LayoutGrid className="w-4 h-4" /> : isDelivery ? <Truck className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                  Dashboard
                </Link>
              )}

              {!isPortalUser && (
                <button
                  onClick={() => navigate('/cart')}
                  className="hidden sm:flex relative items-center gap-2 p-2.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50"
                  aria-label="Cart"
                >
                  <ShoppingBag className="w-5 h-5 text-gray-700" />
                  <span className="hidden sm:block text-xs font-semibold text-gray-700">Cart</span>
                  {itemCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{itemCount}</span>}
                </button>
              )}

              {user ? (
                <div className="relative">
                  <button onClick={() => setProfileOpen(!profileOpen)} className="hidden md:flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50" aria-expanded={profileOpen}>
                    <img src={getUniversalProfileIcon(user.avatar)} alt={user.name || 'Profile'} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                    <span className="hidden md:block max-w-[100px] truncate text-xs font-semibold text-gray-700">{user.name || user.fullName || 'Account'}</span>
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/60">
                        <div className="font-bold text-sm text-gray-900 truncate">{user.name || user.fullName || 'Account'}</div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">{user.email}</div>
                      </div>
                      <div className="p-2 space-y-0.5">
                        {isDelivery && (
                          <>
                            <Link to="/delivery/dashboard?modal=credentials" onClick={() => setProfileOpen(false)} className="block px-3 py-2 rounded-lg text-xs font-bold text-cyan-800 hover:bg-cyan-50 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-cyan-600" /> My Details & Credentials
                            </Link>
                            <Link to="/delivery/dashboard?modal=history" onClick={() => setProfileOpen(false)} className="block px-3 py-2 rounded-lg text-xs font-bold text-cyan-800 hover:bg-cyan-50 flex items-center gap-2">
                              <History className="w-4 h-4 text-cyan-600" /> Earnings & History
                            </Link>
                            <div className="my-1 border-t border-gray-100" />
                          </>
                        )}
                        <Link to="/search" onClick={() => setProfileOpen(false)} className="block px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2"><Search className="w-4 h-4 text-gray-500" />Shop / Search</Link>
                        <Link to="/orders" onClick={() => setProfileOpen(false)} className="block px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2"><Receipt className="w-4 h-4 text-gray-500" />My Orders</Link>
                        <Link to="/profile" onClick={() => setProfileOpen(false)} className="block px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2"><User className="w-4 h-4 text-gray-500" />Account Profile</Link>
                        {isPortalUser && <Link to={portalDashboardUrl} onClick={() => setProfileOpen(false)} className="block px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-gray-500" />Dashboard</Link>}
                        <button onClick={() => { setProfileOpen(false); logout(); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 mt-1 pt-2"><LogOut className="w-4 h-4 text-red-600" />Sign Out</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="hidden sm:inline-flex fc-btn fc-btn-primary py-2 px-3 text-xs">Sign In</Link>
              )}

              {/* Mobile Hamburger Menu Button on the Right End */}
              <button className="lg:hidden p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-6 pt-4 mt-4 border-t border-gray-200">
            {!isPortalUser && (
              <div className="relative">
                <button onClick={() => setDeptOpen(!deptOpen)} className="fc-btn fc-btn-primary py-2 px-4 text-xs" type="button">
                  <LayoutGrid className="w-4 h-4" /> All Departments <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {deptOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                    {(isFresh ? ['Fruits & Vegetables','Dairy, Bread & Eggs','Atta, Rice & Dal','Oils & Ghee','Snacks & Munchies','Cleaning Essentials'] : ['Biryani','Pizza','Burgers','Momos','North Indian','Sweets']).map(cat => (
                      <button key={cat} onClick={() => goTo(`/search?q=${encodeURIComponent(cat)}`)} className="block w-full text-left px-3 py-2.5 rounded-md text-sm hover:bg-gray-100">{cat}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!isPortalUser && <button onClick={() => goTo('/home')} className={`fc-nav-link ${location.pathname === '/' || location.pathname === '/home' ? 'active' : ''}`}>Home</button>}
            <button onClick={() => goTo('/search')} className="fc-nav-link">Shop</button>
            <button onClick={() => goTo('/orders')} className="fc-nav-link">Orders</button>
            {user && <button onClick={() => goTo('/profile')} className="fc-nav-link">Account</button>}
            {!isPortalUser && (
              <button onClick={toggleVegMode} className={`ml-auto text-xs font-bold px-3 py-1.5 rounded-md border ${isVegOnly ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-300 text-gray-600'}`}>
                {isVegOnly ? '✓ Pure Veg' : 'Pure Veg'}
              </button>
            )}
          </div>

          {isDelivery && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              <Truck className="w-4 h-4 text-cyan-600" />
              <span className="font-semibold">Delivery Fleet Portal</span>
              <span className="truncate">· {riderLocationInfo.addressName || 'Live location'}</span>
            </div>
          )}
        </div>
      </header>

      {!isPortalUser && <div className="lg:hidden border-b border-gray-200 bg-white px-4 py-2"><LocationSelector variant="mobile" /></div>}

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-[310px] max-w-[88vw] bg-white shadow-xl p-5 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <MilegaLogo size="medium" showTagline={false} />
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            {!isPortalUser && <form onSubmit={handleSearchSubmit} className="mb-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search" className="fc-input pl-10" /></form>}
            
            {!isPortalUser && (
              <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" /> Saved Address
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
                    <div className="text-[11px] text-gray-400 truncate">
                      {[activeSavedAddress.city, activeSavedAddress.pincode].filter(Boolean).join(' - ')}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setMobileOpen(false); setShowAddressModal(true); }} className="text-xs text-gray-600 hover:text-gray-900 w-full text-left py-1">
                    + Add delivery location
                  </button>
                )}
              </div>
            )}

            <div className="space-y-1">
              {isDelivery && (
                <>
                  <button onClick={() => goTo('/delivery/dashboard?modal=credentials')} className="w-full text-left px-3 py-2.5 rounded-md hover:bg-cyan-50 text-cyan-800 font-bold text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-600" /> My Details & Credentials
                  </button>
                  <button onClick={() => goTo('/delivery/dashboard?modal=history')} className="w-full text-left px-3 py-2.5 rounded-md hover:bg-cyan-50 text-cyan-800 font-bold text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-600" /> Earnings & History
                  </button>
                  <div className="my-1 border-t border-gray-200" />
                </>
              )}
              {!isPortalUser && <button onClick={() => goTo('/home')} className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm">Home</button>}
              <button onClick={() => goTo('/search')} className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2"><Search className="w-4 h-4 text-gray-500" />Shop & Search</button>
              {user && <button onClick={() => goTo('/orders')} className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2"><Receipt className="w-4 h-4 text-gray-500" />Orders</button>}
              {user && <button onClick={() => goTo('/profile')} className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2"><User className="w-4 h-4 text-gray-500" />Account Profile</button>}
              {isPortalUser && <button onClick={() => goTo(portalDashboardUrl)} className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-gray-600" />Dashboard</button>}
              <button onClick={() => { setMobileOpen(false); setShowAddressModal(true); }} className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-600" />Manage Saved Addresses</button>
              
              {user ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                    toast.success('Logged out successfully');
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-red-50 text-red-600 font-semibold text-sm flex items-center gap-2 mt-4 border-t border-gray-200 pt-4"
                >
                  <LogOut className="w-4 h-4 text-red-600" /> Sign Out / Logout
                </button>
              ) : (
                <button
                  onClick={() => goTo('/login')}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-emerald-50 text-emerald-700 font-semibold text-sm flex items-center gap-2 mt-4 border-t border-gray-200 pt-4"
                >
                  <User className="w-4 h-4 text-emerald-600" /> Sign In / Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
