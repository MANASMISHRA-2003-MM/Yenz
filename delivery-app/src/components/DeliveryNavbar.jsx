import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MilegaLogo from './MilegaLogo';
import {
  Truck, Menu, X, FileText, History, Search, Receipt,
  User, LayoutGrid, MapPin, LogOut, Navigation, Volume2, Download
} from 'lucide-react';
import { unlockAudio, playCashRegisterSound, triggerHaptics } from '../utils/alertSound';
import { toast } from 'sonner';

export default function DeliveryNavbar({ isOnline = true, hasActiveTrip = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
    } catch {
      return { coords: null, addressName: '' };
    }
  });

  useEffect(() => {
    const handleLocChange = (e) => {
      if (e?.detail) {
        setRiderLocationInfo(prev => ({
          coords: (e.detail.lat && e.detail.lng) ? { lat: e.detail.lat, lng: e.detail.lng } : prev.coords,
          addressName: e.detail.addressName || prev.addressName
        }));
      }
    };
    window.addEventListener('milega_rider_location_changed', handleLocChange);
    return () => window.removeEventListener('milega_rider_location_changed', handleLocChange);
  }, []);

  const handleTestAudio = () => {
    unlockAudio();
    playCashRegisterSound();
    triggerHaptics();
    toast.success('🔔 Cash register alarm chime & rider vibration tested successfully!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const goTo = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      <header className="fc-navbar bg-white border-b border-gray-200 sticky top-0 z-50">
        {/* Desktop Topbar */}
        <div className="fc-topbar hidden lg:block border-b border-gray-100 bg-gray-50 text-gray-600">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-[11px] font-medium">
            <span>Free delivery on eligible orders · Fresh, local & fast</span>
            <div className="flex items-center gap-4">
              <span>Support</span>
              <a
                href="/downloads/yenz-app.apk"
                download="Yenz-App.apk"
                onClick={() => {
                  try { toast.info('Downloading Yenz Android App APK...'); } catch {}
                }}
                className="hover:underline flex items-center gap-1 font-bold text-emerald-700 cursor-pointer"
              >
                <Download className="w-3 h-3" /> Download App (APK)
              </a>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 justify-between">
            <Link to="/delivery/dashboard" className="flex-shrink-0">
              <MilegaLogo size="medium" showTagline={false} />
            </Link>

            {/* Desktop Quick Controls */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestAudio}
                title="Test Sound Alarm & Vibration"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>Test Alarm</span>
              </button>

              <Link
                to="/delivery/active-trip"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                  location.pathname.includes('/active-trip')
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : hasActiveTrip
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold animate-pulse'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                <span>Active Trip</span>
              </Link>

              <button
                onClick={() => navigate('/delivery/dashboard?modal=credentials')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 rounded-lg border border-cyan-200 transition"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-600" />
                <span>Credentials</span>
              </button>

              <button
                onClick={() => navigate('/delivery/dashboard?modal=history')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 rounded-lg border border-cyan-200 transition"
              >
                <History className="w-3.5 h-3.5 text-cyan-600" />
                <span>History</span>
              </button>
            </div>

            {/* Mobile Hamburger menu toggle button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                aria-label="Open navigation menu"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Sub-bar: Delivery Fleet Portal · Location (Matches Screenshots 2, 3, 4, 5 Exactly) */}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
            <Truck className="w-4 h-4 text-cyan-600 flex-shrink-0" />
            <span className="font-semibold flex-shrink-0">Delivery Fleet Portal</span>
            <span className="truncate">· {riderLocationInfo.addressName || 'Live location'}</span>
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Drawer (Matches Screenshot 1 Exactly) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-[310px] max-w-[88vw] bg-white shadow-2xl p-5 overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <MilegaLogo size="medium" showTagline={false} />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Primary Delivery Action Shortcuts */}
            <div className="space-y-2 mb-3">
              <button
                onClick={() => goTo('/delivery/dashboard?modal=credentials')}
                className="w-full text-left px-3.5 py-2.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 font-bold text-sm flex items-center gap-2.5 transition border border-emerald-100"
              >
                <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>My Details & Credentials</span>
              </button>

              <button
                onClick={() => goTo('/delivery/dashboard?modal=history')}
                className="w-full text-left px-3.5 py-2.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-900 font-bold text-sm flex items-center gap-2.5 transition border border-emerald-100"
              >
                <History className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Earnings & History</span>
              </button>
            </div>

            <div className="my-1 border-t border-gray-100" />

            {/* Navigation List */}
            <div className="space-y-1 py-2 flex-1">
              <button
                onClick={() => goTo('/delivery/dashboard')}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2.5 text-gray-700 transition"
              >
                <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>Shop & Search</span>
              </button>

              <button
                onClick={() => goTo('/delivery/history')}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2.5 text-gray-700 transition"
              >
                <Receipt className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>Orders</span>
              </button>

              <button
                onClick={() => goTo('/delivery/dashboard?modal=credentials')}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2.5 text-gray-700 transition"
              >
                <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>Account Profile</span>
              </button>

              <button
                onClick={() => goTo('/delivery/dashboard')}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2.5 text-gray-700 transition"
              >
                <LayoutGrid className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => goTo('/delivery/active-trip')}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2.5 text-gray-700 transition"
              >
                <Navigation className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span>Active Trip Navigation</span>
              </button>

              <button
                onClick={() => {
                  setMobileOpen(false);
                  toast.info('Delivery partner live GPS active');
                }}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-100 font-semibold text-sm flex items-center gap-2.5 text-gray-700 transition"
              >
                <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span>Manage Saved Addresses</span>
              </button>
            </div>

            {/* Logout button at bottom */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2.5 rounded-md hover:bg-red-50 text-red-600 font-semibold text-sm flex items-center gap-2.5 transition"
              >
                <LogOut className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>Sign Out / Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
