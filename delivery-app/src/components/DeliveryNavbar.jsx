import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MilegaLogo from './MilegaLogo';
import { Bike, Volume2, LogOut, Settings, History, Navigation, Radio } from 'lucide-react';
import { unlockAudio, playCashRegisterSound, triggerHaptics } from '../utils/alertSound';
import { toast } from 'sonner';

export default function DeliveryNavbar({ isOnline, hasActiveTrip }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleTestAudio = () => {
    unlockAudio();
    playCashRegisterSound();
    triggerHaptics();
    toast.success('🔔 Cash register alarm chime & rider vibration tested successfully!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('Signed out of delivery partner console');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo & Rider Status */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/delivery/dashboard" className="shrink-0 flex items-center">
              <MilegaLogo size="small" />
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 min-w-0">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* Action Shortcuts */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Alarm Test Trigger */}
            <button
              type="button"
              onClick={handleTestAudio}
              title="Test Sound Alarm & Vibration"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
            >
              <Volume2 className="w-4 h-4 text-amber-600 animate-pulse" />
              <span className="hidden md:inline">Test Alarm</span>
            </button>

            {/* Active Trip Shortcut Button */}
            <Link
              to="/delivery/active-trip"
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                location.pathname.includes('/active-trip')
                  ? 'bg-sky-600 text-white'
                  : hasActiveTrip
                  ? 'bg-sky-50 text-sky-700 border border-sky-300 animate-pulse font-extrabold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">Active Trip</span>
            </Link>

            {/* History Shortcut */}
            <Link
              to="/delivery/history"
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                location.pathname.includes('/history') || location.pathname === '/orders' || location.pathname === '/trips'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Trips</span>
            </Link>

            {/* Settings & Profile */}
            <Link
              to="/settings"
              title="Rider Profile & Settings"
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                location.pathname === '/settings'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
