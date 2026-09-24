import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Flame, User, Store, Bike, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, demoSwitchRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role, path) => {
    setLoading(true);
    await demoSwitchRole(role);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-brand-500 to-rose-600 shadow-md shadow-brand-500/20">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">KRAWING</h1>
          <p className="text-xs text-slate-500 font-medium">Hyperlocal Food Delivery Ecosystem</p>
        </div>

        {/* Quick Demo One-Click Access Box */}
        <div className="bg-white p-5 rounded-3xl border border-brand-200 space-y-3 shadow-soft">
          <p className="text-[11px] font-extrabold text-brand-600 uppercase tracking-wider text-center">⚡ Instant 1-Click Demo Login</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickDemoLogin('consumer', '/home')}
              className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left text-xs font-bold text-emerald-800 flex items-center gap-1.5 transition"
            >
              <User className="w-3.5 h-3.5" /> Consumer
            </button>
            <button
              onClick={() => handleQuickDemoLogin('vendor', '/vendor/dashboard')}
              className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left text-xs font-bold text-amber-800 flex items-center gap-1.5 transition"
            >
              <Store className="w-3.5 h-3.5" /> Vendor
            </button>
            <button
              onClick={() => handleQuickDemoLogin('delivery_partner', '/delivery/dashboard')}
              className="p-2.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-xl text-left text-xs font-bold text-cyan-800 flex items-center gap-1.5 transition"
            >
              <Bike className="w-3.5 h-3.5" /> Driver
            </button>
            <button
              onClick={() => handleQuickDemoLogin('admin', '/admin/dashboard')}
              className="p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left text-xs font-bold text-purple-800 flex items-center gap-1.5 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Admin
            </button>
          </div>
        </div>

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">{error}</div>}

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aarav@krawing.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-brand-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 font-medium">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-600 font-extrabold hover:underline">
            Register Here
          </Link>
        </p>

      </div>
    </div>
  );
}
