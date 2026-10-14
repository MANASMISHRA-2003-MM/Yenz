import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, ArrowLeft, UserPlus, ShieldCheck, RefreshCw, Eye, EyeOff } from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { sendPhoneOtp, clearRecaptcha, formatPhoneNumberE164 } from '../../utils/phoneAuth';
import { toast } from 'sonner';

export default function Register() {
  const [step, setStep] = useState(1); // 1 = Details & Phone, 2 = SMS OTP
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'consumer'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [recaptchaMode, setRecaptchaMode] = useState('invisible');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      clearRecaptcha('recaptcha-container');
    };
  }, []);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleAutoFillTest = () => {
    setFormData(prev => ({ ...prev, phone: '+91 99999 99999' }));
    setError('');
    toast.info('Autofilled Dev Test Number (+91 99999 99999)');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    const raw = (formData.phone || '').trim();
    if (!formData.name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email is required.');
      return;
    }
    if (!raw || raw.replace(/\D/g, '').length < 10) {
      const msg = 'Please enter a valid 10-digit mobile number.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const formatted = formatPhoneNumberE164(raw);
    setLoading(true);
    try {
      const res = await sendPhoneOtp(formatted, recaptchaMode, 120000);
      setConfirmationResult(res.confirmationResult);
      setStep(2);
      setCountdown(60);
      toast.success(
        res.isTestNumber
          ? 'OTP triggered for test number! Use code: 123456'
          : `SMS verification code dispatched to ${res.formattedPhone}`
      );
    } catch (err) {
      console.error('[Register] OTP error:', err);
      let userMsg = err.message || 'Failed to send OTP.';
      if (err.canFallbackToVisible) {
        setRecaptchaMode('normal');
        userMsg = 'Switched to checkbox verification. Please check the box and try again.';
      }
      setError(userMsg);
      toast.error(userMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please restart registration.');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const cred = await confirmationResult.confirm(cleanOtp);
      const idToken = await cred.user.getIdToken();

      await register({
        ...formData,
        phone: formatPhoneNumberE164(formData.phone),
        role: 'consumer',
        idToken
      });

      toast.success('🎉 Account created and verified! Welcome to Milega Food.');
      navigate('/home');
    } catch (err) {
      console.error('[Register] Completion error:', err);
      const msg = err.response?.data?.message || err.message || 'Registration failed.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fc-page flex min-h-screen flex-col bg-gray-50/50 safe-top safe-bottom">
      <div className="flex-1 py-8 sm:py-12">
        <div className="fc-container">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <Link to="/" className="inline-flex"><MilegaLogo size="large" /></Link>
              <h1 className="mt-3 text-2xl font-bold text-gray-900">
                {step === 1 ? 'Create Customer Account' : 'Verify Mobile Number'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {step === 1
                  ? 'Sign up with phone verification for fast local orders'
                  : `Enter SMS OTP sent to ${formData.phone}`}
              </p>
            </div>

            <div className="fc-card p-6 sm:p-8 bg-white shadow-md border border-gray-100 rounded-3xl space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              {step === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="fc-eyebrow block mb-1.5 text-xs text-gray-600 font-bold uppercase tracking-wider">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Aarav Sharma"
                      className="fc-input rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="fc-eyebrow block mb-1.5 text-xs text-gray-600 font-bold uppercase tracking-wider">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="aarav@example.com"
                      className="fc-input rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="fc-eyebrow text-xs text-gray-600 font-bold uppercase tracking-wider">
                        Mobile Phone Number *
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoFillTest}
                        className="text-[11px] font-bold text-emerald-600 hover:underline"
                      >
                        ⚡ Autofill Test
                      </button>
                    </div>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="fc-input rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="fc-eyebrow block mb-1.5 text-xs text-gray-600 font-bold uppercase tracking-wider">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        placeholder="•••••••• (Min 6 chars)"
                        className="fc-input rounded-xl text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* reCAPTCHA security */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-700 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" /> Phone Verification
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          clearRecaptcha('recaptcha-container');
                          setRecaptchaMode(m => m === 'invisible' ? 'normal' : 'invisible');
                        }}
                        className="text-emerald-700 font-semibold underline text-[11px]"
                      >
                        Mode: {recaptchaMode === 'invisible' ? 'Invisible' : 'Checkbox'}
                      </button>
                    </div>
                    <div id="recaptcha-container" className="flex justify-center my-1" />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="fc-btn fc-btn-primary w-full py-3 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20"
                  >
                    {loading ? 'Sending SMS OTP...' : 'Verify Mobile via OTP'}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-500">
                      Enter the 6-digit code sent to <span className="font-bold text-gray-800">{formData.phone}</span>
                    </p>
                  </div>
                  <div>
                    <label className="fc-eyebrow block mb-1 text-center font-bold text-xs">6-Digit SMS Code</label>
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

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <button type="button" onClick={() => setStep(1)} className="hover:text-gray-800 flex items-center gap-1">
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to details
                    </button>
                    {countdown > 0 ? (
                      <span>Resend in {countdown}s</span>
                    ) : (
                      <button type="button" onClick={handleSendOtp} disabled={loading} className="text-emerald-600 font-bold hover:underline">
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="fc-btn fc-btn-primary w-full py-3 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                        <span>Verifying & Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        <span>Complete Registration</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
