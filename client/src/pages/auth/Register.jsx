import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Store,
  Bike,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { sendPhoneOtp, clearRecaptcha, formatPhoneNumberE164 } from '../../utils/phoneAuth';
import { toast } from 'sonner';

export default function Register() {
  const [step, setStep] = useState(1); // 1 = Form & Phone, 2 = SMS OTP Verification
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

  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [recaptchaMode, setRecaptchaMode] = useState('invisible'); // 'invisible' | 'normal'
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Clean up recaptcha on unmount
  useEffect(() => {
    return () => {
      clearRecaptcha('recaptcha-container');
    };
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const roles = [
    ['consumer', 'Customer', User],
    ['vendor', 'Vendor / Shop', Store],
    ['delivery_partner', 'Delivery Partner', Bike]
  ];

  // Dev test number autofill helper
  const handleAutoFillTestNumber = () => {
    setFormData(prev => ({
      ...prev,
      phone: '+91 99999 99999'
    }));
    setError('');
    toast.info('Autofilled Dev Test Number (+91 99999 99999)');
  };

  // Validate Step 1 details
  const validateStep1 = () => {
    const name = (formData.name || '').trim();
    const email = (formData.email || '').trim();
    const password = (formData.password || '').trim();
    const rawPhone = (formData.phone || '').trim();
    const phoneDigits = rawPhone.replace(/\D/g, '');

    if (!name) {
      return 'Full name is strictly required.';
    }
    if (!email || !email.includes('@')) {
      return 'A valid email address is strictly required.';
    }
    if (!rawPhone || phoneDigits.length < 10) {
      return 'A valid 10-digit mobile number is required.';
    }
    if (!password || password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }

    if (formData.role === 'vendor') {
      if (!formData.shopName.trim()) return 'Store / Shop name is required for vendor registration.';
      if (!formData.address.trim()) return 'Store address is required for vendor registration.';
      if (!formData.city.trim()) return 'Operating city is required for vendor registration.';
    } else if (formData.role === 'delivery_partner') {
      if (!formData.vehicleNumber.trim()) return 'Vehicle registration number is required for delivery partner.';
      if (!formData.dlNumber.trim()) return 'Driving License (DL) number is required for delivery partner.';
      if (!formData.address.trim()) return 'Operating area address is required for delivery partner.';
    }

    return null;
  };

  // Step 1: Send OTP via Firebase Phone Auth
  const handleInitiateOtp = async (e) => {
    e.preventDefault();
    setError('');

    const validationMsg = validateStep1();
    if (validationMsg) {
      setError(validationMsg);
      toast.error(validationMsg);
      return;
    }

    const formattedPhone = formatPhoneNumberE164(formData.phone);

    setLoading(true);
    try {
      const res = await sendPhoneOtp(formattedPhone, recaptchaMode, 120000);
      setConfirmationResult(res.confirmationResult);
      setStep(2);
      setCountdown(60);

      toast.success(
        res.isTestNumber
          ? 'OTP triggered for test number! Use mock code: 123456'
          : `SMS verification code dispatched to ${res.formattedPhone}`
      );
    } catch (err) {
      console.error('[Register] Phone Auth Error:', err);
      let userMsg = err.message || 'Failed to dispatch SMS verification code. Please check your network.';

      if (err.canFallbackToVisible) {
        setRecaptchaMode('normal');
        userMsg = 'Invisible verification was blocked or timed out. Switched to checkbox verification. Please check the box and try again.';
      }

      setError(userMsg);
      toast.error(userMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP, extract idToken, and dispatch registration
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length < 6) {
      const msg = 'Please enter the complete 6-digit verification code.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!confirmationResult) {
      const msg = 'Verification session expired. Please re-enter your mobile number.';
      setError(msg);
      toast.error(msg);
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      // 1. Confirm code with Firebase client SDK
      const userCredential = await confirmationResult.confirm(cleanOtp);
      // 2. Extract verified Firebase idToken
      const idToken = await userCredential.user.getIdToken();

      // 3. Dispatch payload to backend
      const payload = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        phone: formatPhoneNumberE164(formData.phone),
        idToken
      };

      await register(payload);

      if (formData.role === 'vendor' || formData.role === 'delivery_partner') {
        const partnerType = formData.role === 'vendor' ? 'Vendor Store' : 'Delivery Partner';
        toast.success(
          `🎉 ${partnerType} registered successfully! Your account application has been logged for admin verification. Please sign in to view your portal.`,
          { duration: 8000 }
        );
        navigate('/login');
      } else {
        toast.success('🎉 Welcome to Milega Food! Account created and verified.');
        navigate('/home');
      }
    } catch (err) {
      console.error('[Register] Finalize Registration Error:', err);
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please check your details.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fc-page flex min-h-screen flex-col bg-slate-50">
      <div className="flex-1 py-10">
        <div className="fc-container">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-7">
              <Link to="/" className="inline-flex">
                <MilegaLogo size="large" />
              </Link>
              <h1 className="mt-4 text-2xl font-bold text-gray-900">
                {step === 1 ? 'Create your account' : 'Verify Mobile OTP'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {step === 1
                  ? 'All fields with phone verification are required for approval.'
                  : `Enter the 6-digit SMS code sent to ${formData.phone}`}
              </p>
            </div>

            {/* Stepper Header */}
            <div className="flex items-center justify-between mb-6 px-6">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  1
                </div>
                <span className="text-xs font-semibold text-gray-700">Account Details</span>
              </div>
              <div className={`flex-1 h-0.5 mx-3 ${step === 2 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
                <span className="text-xs font-semibold text-gray-700">Phone Verification</span>
              </div>
            </div>

            <div className="fc-card p-6 sm:p-8 bg-white shadow-soft rounded-3xl border border-slate-200/90">
              {error && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: Registration Form with Embedded reCAPTCHA */}
              {step === 1 && (
                <form onSubmit={handleInitiateOtp} className="space-y-5">
                  {/* Account Type Selection */}
                  <div>
                    <label className="fc-eyebrow block mb-2 font-black text-slate-700">
                      Account Type <span className="text-red-600 normal-case ml-1">*required</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {roles.map(([id, label, Icon]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, role: id }))}
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

                  {/* Common Compulsory Fields */}
                  <div>
                    <label className="fc-eyebrow block mb-1 font-black text-slate-700">
                      Full Name <span className="text-red-600 normal-case ml-1">*required</span>
                    </label>
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
                    <label className="fc-eyebrow block mb-1 font-black text-slate-700">
                      Email Address <span className="text-red-600 normal-case ml-1">*required</span>
                    </label>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="fc-eyebrow font-black text-slate-700">
                        Mobile Phone Number <span className="text-red-600 normal-case ml-1">*required</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoFillTestNumber}
                        className="text-[11px] font-bold text-emerald-600 hover:underline"
                      >
                        ⚡ Autofill Dev Test
                      </button>
                    </div>
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
                    <label className="fc-eyebrow block mb-1 font-black text-slate-700">
                      Password <span className="text-red-600 normal-case ml-1">*required</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        placeholder="•••••••• (Min 6 characters)"
                        className="fc-input pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* VENDOR COMPULSORY SECTION */}
                  {formData.role === 'vendor' && (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-amber-800 text-xs font-black uppercase tracking-wider">
                        <Store className="w-4 h-4" /> Compulsory Store / Shop Details
                      </div>

                      <div>
                        <label className="fc-eyebrow block mb-1 text-slate-700 font-black">
                          Shop / Store Name <span className="text-red-600 normal-case ml-1">*required</span>
                        </label>
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
                        <label className="fc-eyebrow block mb-1 text-slate-700 font-black">
                          Store Marketplace Category <span className="text-red-600 normal-case ml-1">*required</span>
                        </label>
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
                          <label className="fc-eyebrow block mb-1 text-slate-700 font-black">
                            Operating City <span className="text-red-600 normal-case ml-1">*required</span>
                          </label>
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
                          <label className="fc-eyebrow block mb-1 text-slate-700 font-black">
                            Store Address <span className="text-red-600 normal-case ml-1">*required</span>
                          </label>
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
                        <label className="fc-eyebrow block mb-1 text-slate-700 font-black">
                          Vehicle Type <span className="text-red-600 normal-case ml-1">*required</span>
                        </label>
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
                          <label className="fc-eyebrow block mb-1 text-slate-700 font-black">
                            Vehicle Number <span className="text-red-600 normal-case ml-1">*required</span>
                          </label>
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
                          <label className="fc-eyebrow block mb-1 text-slate-700 font-black">
                            Driving License (DL) <span className="text-red-600 normal-case ml-1">*required</span>
                          </label>
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
                        <label className="fc-eyebrow block mb-1 text-slate-700 font-black">
                          Operating Area / Address <span className="text-red-600 normal-case ml-1">*required</span>
                        </label>
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

                  {/* reCAPTCHA Mode & In-Form Container */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Verification Security
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          clearRecaptcha('recaptcha-container');
                          setRecaptchaMode(prev => prev === 'invisible' ? 'normal' : 'invisible');
                        }}
                        className="text-[11px] text-emerald-700 font-semibold underline hover:text-emerald-800"
                      >
                        Mode: {recaptchaMode === 'invisible' ? 'Invisible (Fast)' : 'Checkbox'}
                      </button>
                    </div>
                    <div id="recaptcha-container" className="flex justify-center my-1" />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="fc-btn fc-btn-primary w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending SMS OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify Phone & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: 6-Digit OTP Verification Form */}
              {step === 2 && (
                <form onSubmit={handleVerifyAndRegister} className="space-y-5">
                  <div className="text-center py-2">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Enter SMS Verification Code</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      We sent a 6-digit OTP to <span className="font-bold text-gray-800">{formData.phone}</span>
                    </p>
                  </div>

                  <div>
                    <label className="fc-eyebrow block mb-1 text-center font-black text-slate-700">6-Digit Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      placeholder="123456"
                      className="fc-input text-center text-xl tracking-[0.4em] font-mono font-bold"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 hover:text-slate-800 font-semibold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to details
                    </button>
                    {countdown > 0 ? (
                      <span>Resend OTP in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleInitiateOtp}
                        disabled={loading}
                        className="text-emerald-600 font-bold hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="fc-btn fc-btn-primary w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying & Completing Registration...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Complete Registration</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

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
        Secure phone verified registration · Powered by Firebase Authentication
      </div>
    </div>
  );
}
