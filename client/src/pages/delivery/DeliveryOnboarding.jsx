import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import { Bike, CheckCircle, Clock, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function DeliveryOnboarding() {
  const [existingApp, setExistingApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: 'Faridabad',
    vehicleType: 'Bike',
    vehicleNumber: '',
    dlNumber: '',
    bankAccount: '',
    ifscCode: '',
    aadhaarNumber: ''
  });

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      setLoading(true);
      const res = await API.get('/deliveries/application/me');
      if (res.data.success && res.data.application) {
        setExistingApp(res.data.application);
      }
    } catch (err) {
      console.error('Error fetching delivery application:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        address: form.address,
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber,
        dlNumber: form.dlNumber,
        bankDetails: {
          accountNumber: form.bankAccount,
          ifscCode: form.ifscCode
        },
        documents: {
          aadhaarNumber: form.aadhaarNumber
        }
      };

      const res = await API.post('/deliveries/application', payload);
      if (res.data.success) {
        toast.success('Delivery partner application submitted!');
        setExistingApp(res.data.application);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-cyan-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              DELIVERY FLEET ONBOARDING
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">Delivery Fleet Partner Application</h1>
            <p className="text-xs text-slate-300 max-w-xl font-medium">
              Earn flexible income with Kravings hyperlocal quick delivery. Provide your vehicle & payout info below to complete driver verification.
            </p>
          </div>
          <Bike className="absolute -right-6 -bottom-6 w-48 h-48 text-white/5 pointer-events-none" />
        </div>

        {/* STATUS CARDS */}
        {existingApp ? (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6 text-center">
            {existingApp.status === 'PENDING' && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase">
                    DRIVER APPLICATION UNDER REVIEW
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-2">{existingApp.fullName} ({existingApp.vehicleType})</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Your driver verification details submitted on {new Date(existingApp.createdAt).toLocaleDateString()} are under review. You will receive active delivery jobs as soon as Admin approves your account.
                  </p>
                </div>
              </div>
            )}

            {existingApp.status === 'APPROVED' && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase">
                    DRIVER ACCOUNT APPROVED!
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-2">Ready to Deliver</h2>
                  <p className="text-xs text-slate-500 mt-1">Your driver account is verified and ready for live orders.</p>
                </div>
                <button
                  onClick={() => navigate('/delivery/dashboard')}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition inline-flex items-center gap-2"
                >
                  Go to Delivery Console
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {existingApp.status === 'REJECTED' && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black uppercase">
                    APPLICATION REJECTED
                  </span>
                  <p className="text-xs text-slate-500 mt-2">Admin Notes: {existingApp.adminNotes || 'Verification details could not be validated.'}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
            <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-500" />
              Delivery Partner Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Singh"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Vehicle Category *</label>
                <select
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-cyan-500"
                >
                  <option value="Bike">Motorcycle / Bike</option>
                  <option value="Scooter">EV Scooter / Activa</option>
                  <option value="Bicycle">Bicycle</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Vehicle Registration Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HR 51 AB 1234"
                  value={form.vehicleNumber}
                  onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Driving License Number</label>
                <input
                  type="text"
                  placeholder="DL-1420110012345"
                  value={form.dlNumber}
                  onChange={(e) => setForm({ ...form, dlNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="vikram@driver.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 pt-2">
              Identity Verification & Direct Bank Payouts
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Aadhaar Card Number (Private)</label>
                <input
                  type="text"
                  placeholder="12-digit Aadhaar Number"
                  value={form.aadhaarNumber}
                  onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Bank Account Number (Payouts)</label>
                <input
                  type="text"
                  placeholder="Account Number"
                  value={form.bankAccount}
                  onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Bank IFSC Code</label>
                <input
                  type="text"
                  placeholder="SBIN0001234"
                  value={form.ifscCode}
                  onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              {submitting ? 'Submitting Application...' : 'Submit Driver Verification'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

      </main>
    </div>
  );
}
