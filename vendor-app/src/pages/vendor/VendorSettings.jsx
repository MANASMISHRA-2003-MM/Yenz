import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import VendorNavbar from '../../components/VendorNavbar';
import VendorBottomNav from '../../components/VendorBottomNav';
import {
  Settings,
  Volume2,
  LogOut,
  Store
} from 'lucide-react';
import { unlockAudio, playCashRegisterSound, triggerHaptics } from '../../utils/alertSound';
import { toast } from 'sonner';

export default function VendorSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(null);

  useEffect(() => {
    fetchStoreInfo();
  }, []);

  const fetchStoreInfo = async () => {
    try {
      const res = await API.get('/restaurants/vendor/me');
      if (res.data?.success && res.data?.restaurant) {
        setRestaurant(res.data.restaurant);
      }
    } catch (e) {}
  };



  const handleTestAudio = () => {
    unlockAudio();
    playCashRegisterSound();
    triggerHaptics();
    toast.success('🔔 Cash register alarm sound & phone vibration triggered!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info('Signed out');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-28">
      <VendorNavbar restaurant={restaurant} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            Vendor App Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage your store connection, live alarm alerts, and partner account.
          </p>
        </div>

        {/* Store & Account Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm">
                {restaurant?.name || 'Store Account'}
              </h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Owner Name</span>
              <strong className="text-slate-800">{user?.name || user?.fullName || 'Vendor Owner'}</strong>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Partner Role</span>
              <strong className="text-emerald-700 uppercase">VENDOR</strong>
            </div>
            {restaurant && (
              <>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                  <strong className="text-slate-800">{restaurant.vendorType || 'CRAVINGS'}</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">City / Pincode</span>
                  <strong className="text-slate-800">{restaurant.city} ({restaurant.pincode || '121009'})</strong>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Real-time Order Alerts & Haptics Testing */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm">Real-Time Kitchen Sound & Haptics</h2>
              <p className="text-xs text-slate-500 font-medium">Verify that the device sounds an alarm for incoming orders</p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            When a customer places an order, the vendor app rings continuously with a loud cash-register chime and native phone vibration until you tap Accept or Reject.
          </p>

          <button
            type="button"
            onClick={handleTestAudio}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>Test Sound Alarm & Haptic Vibration Now</span>
          </button>
        </div>

        {/* Sign Out Button */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full py-3.5 rounded-2xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Vendor App</span>
          </button>
        </div>
      </main>

      <VendorBottomNav />
    </div>
  );
}
