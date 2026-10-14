import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Store, Bike, ArrowRight, ArrowLeft, Lock, KeyRound, ShieldCheck, RefreshCw, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { sendPhoneOtp, clearRecaptcha, formatPhoneNumberE164 } from '../../utils/phoneAuth';
import API from '../../services/api';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const navigate = useNavigate();

  // Current Step: 1 = Phone & Role, 2 = Verify OTP, 3 = New Password
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('consumer');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Verification & Recaptcha State
  const [recaptchaMode, setRecaptchaMode] = useState('invisible'); // 'invisible' | 'normal'
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [idToken, setIdToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Clean up recaptcha on unmount
  useEffect(() => {
    return () => {
      clearRecaptcha('recaptcha-container');
    };
  }, []);

  // Resend Countdown Timer
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
    ['vendor', 'Vendor / Store', Store],
    ['delivery_partner', 'Delivery Partner', Bike]
  ];

  // Dev test number autofill helper
  const handleAutoFillTestNumber = () => {
    setPhone('+91 99999 99999');
    setError('');
    toast.info('Autofilled Dev Test Number (+91 99999 99999)');
  };

  // Step 1: Send OTP to Phone
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const formatted = formatPhoneNumberE164(phone);
    if (!formatted || formatted.replace(/\D/g, '').length < 10) {
      const msg = 'Please enter a valid 10-digit mobile number.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await sendPhoneOtp(formatted, recaptchaMode, 120000);
      setConfirmationResult(res.confirmationResult);
      setStep(2);
      setCountdown(60);
      toast.success(
        res.isTestNumber
          ? 'OTP triggered for test number! Use test code: 123456'
          : `SMS OTP dispatched to ${res.formattedPhone}`
      );
    } catch (err) {
      console.error('[ForgotPassword] sendPhoneOtp error:', err);
      let userMsg = err.message || 'Failed to send OTP. Please check your network.';

      // Check if invisible captcha failed and offer auto-switch to visible checkbox
      if (err.canFallbackToVisible) {
        setRecaptchaMode('normal');
        userMsg = 'Invisible verification was blocked or timed out. Switched to visible checkbox verification. Please check the box and try again.';
      }

      setError(userMsg);
      toast.error(userMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm OTP & Extract Firebase idToken
  const handleVerifyOtp = async (e) => {
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
      const msg = 'Verification session expired. Please request a new OTP.';
      setError(msg);
      toast.error(msg);
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const userCredential = await confirmationResult.confirm(cleanOtp);
      const token = await userCredential.user.getIdToken();
      setIdToken(token);
      setStep(3);
      toast.success('Identity verified! Set your new password.');
    } catch (err) {
      console.error('[ForgotPassword] confirm OTP error:', err);
      const msg = 'Invalid or expired OTP code. Please verify again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Submit New Password to Backend
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'Passwords do not match. Please re-enter.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!idToken) {
      const msg = 'Verification session expired. Please start over.';
      setError(msg);
      toast.error(msg);
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/reset-password', {
        idToken,
        role,
        newPassword
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Password reset successfully! Please sign in.');
        navigate('/login');
      } else {
        throw new Error(res.data.message || 'Reset password request failed.');
      }
    } catch (err) {
      console.error('[ForgotPassword] API reset-password error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update password. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fc-page flex min-h-screen flex-col bg-slate-50">
      <div className="flex-1 flex items-center py-10 sm:py-16">
        <div className="fc-container">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <Link to="/" className="inline-flex">
                <MilegaLogo size="large" />
              </Link>
              <h1 className="mt-4 text-2xl font-bold text-gray-900">Reset your password</h1>
              <p className="mt-1 text-sm text-gray-500">
                {step === 1 && 'Verify your registered phone number via SMS OTP'}
                {step === 2 && 'Enter the 6-digit SMS verification code'}
                {step === 3 && 'Choose a secure new password'}
              </p>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center justify-between mb-6 px-4">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  1
                </div>
                <span className="text-xs font-semibold text-gray-700">Phone</span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
                <span className="text-xs font-semibold text-gray-700">OTP</span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 3 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  3
                </div>
                <span className="text-xs font-semibold text-gray-700">New Password</span>
              </div>
            </div>

            <div className="fc-card p-6 sm:p-8 bg-white shadow-soft rounded-3xl border border-slate-200">
              {error && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: Phone & Role Selection */}
              {step === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div>
                    <label className="fc-eyebrow block mb-2 font-black text-slate-700">Select Account Role</label>
                    <div className="grid grid-cols-3 gap-2">
                      {roles.map(([id, label, Icon]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setRole(id)}
                          className={`p-2.5 rounded-xl border text-center transition ${
                            role === id
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 mx-auto mb-1" />
                          <span className="block text-[10px] font-bold truncate">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="fc-eyebrow font-black text-slate-700">Registered Mobile Number</label>
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
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="fc-input"
                    />
                  </div>

                  {/* reCAPTCHA Mode Selector & Container */}
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="fc-btn fc-btn-primary w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending OTP SMS...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: 6-Digit OTP Entry */}
              {step === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="text-center py-2">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Enter SMS Code</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      We sent a 6-digit code to <span className="font-bold text-gray-800">{phone}</span>
                    </p>
                  </div>

                  <div>
                    <label className="fc-eyebrow block mb-1 text-center font-black text-slate-700">6-Digit Verification Code</label>
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
                      <ArrowLeft className="w-3.5 h-3.5" /> Change Phone
                    </button>
                    {countdown > 0 ? (
                      <span>Resend code in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
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
                    className="fc-btn fc-btn-primary w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Identity...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 3: New Password Input */}
              {step === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Phone verified via Firebase! Create your new account password below.</span>
                  </div>

                  <div>
                    <label className="fc-eyebrow block mb-1 font-black text-slate-700">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="•••••••• (Min 6 chars)"
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

                  <div>
                    <label className="fc-eyebrow block mb-1 font-black text-slate-700">Confirm New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="fc-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="fc-btn fc-btn-primary w-full py-3.5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Password...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Update Password & Sign In</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            <p className="text-center text-sm text-gray-500 mt-5">
              Remembered your credentials?{' '}
              <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 text-center py-4 text-xs text-gray-500">
        Milega Food · Account Security & Multi-Role Identity Recovery
      </div>
    </div>
  );
}
