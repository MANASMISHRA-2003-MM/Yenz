import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import DeliveryNavbar from '../../components/DeliveryNavbar';
import DeliveryBottomNav from '../../components/DeliveryBottomNav';
import {
  User, ShieldCheck, Bike, CreditCard, Bell, Volume2, Wifi,
  LogOut, RefreshCw, CheckCircle, AlertTriangle, ExternalLink,
  Smartphone, FileText, Settings, Key
} from 'lucide-react';
import { toast } from 'sonner';
import {
  playActionSound,
  startRepeatingAlert,
  stopAlertSound,
  playCashRegisterSound
} from '../../utils/alertSound';

export default function DeliverySettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isAlertPlaying, setIsAlertPlaying] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get('/deliveries/dashboard');
      if (res.data.success && res.data.riderProfile) {
        setProfile(res.data.riderProfile);
      }
    } catch (err) {
      console.error('Error fetching rider profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAlertSound = () => {
    if (isAlertPlaying) {
      stopAlertSound();
      setIsAlertPlaying(false);
      toast.info('Alert sound stopped');
    } else {
      startRepeatingAlert();
      setIsAlertPlaying(true);
      toast.info('Playing high-priority order dispatch siren...');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-900">
      <DeliveryNavbar />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shadow-xs">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Rider Settings</h1>
            <p className="text-xs text-slate-500 font-medium">Profile, hardware & sound preferences</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center font-black text-2xl shadow-sm">
              {(profile?.fullName || user?.fullName || 'R')[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 truncate">
                  {profile?.fullName || user?.fullName || 'Delivery Partner'}
                </h2>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {profile?.phone || user?.phone || 'Phone registered'} • {profile?.email || user?.email || 'Email'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
                  ★ {profile?.ratings || 4.8} Rating
                </span>
                <span className="text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 px-2 py-0.5 rounded">
                  Role: DELIVERY_PARTNER
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Bike className="w-3 h-3" /> Vehicle Registered
              </span>
              <p className="font-bold text-slate-800">{profile?.vehicleType || 'Two Wheeler'}</p>
              <p className="text-[11px] font-mono text-slate-500">{profile?.vehicleNumber || 'DL 01 EX 1234'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Driving License
              </span>
              <p className="font-bold text-slate-800">{profile?.dlNumber || 'DL-98203918239'}</p>
              <p className="text-[11px] text-emerald-600 font-medium">Govt. Verified Identity</p>
            </div>
          </div>
        </div>

        {/* Audio & Alert Sirens */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-600" />
            Audio & Order Dispatch Alert Siren
          </h3>
          <p className="text-xs text-slate-500">
            Ensure loud repeating sounds play on your Android device when a new food delivery job is offered.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={handleTestAlertSound}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isAlertPlaying
                  ? 'bg-rose-600 text-white shadow-rose-600/20 shadow-md'
                  : 'bg-cyan-600 text-white shadow-cyan-600/20 shadow-md hover:bg-cyan-700'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              {isAlertPlaying ? 'Stop Siren Test' : 'Test Order Siren'}
            </button>
            <button
              onClick={() => {
                playCashRegisterSound();
                toast.success('Cha-ching! Earnings audio played');
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
            >
              Test Cash Sound
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-black text-xs rounded-2xl transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out from Delivery Partner Account
          </button>
        </div>
      </main>

      <DeliveryBottomNav />
    </div>
  );
}
