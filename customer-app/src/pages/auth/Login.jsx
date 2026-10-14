import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Lock, User } from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password, 'consumer');
      toast.success(`Welcome back, ${res.user?.name || res.user?.fullName || 'Customer'}!`);
      navigate('/home');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fc-page flex min-h-screen flex-col bg-gray-50/50 safe-top safe-bottom">
      <div className="flex-1 flex items-center py-8 sm:py-14">
        <div className="fc-container">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <Link to="/" className="inline-flex"><MilegaLogo size="large" /></Link>
              <p className="mt-2 text-sm text-gray-500 font-medium">Customer Sign In</p>
            </div>
            
            <form onSubmit={handleSubmit} className="fc-card p-6 sm:p-8 bg-white shadow-md border border-gray-100 rounded-3xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
                  <p className="mt-1 text-xs text-gray-500">Access your food & grocery orders</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <User className="w-5 h-5" />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              <label className="fc-eyebrow block mb-1.5 text-xs text-gray-600 font-bold uppercase tracking-wider">
                Email address
              </label>
              <input
                className="fc-input mb-4 rounded-xl text-sm"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />

              <div className="flex items-center justify-between mb-1.5">
                <label className="fc-eyebrow text-xs text-gray-600 font-bold uppercase tracking-wider mb-0">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-emerald-600 font-bold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                className="fc-input mb-5 rounded-xl text-sm"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <button disabled={loading} className="fc-btn fc-btn-primary w-full py-3 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20">
                {loading ? 'Signing in...' : 'Sign in to Account'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              New customer?{' '}
              <Link to="/register" className="font-semibold text-emerald-600 hover:underline">
                Create free account
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="text-center py-4 text-xs text-gray-400">
        Milega Food Customer App
      </div>
    </div>
  );
}
