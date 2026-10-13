import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API, { getBackendBaseUrl, setCustomBackendBaseUrl } from '../../services/api';
import VendorNavbar from '../../components/VendorNavbar';
import VendorBottomNav from '../../components/VendorBottomNav';
import {
  Settings,
  Server,
  Wifi,
  Volume2,
  LogOut,
  User,
  Store,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  ShieldCheck
} from 'lucide-react';
import { unlockAudio, playCashRegisterSound, triggerHaptics } from '../../utils/alertSound';
import { toast } from 'sonner';

export default function VendorSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [backendUrlInput, setBackendUrlInput] = useState('');
  const [currentResolvedUrl, setCurrentResolvedUrl] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [restaurant, setRestaurant] = useState(null);

  useEffect(() => {
    const current = getBackendBaseUrl();
    setCurrentResolvedUrl(current || window.location.origin);
    const savedCustom =
      localStorage.getItem('milega_vendor_custom_backend_url') ||
      localStorage.getItem('krawing_custom_backend_url') ||
      '';
    setBackendUrlInput(savedCustom || current || 'http://192.168.1.7:5000');

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

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const startTime = Date.now();
    try {
      const base = (backendUrlInput || currentResolvedUrl).replace(/\/$/, '');
      const testUrl = base ? `${base}/health` : '/health';
      const res = await fetch(testUrl, { method: 'GET', cache: 'no-cache' });
      const elapsed = Date.now() - startTime;
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        setTestResult({
          success: true,
          status: res.status,
          latency: elapsed,
          data: json
        });
        toast.success(`Connected to backend server in ${elapsed}ms!`);
      } else {
        setTestResult({
          success: false,
          status: res.status,
          latency: elapsed
        });
        toast.error(`Server returned status code: ${res.status}`);
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message
      });
      toast.error(`Connection failed: ${err.message}. Check Wi-Fi & PC IP.`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveBackendUrl = () => {
    setCustomBackendBaseUrl(backendUrlInput);
    setCurrentResolvedUrl(getBackendBaseUrl());
    toast.success('Custom backend URL saved! Reloading application services...');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleResetDefaultUrl = () => {
    setCustomBackendBaseUrl('');
    setBackendUrlInput('http://192.168.1.7:5000');
    setCurrentResolvedUrl(getBackendBaseUrl());
    toast.info('Reset to default backend configuration');
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

        {/* Backend & Android Network Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-sm">Server & Network Configuration</h2>
              <p className="text-xs text-slate-500 font-medium">Manage the backend API connection for your Android device</p>
            </div>
          </div>

          <div className="text-xs space-y-1">
            <span className="text-slate-500 font-medium">Currently active API Base URL:</span>
            <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto">
              {currentResolvedUrl || 'Relative /api (Vite Proxy)'}
            </div>
          </div>

          <div>
            <label className="fc-label">Configure Custom Backend URL / LAN IP</label>
            <input
              type="text"
              value={backendUrlInput}
              onChange={(e) => setBackendUrlInput(e.target.value)}
              placeholder="http://192.168.1.7:5000"
              className="fc-input text-xs font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              For real Android phone testing, use your laptop's Wi-Fi / Ethernet LAN IP: port 5000.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {testingConnection ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
              <span>{testingConnection ? 'Testing...' : 'Ping / Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveBackendUrl}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Apply</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaultUrl}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              Reset Default
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-black">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>
                  {testResult.success
                    ? `Connected Successfully (Latency: ${testResult.latency}ms)`
                    : 'Backend Connection Failed'}
                </span>
              </div>
              {testResult.data && (
                <p className="text-[11px] font-mono opacity-90 truncate">
                  Service: {testResult.data.service} • DB: {testResult.data.database}
                </p>
              )}
              {testResult.error && (
                <p className="text-[11px] font-mono text-rose-700">{testResult.error}</p>
              )}
            </div>
          )}
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
