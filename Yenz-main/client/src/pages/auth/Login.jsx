import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Store, Bike, ArrowRight, Lock } from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { toast } from 'sonner';

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
      toast.success(`Welcome back, ${res.user?.name || res.user?.fullName || 'User'}!`);
      if (userRole === 'admin') navigate('/admin/dashboard');
      else if (userRole === 'vendor') navigate('/vendor/dashboard');
      else if (userRole === 'delivery_partner') navigate('/delivery/dashboard');
      else navigate('/home');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    ['consumer', 'Customer', User],
    ['vendor', 'Vendor', Store],
    ['delivery_partner', 'Delivery', Bike]
  ];

  return (
    <div className="fc-page flex min-h-screen flex-col">
      <div className="flex-1 flex items-center py-10 sm:py-16">
        <div className="fc-container">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-7">
              <Link to="/" className="inline-flex"><MilegaLogo size="large" /></Link>
              <p className="mt-3 text-sm text-gray-500">Sign in to continue to your Milega experience</p>
            </div>
            <form onSubmit={handleSubmit} className="fc-card p-6 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
                  <p className="mt-1 text-xs text-gray-500">Use your account credentials</p>
                </div>
                <div className="w-10 h-10 rounded-md bg-green-50 text-green-600 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-semibold">
                  {error}
                </div>
              )}

              <div className="mb-5">
                <label className="fc-eyebrow block mb-2">Login as</label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map(([id, label, Icon]) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setRole(id)}
                      className={`p-2.5 rounded-md border text-center transition ${
                        role === id ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-[10px] font-bold block truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="fc-eyebrow block mb-2">Email address</label>
              <input
                className="fc-input mb-4"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />

              <label className="fc-eyebrow block mb-2">Password</label>
              <input
                className="fc-input mb-5"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <button disabled={loading} className="fc-btn fc-btn-primary w-full">
                {loading ? 'Authenticating...' : 'Sign in to account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Don't have an account? <Link to="/register" className="font-semibold text-green-600 hover:underline">Create one</Link>
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 text-center py-4 text-xs text-gray-500">
        Milega Food · Local food and fresh essentials
      </div>
    </div>
  );
}
