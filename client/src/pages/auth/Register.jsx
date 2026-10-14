import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Store, Bike, ArrowRight, UserPlus, ShieldCheck, CheckCircle2 } from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { toast } from 'sonner';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'consumer',
    // Vendor specific compulsory fields
    shopName: '',
    vendorType: 'CRAVINGS', // 'CRAVINGS' | 'FRESH'
    address: '',
    city: 'Noida',
    // Delivery partner specific compulsory fields
    vehicleType: 'Bike',
    vehicleNumber: '',
    dlNumber: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Strict validation for common compulsory fields
    const name = (formData.name || '').trim();
    const email = (formData.email || '').trim();
    const password = (formData.password || '').trim();
    const rawPhone = (formData.phone || '').trim();
    const phoneDigits = rawPhone.replace(/\D/g, '');

    if (!name) {
      const msg = 'Full name is strictly compulsory.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!email || !email.includes('@')) {
      const msg = 'A valid email address is strictly compulsory.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!rawPhone || phoneDigits.length < 10) {
      const msg = 'Mobile phone number (at least 10 digits) is strictly compulsory.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!password || password.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setError(msg);
      toast.error(msg);
      return;
    }

    // Role-specific compulsory validation
    if (formData.role === 'vendor') {
      if (!formData.shopName.trim()) {
        const msg = 'Shop / Store Name is compulsory for vendor registration.';
        setError(msg);
        toast.error(msg);
        return;
      }
      if (!formData.address.trim()) {
        const msg = 'Store Address / Location is compulsory for vendor registration.';
        setError(msg);
        toast.error(msg);
        return;
      }
      if (!formData.city.trim()) {
        const msg = 'Store City is compulsory for vendor registration.';
        setError(msg);
        toast.error(msg);
        return;
      }
    } else if (formData.role === 'delivery_partner') {
      if (!formData.vehicleNumber.trim()) {
        const msg = 'Vehicle Registration Number is compulsory for delivery partners.';
        setError(msg);
        toast.error(msg);
        return;
      }
      if (!formData.dlNumber.trim()) {
        const msg = 'Driving License (DL) Number is compulsory for delivery partners.';
        setError(msg);
        toast.error(msg);
        return;
      }
      if (!formData.address.trim()) {
        const msg = 'Operating Area / Address is compulsory for delivery partners.';
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    setLoading(true);
    try {
      await register({
        ...formData,
        name: name,
        email: email,
        password: password,
        phone: rawPhone
      });

      if (formData.role === 'vendor' || formData.role === 'delivery_partner') {
        const partnerType = formData.role === 'vendor' ? 'Vendor Store' : 'Delivery Partner';
        toast.success(
          `🎉 ${partnerType} registration submitted! Your application is in the Admin Hub for review. Please log in to your dashboard. (Going online unlocks once verified by platform admin).`,
          { duration: 7000 }
        );
        navigate('/login');
      } else {
        toast.success('Account created successfully! Welcome to Milega Food.');
        navigate('/home');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please check all details.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    ['consumer', 'Customer', User],
    ['vendor', 'Vendor / Shop', Store],
    ['delivery_partner', 'Delivery Partner', Bike]
  ];

  return (
    <div className="fc-page flex min-h-screen flex-col bg-slate-50">
      <div className="flex-1 py-10">
        <div className="fc-container">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-7">
              <Link to="/" className="inline-flex">
                <MilegaLogo size="large" />
              </Link>
              <h1 className="mt-4 text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="mt-1 text-sm text-gray-500">All fields are compulsory for verification & approval.</p>
            </div>

            <form onSubmit={handleSubmit} className="fc-card p-6 sm:p-8 space-y-5 bg-white shadow-soft rounded-3xl border border-slate-200/90">
              {/* Account Type Selection */}
              <div>
                <label className="fc-eyebrow block mb-2 font-black text-slate-700">Account Type <span className="text-red-600 normal-case ml-1">*required</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: id })}
                      className={`p-3 rounded-2xl border text-center transition ${
                        formData.role === id
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="block text-[11px] font-bold leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                  {error}
                </div>
              )}

              {/* Common Compulsory Fields */}
              <div>
                <label className="fc-eyebrow block mb-1 font-black text-slate-700">Full Name <span className="text-red-600 normal-case ml-1">*required</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className="fc-input"
                />
              </div>

              <div>
                <label className="fc-eyebrow block mb-1 font-black text-slate-700">Email Address <span className="text-red-600 normal-case ml-1">*required</span></label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. aarav@example.com"
                  className="fc-input"
                />
              </div>

              <div>
                <label className="fc-eyebrow block mb-1 font-black text-slate-700">Mobile Phone Number <span className="text-red-600 normal-case ml-1">*required</span></label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="fc-input"
                />
              </div>

              <div>
                <label className="fc-eyebrow block mb-1 font-black text-slate-700">Password <span className="text-red-600 normal-case ml-1">*required</span></label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="•••••••• (Min 6 characters)"
                  className="fc-input"
                />
              </div>

              {/* VENDOR COMPULSORY SECTION */}
              {formData.role === 'vendor' && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-amber-800 text-xs font-black uppercase tracking-wider">
                    <Store className="w-4 h-4" /> Compulsory Store / Shop Details
                  </div>

                  <div>
                    <label className="fc-eyebrow block mb-1 text-slate-700 font-black">Shop / Store Name <span className="text-red-600 normal-case ml-1">*required</span></label>
                    <input
                      type="text"
                      required
                      value={formData.shopName}
                      onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                      placeholder="e.g. Sharma Sweets & Cafe / Fresh Mandi Point"
                      className="fc-input bg-white"
                    />
                  </div>

                  <div>
                    <label className="fc-eyebrow block mb-1 text-slate-700 font-black">Store Marketplace Category <span className="text-red-600 normal-case ml-1">*required</span></label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, vendorType: 'CRAVINGS' })}
                        className={`p-2.5 rounded-xl border text-left text-xs font-black transition flex items-center justify-between ${
                          formData.vendorType === 'CRAVINGS'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>🍔 CRAVINGS (Food)</span>
                        {formData.vendorType === 'CRAVINGS' && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, vendorType: 'FRESH' })}
                        className={`p-2.5 rounded-xl border text-left text-xs font-black transition flex items-center justify-between ${
                          formData.vendorType === 'FRESH'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>🥦 FRESH MANDI</span>
                        {formData.vendorType === 'FRESH' && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="fc-eyebrow block mb-1 text-slate-700 font-black">Operating City <span className="text-red-600 normal-case ml-1">*required</span></label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Noida / Faridabad"
                        className="fc-input bg-white"
                      />
                    </div>
                    <div>
                      <label className="fc-eyebrow block mb-1 text-slate-700 font-black">Store Address <span className="text-red-600 normal-case ml-1">*required</span></label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="e.g. Shop #12, Main Market"
                        className="fc-input bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DELIVERY PARTNER COMPULSORY SECTION */}
              {formData.role === 'delivery_partner' && (
                <div className="p-4 bg-cyan-50/70 border border-cyan-200 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-cyan-800 text-xs font-black uppercase tracking-wider">
                    <Bike className="w-4 h-4" /> Compulsory Vehicle & License Details
                  </div>

                  <div>
                    <label className="fc-eyebrow block mb-1 text-slate-700 font-black">Vehicle Type <span className="text-red-600 normal-case ml-1">*required</span></label>
                    <select
                      value={formData.vehicleType}
                      onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                      className="fc-input bg-white font-bold"
                    >
                      <option value="Bike">Motorcycle / Bike</option>
                      <option value="Scooter">Scooter / Scooty</option>
                      <option value="Electric Bike">Electric Vehicle (EV Bike)</option>
                      <option value="Bicycle">Bicycle / Cycle</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="fc-eyebrow block mb-1 text-slate-700 font-black">Vehicle Number <span className="text-red-600 normal-case ml-1">*required</span></label>
                      <input
                        type="text"
                        required
                        value={formData.vehicleNumber}
                        onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}
                        placeholder="e.g. UP 16 AB 1234"
                        className="fc-input bg-white"
                      />
                    </div>
                    <div>
                      <label className="fc-eyebrow block mb-1 text-slate-700 font-black">Driving License (DL) <span className="text-red-600 normal-case ml-1">*required</span></label>
                      <input
                        type="text"
                        required
                        value={formData.dlNumber}
                        onChange={e => setFormData({ ...formData, dlNumber: e.target.value })}
                        placeholder="e.g. DL-1420110012345"
                        className="fc-input bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="fc-eyebrow block mb-1 text-slate-700 font-black">Operating Area / Address <span className="text-red-600 normal-case ml-1">*required</span></label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. Sector 62, Noida"
                      className="fc-input bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="fc-btn fc-btn-primary w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
              >
                {loading ? 'Submitting Registration...' : 'Complete registration'}
                <UserPlus className="w-4 h-4" />
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 text-center py-4 text-xs text-gray-500">
        Secure account creation · Admin review strictly required before partners go online
      </div>
    </div>
  );
}
