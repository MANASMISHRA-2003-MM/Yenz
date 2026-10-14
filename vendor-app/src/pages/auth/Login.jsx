import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Store, ArrowRight, Lock, Sparkles } from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const { login, demoSwitchRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password, 'vendor');
      toast.success(`Welcome back, ${res.user?.name || res.user?.fullName || 'Store Partner'}!`);
      navigate('/vendor/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoVendorLogin = async () => {
    setDemoLoading(true);
    setError('');
    try {
      const user = await demoSwitchRole('vendor');
      if (user) {
        toast.success(`Logged in as Demo Vendor (${user.name || user.fullName})!`);
        navigate('/vendor/dashboard');
      }
    } catch (err) {
      toast.error('Demo vendor login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] safe-top safe-bottom">
      <div className="flex-1 flex items-center py-8 sm:py-14">
        <div className="fc-container">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <Link to="/login" className="inline-flex">
                <MilegaLogo size="large" />
              </Link>
              <p className="mt-2 text-sm text-slate-500 font-medium">Store & Kitchen Partner Portal</p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="fc-card p-6 sm:p-8 bg-white shadow-soft border border-slate-200 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">Vendor Sign In</h1>
                  <p className="mt-1 text-xs text-slate-500 font-medium">
                    Manage incoming orders & kitchen inventory
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Store className="w-5 h-5" />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              <label className="fc-label">Vendor Email Address</label>
              <input
                className="fc-input mb-4 text-sm"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store@example.com"
                required
              />

              <label className="fc-label">Password</label>
              <input
                className="fc-input mb-5 text-sm"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <button
                type="submit"
                disabled={loading || demoLoading}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Store Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                  <span className="bg-white px-2">Quick Testing</span>
                </div>
              </div>

              {/* Instant Demo Vendor Access Button */}
              <button
                type="button"
                onClick={handleDemoVendorLogin}
                disabled={loading || demoLoading}
                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{demoLoading ? 'Logging In...' : 'Quick 1-Tap Demo Vendor Login'}</span>
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6 font-medium">
              Want to partner with Milega?{' '}
              <Link to="/register" className="font-extrabold text-emerald-600 hover:underline">
                Register Store Account
              </Link>
            </p>

          </div>
        </div>
      </div>
      <div className="text-center py-4 text-xs text-slate-400 font-medium">
        Milega Food · Vendor Android Application
      </div>
    </div>
  );
}
