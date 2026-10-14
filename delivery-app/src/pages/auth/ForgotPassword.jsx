import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bike, ArrowRight, ArrowLeft, ShieldCheck, RefreshCw, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import MilegaLogo from '../../components/MilegaLogo';
import { sendPhoneOtp, clearRecaptcha, formatPhoneNumberE164 } from '../../utils/phoneAuth';
import API from '../../services/api';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [recaptchaMode, setRecaptchaMode] = useState('invisible');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [idToken, setIdToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

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
    setPhone('+91 99999 99999');
    setError('');
    toast.info('Autofilled Dev Test Number (+91 99999 99999)');
  };

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
          ? 'OTP triggered for test number! Use code: 123456'
          : `SMS OTP dispatched to ${res.formattedPhone}`
      );
    } catch (err) {
      console.error('[Rider ForgotPassword] sendPhoneOtp error:', err);
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    if (!confirmationResult) {
      setError('Verification session expired.');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const cred = await confirmationResult.confirm(cleanOtp);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      setStep(3);
      toast.success('Rider mobile verified! Set your new password.');
    } catch (err) {
      console.error('[Rider ForgotPassword] verify OTP error:', err);
      setError('Invalid or expired code.');
      toast.error('Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/reset-password', {
        idToken,
        role: 'delivery_partner',
        newPassword
      });

      if (res.data.success) {
        toast.success('Rider password updated successfully! Please sign in.');
        navigate('/login');
      } else {
        throw new Error(res.data.message || 'Failed to update password');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset password.';
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
            <Link to="/login" className="inline-flex"><MilegaLogo size="large" /></Link>
            <h1 className="mt-3 text-2xl font-black text-slate-900">Reset Rider Password</h1>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              {step === 1 && 'Verify your registered rider mobile number'}
              {step === 2 && 'Enter 6-digit verification code'}
              {step === 3 && 'Create your new rider account password'}
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-white shadow-soft border border-slate-200 rounded-3xl">
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Registered Phone Number</label>
                    <button
                      type="button"
                      onClick={handleAutoFillTest}
                      className="text-[11px] font-bold text-cyan-600 hover:underline"
                    >
                      ⚡ Autofill Test
                    </button>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-cyan-600" /> Security
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        clearRecaptcha('recaptcha-container');
                        setRecaptchaMode(m => m === 'invisible' ? 'normal' : 'invisible');
                      }}
                      className="text-cyan-700 font-semibold underline text-[11px]"
                    >
                      Mode: {recaptchaMode === 'invisible' ? 'Invisible' : 'Checkbox'}
                    </button>
                  </div>
                  <div id="recaptcha-container" className="flex justify-center my-1" />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {loading ? 'Sending SMS OTP...' : 'Send Verification OTP'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center py-2">
                  <p className="text-xs text-slate-500">
                    Code sent to <span className="font-bold text-slate-800">{phone}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-center text-xs font-bold text-slate-700 mb-1">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl tracking-[0.4em] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <button type="button" onClick={() => setStep(1)} className="hover:text-slate-800 flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  {countdown > 0 ? (
                    <span>Resend in {countdown}s</span>
                  ) : (
                    <button type="button" onClick={handleSendOtp} disabled={loading} className="text-cyan-600 font-bold hover:underline">
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex items-center gap-2 p-2.5 bg-cyan-50 text-cyan-800 rounded-xl text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>Rider mobile verified! Enter your new password below.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="•••••••• (Min 6 chars)"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {loading ? 'Updating Password...' : 'Save Password & Sign In'}
                  <KeyRound className="w-4 h-4 ml-1" />
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-slate-500 mt-6 font-medium">
            Remember your password?{' '}
            <Link to="/login" className="font-extrabold text-cyan-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
