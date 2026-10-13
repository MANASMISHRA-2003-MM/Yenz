import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MilegaLogo from './MilegaLogo';
import { Store, Volume2, LogOut, Settings, History, ClipboardList, ShieldCheck } from 'lucide-react';
import { unlockAudio, playCashRegisterSound, triggerHaptics } from '../utils/alertSound';
import { toast } from 'sonner';

export default function VendorNavbar({ restaurant, isOpen, onToggleStatus, togglingStatus }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleTestAudio = () => {
    unlockAudio();
    playCashRegisterSound();
    triggerHaptics();
    toast.success('🔔 Cash register alarm sound & mobile vibration tested successfully!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('Signed out of vendor portal');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo & Store Pill */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/vendor/dashboard" className="shrink-0 flex items-center">
              <MilegaLogo size="small" />
            </Link>

            {restaurant && (
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 min-w-0">
                <span className="text-xs font-black text-slate-800 truncate max-w-[180px]">
                  {restaurant.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isOpen
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isOpen ? 'Online' : 'Closed'}
                </span>
              </div>
            )}
          </div>

          {/* Nav Actions */}
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

            {/* Orders Pipeline Shortcut */}
            <Link
              to="/vendor/dashboard"
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                location.pathname === '/vendor/dashboard'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">Orders</span>
            </Link>

            {/* History Shortcut */}
            <Link
              to="/orders"
              className={`p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                location.pathname === '/orders'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </Link>

            {/* Settings & Profile */}
            <Link
              to="/settings"
              title="Vendor & Network Settings"
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
