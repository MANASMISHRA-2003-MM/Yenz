import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Flame, ArrowRight, User, Store, Bike } from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { toast } from 'sonner';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'consumer'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const rawPhone = (formData.phone || '').trim();
    const digitsOnly = rawPhone.replace(/\D/g, '');
    if (!rawPhone || digitsOnly.length < 10) {
      const msg = 'Mobile Phone Number is strictly required. Please enter a valid 10-digit mobile number to proceed.';
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      await register(formData);
      toast.success('Account created successfully! Welcome to Milega Food.');
      navigate('/home');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'consumer', label: 'Customer', icon: User },
    { id: 'vendor', label: 'Vendor / Shop', icon: Store },
    { id: 'delivery_partner', label: 'Delivery Partner', icon: Bike }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center justify-center focus:outline-none mb-1 hover:opacity-95 transition-opacity">
            <MilegaLogo size="large" />
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Account</h1>
          <p className="text-xs text-slate-500 font-medium">Join Milega Food Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">{error}</div>}

          {/* 3 Role Options (Excluding Admin) */}
          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-2">Select Registration Role</label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => {
                const Icon = r.icon;
                const active = formData.role === r.id;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setFormData({ ...formData, role: r.id })}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-[11px] font-extrabold border transition ${
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
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Aarav Sharma"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="aarav@example.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">
              Mobile Phone Number <span className="text-rose-600 font-bold">* (Required)</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-brand-500"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">This number will be displayed on your profile and used for order delivery coordination.</p>
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-700 block mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
            {loading ? 'Registering...' : 'Complete Registration'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 font-medium">
          Already registered?{' '}
          <Link to="/login" className="text-brand-600 font-extrabold hover:underline">
            Sign In Here
          </Link>
        </p>

      </div>
    </div>
  );
}
