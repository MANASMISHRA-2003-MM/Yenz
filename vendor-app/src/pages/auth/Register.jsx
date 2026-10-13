import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Store, ArrowRight, UserPlus } from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { toast } from 'sonner';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'vendor'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const raw = (formData.phone || '').trim();
    if (!raw || raw.replace(/\D/g, '').length < 10) {
      const msg = 'Mobile Phone Number is strictly required. Please enter a valid 10-digit mobile number.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      await register({ ...formData, role: 'vendor' });
      toast.success('Vendor account created successfully! Proceeding to store onboarding.');
      navigate('/vendor/onboarding');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const input = (label, key, placeholder, type = 'text', required = true) => (
    <div>
      <label className="fc-label">
        {label}
        {key === 'phone' && <span className="text-rose-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={formData[key]}
        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
        placeholder={placeholder}
        className="fc-input text-sm"
      />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] safe-top safe-bottom">
      <div className="flex-1 py-8 sm:py-12">
        <div className="fc-container">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <Link to="/login" className="inline-flex">
                <MilegaLogo size="large" />
              </Link>
              <h1 className="mt-3 text-2xl font-black text-slate-900">Create Vendor Account</h1>
              <p className="mt-1 text-sm text-slate-500 font-medium">
                Register as a restaurant or grocery store partner
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="fc-card p-6 sm:p-8 bg-white shadow-soft border border-slate-200 rounded-3xl space-y-4"
            >
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              {input('Store Owner / Manager Name', 'name', 'Aarav Sharma')}
              {input('Business Email Address', 'email', 'store@example.com', 'email')}
              {input('Store Mobile Phone Number', 'phone', '+91 98765 43210', 'tel')}
              {input('Account Password', 'password', '••••••••', 'password')}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {loading ? 'Creating Vendor Account...' : 'Continue to Store Verification'}
                <UserPlus className="w-4 h-4" />
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6 font-medium">
              Already have a vendor account?{' '}
              <Link to="/login" className="font-extrabold text-emerald-600 hover:underline">
                Sign in
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
