import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import { Store, CheckCircle, Clock, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function VendorOnboarding() {
  const [existingApp, setExistingApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    businessName: '',
    vendorType: 'CRAVINGS',
    phone: '',
    email: '',
    address: '',
    city: 'Faridabad',
    state: 'Haryana',
    pincode: '121009',
    fssaiNumber: '',
    gstNumber: '',
    aadhaarNumber: '',
    bankAccount: ''
  });

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      setLoading(true);
      const res = await API.get('/restaurants/application/me');
      if (res.data.success && res.data.application) {
        setExistingApp(res.data.application);
      }
    } catch (err) {
      console.error('Error fetching vendor application:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        businessName: form.businessName,
        vendorType: form.vendorType,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        fssaiNumber: form.fssaiNumber,
        gstNumber: form.gstNumber,
        documents: {
          aadhaarNumber: form.aadhaarNumber,
          bankAccount: form.bankAccount
        }
      };

      const res = await API.post('/restaurants/application', payload);
      if (res.data.success) {
        toast.success('Vendor application submitted successfully!');
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
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              PARTNER WITH KRAWING
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">Vendor & Store Partner Registration</h1>
            <p className="text-xs text-slate-300 max-w-xl font-medium">
              Expand your reach with Kravings food ordering or Fresh Mandi grocery delivery. Submit your store verification details below for Admin review.
            </p>
          </div>
          <Store className="absolute -right-6 -bottom-6 w-48 h-48 text-white/5 pointer-events-none" />
        </div>

        {/* APPLICATION STATUS CARDS */}
        {existingApp ? (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6 text-center">
            {existingApp.status === 'PENDING' && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase">
                    APPLICATION UNDER ADMIN REVIEW
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-2">{existingApp.businessName}</h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Your application submitted on {new Date(existingApp.createdAt).toLocaleDateString()} is currently being verified by our platform admins. You will gain full access to your store dashboard as soon as it's approved!
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
                    APPLICATION APPROVED!
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-2">{existingApp.businessName} is Active</h2>
                  <p className="text-xs text-slate-500 mt-1">Your store is now active on the Krawing platform.</p>
                </div>
                <button
                  onClick={() => navigate('/vendor/dashboard')}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition inline-flex items-center gap-2"
                >
                  Go to Vendor Dashboard
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
                    APPLICATION NOT APPROVED
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-2">Update Application Details</h2>
                  <p className="text-xs text-slate-500 mt-1">Admin Notes: {existingApp.adminNotes || 'Please contact support for more details.'}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft space-y-6">
            <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-500" />
              Store Business Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Business / Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Sweets & Food"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Store Operating Category *</label>
                <select
                  value={form.vendorType}
                  onChange={(e) => setForm({ ...form, vendorType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-brand-500"
                >
                  <option value="CRAVINGS">Cravings (Prepared Food / Restaurant)</option>
                  <option value="FRESH">Fresh Mandi (Fruits, Veggies & Groceries)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Contact Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Business Email</label>
                <input
                  type="email"
                  placeholder="store@krawing.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Complete Store Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Shop #12, Main Market, Lakkarpur"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 pt-2">
              Legal Compliance & Verification
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">FSSAI License Number</label>
                <input
                  type="text"
                  placeholder="14-digit FSSAI Number"
                  value={form.fssaiNumber}
                  onChange={(e) => setForm({ ...form, fssaiNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">GST Registration Number</label>
                <input
                  type="text"
                  placeholder="22AAAAA0000A1Z5"
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Aadhaar Number (Private)</label>
                <input
                  type="text"
                  placeholder="12-digit Aadhaar Number"
                  value={form.aadhaarNumber}
                  onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 block mb-1">Bank Account Number (Payouts)</label>
                <input
                  type="text"
                  placeholder="Bank Account Number"
                  value={form.bankAccount}
                  onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              {submitting ? 'Submitting Application...' : 'Submit Vendor Application'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

      </main>
    </div>
  );
}
