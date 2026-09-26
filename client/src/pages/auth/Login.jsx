import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Flame, ArrowRight, User, Store, Bike, Shield, Sparkles } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('any');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password, role);
      const userRole = (res.user?.role || 'consumer').toLowerCase();
      
      if (userRole === 'admin') {
        navigate('/admin/dashboard');
      } else if (userRole === 'vendor') {
        navigate('/vendor/dashboard');
      } else if (userRole === 'delivery_partner') {
        navigate('/delivery/dashboard');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'any', label: 'Auto-Detect', icon: Sparkles },
    { id: 'consumer', label: 'Customer', icon: User },
    { id: 'vendor', label: 'Vendor', icon: Store },
    { id: 'delivery_partner', label: 'Delivery', icon: Bike },
    { id: 'admin', label: 'Admin', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-brand-500 to-rose-600 shadow-md shadow-brand-500/20">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">KRAWING</h1>
          <p className="text-xs text-slate-500 font-medium">Sign in to your account</p>
        </div>

        {/* Standard Login Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">{error}</div>}

          {/* 4 Types Role Selection at Login */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-2">Select Login Role</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {roles.map((r) => {
                const Icon = r.icon;
                const active = role === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-extrabold border transition ${
                      active
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="truncate w-full text-center">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
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
