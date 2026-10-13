import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, ArrowRight, UserPlus } from 'lucide-react';
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
    const raw = (formData.phone || '').trim();
    if (!raw || raw.replace(/\D/g, '').length < 10) {
      const msg = 'Mobile Phone Number is strictly required. Please enter a valid 10-digit mobile number to proceed.';
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      await register({ ...formData, role: 'consumer' });
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

  const input = (label, key, placeholder, type = 'text', required = true) => (
    <div>
      <label className="fc-eyebrow block mb-1.5 text-xs text-gray-600 font-bold uppercase tracking-wider">
        {label}
        {key === 'phone' && <span className="text-red-500 normal-case ml-1 font-semibold">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={formData[key]}
        onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
        placeholder={placeholder}
        className="fc-input rounded-xl text-sm"
      />
    </div>
  );

  return (
    <div className="fc-page flex min-h-screen flex-col bg-gray-50/50 safe-top safe-bottom">
      <div className="flex-1 py-8 sm:py-12">
        <div className="fc-container">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <Link to="/" className="inline-flex"><MilegaLogo size="large" /></Link>
              <h1 className="mt-3 text-2xl font-bold text-gray-900">Create Customer Account</h1>
              <p className="mt-1 text-sm text-gray-500">Order fresh dishes, groceries and daily essentials</p>
            </div>

            <form onSubmit={handleSubmit} className="fc-card p-6 sm:p-8 bg-white shadow-md border border-gray-100 rounded-3xl space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              {input('Full Name', 'name', 'Aarav Sharma')}
              {input('Email Address', 'email', 'aarav@example.com', 'email')}
              {input('Mobile Phone Number', 'phone', '+91 98765 43210', 'tel')}
              {input('Password', 'password', '••••••••', 'password')}

              <button
                disabled={loading}
                className="fc-btn fc-btn-primary w-full py-3 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 mt-2"
              >
                {loading ? 'Creating Account...' : 'Complete Customer Registration'}
                <UserPlus className="w-4 h-4 ml-1" />
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-100 text-center py-4 text-xs text-gray-400">
        Milega Food Customer App
      </div>
    </div>
  );
}
