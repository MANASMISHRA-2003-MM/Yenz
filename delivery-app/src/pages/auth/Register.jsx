import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bike, ArrowRight, ShieldCheck } from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { toast } from 'sonner';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState('BIKE');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        fullName,
        email,
        phone,
        password,
        role: 'DELIVERY_PARTNER',
        vehicleType
      });
      toast.success('Rider account created! Proceed with onboarding documents.');
      navigate('/delivery/onboarding');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
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
            <p className="mt-2 text-sm text-slate-500 font-medium">Earn with Every Delivery in Your City</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 bg-white shadow-soft border border-slate-200 rounded-3xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Join as Rider</h1>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Register your vehicle & start taking orders
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

            <div className="mb-3.5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Kumar"
                required
              />
            </div>

            <div className="mb-3.5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@example.com"
                required
              />
            </div>

            <div className="mb-3.5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                required
              />
            </div>

            <div className="mb-3.5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vehicle Type
              </label>
              <select
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="BIKE">Motorcycle / Bike</option>
                <option value="SCOOTER">Electric Scooter / Scooty</option>
                <option value="BICYCLE">Bicycle</option>
              </select>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <input
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Continue to Rider Onboarding'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6 font-medium">
            Already registered?{' '}
            <Link to="/login" className="font-extrabold text-cyan-600 hover:underline">
              Sign In to Your Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
