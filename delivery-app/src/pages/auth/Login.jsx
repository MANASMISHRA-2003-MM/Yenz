import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bike, ArrowRight, Lock, Sparkles, Wifi } from 'lucide-react';
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
      const res = await login(email, password, 'delivery_partner');
      toast.success(`Welcome back, ${res.user?.fullName || res.user?.name || 'Rider'}!`);
      navigate('/delivery/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRiderLogin = async () => {
    setDemoLoading(true);
    setError('');
    try {
      const user = await demoSwitchRole('delivery_partner');
      if (user) {
        toast.success(`Logged in as Delivery Partner (${user.fullName || user.name})!`);
        navigate('/delivery/dashboard');
      }
    } catch (err) {
      toast.error('Demo rider login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] safe-top safe-bottom">
      <div className="flex-1 flex items-center py-8 sm:py-14">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="text-center mb-6">
            <Link to="/login" className="inline-flex">
              <MilegaLogo size="large" />
            </Link>
            <p className="mt-2 text-sm text-slate-500 font-medium">Delivery Partner & Rider Portal</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 bg-white shadow-soft border border-slate-200 rounded-3xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Rider Sign In</h1>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Deliver food, earn payouts & track live trips
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
                <Bike className="w-5 h-5" />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Rider Email Address
              </label>
              <input
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rider@example.com"
                required
              />
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 mb-0">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-cyan-600 font-bold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In as Delivery Partner'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400">
                <span className="bg-white px-2">Instant Verification</span>
              </div>
            </div>

            {/* Quick 1-Tap Demo Rider Login */}
            <button
              type="button"
              onClick={handleDemoRiderLogin}
              disabled={loading || demoLoading}
              className="w-full py-3 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span>{demoLoading ? 'Connecting...' : 'Quick 1-Tap Demo Rider Login'}</span>
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6 font-medium">
            New to Milega Delivery?{' '}
            <Link to="/register" className="font-extrabold text-cyan-600 hover:underline">
              Join as Delivery Partner
            </Link>
          </p>
        </div>
      </div>
      <div className="text-center py-4 text-xs text-slate-400 font-medium">
        Milega Delivery · Android Partner Application
      </div>
    </div>
  );
}
