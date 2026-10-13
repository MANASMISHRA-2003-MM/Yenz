import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import VendorNavbar from '../../components/VendorNavbar';
import { Store, CheckCircle, Clock, XCircle, ArrowRight, ShieldCheck, MapPin, Building2, FileCheck2 } from 'lucide-react';
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
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-20">
      <VendorNavbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <section className="fc-card overflow-hidden mb-6 bg-white shadow-soft">
          <div className="p-6 sm:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="fc-eyebrow text-emerald-600">Partner with Milega</p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
                Vendor & Store Partner Registration
              </h1>
              <p className="text-sm text-slate-500 mt-2 max-w-2xl font-medium">
                Bring your prepared dishes or fresh grocery products to the Milega marketplace. Your application is submitted directly to the central Yenz verification engine.
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <Store className="w-8 h-8" />
            </div>
          </div>
        </section>

        {existingApp ? (
          <section className="fc-card p-8 text-center bg-white shadow-soft">
            {existingApp.status === 'PENDING' && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-7 h-7" />
                </div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-700">Application Under Review</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{existingApp.businessName}</h2>
                <p className="mt-2 text-sm text-slate-500 max-w-lg mx-auto font-medium">
                  Submitted on {new Date(existingApp.createdAt).toLocaleDateString()}. Admin verification is currently in progress.
                </p>
                <button
                  onClick={fetchApplicationStatus}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                >
                  Refresh Application Status
                </button>
              </>
            )}

            {existingApp.status === 'APPROVED' && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Application Approved</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{existingApp.businessName} is Active</h2>
                <p className="mt-2 text-sm text-slate-500 font-medium">Your store is now authorized to manage orders, products, and incoming deliveries.</p>
                <button
                  onClick={() => navigate('/vendor/dashboard')}
                  className="mt-6 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition flex items-center gap-2 mx-auto shadow-md"
                >
                  <span>Open Vendor Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {existingApp.status === 'REJECTED' && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-7 h-7" />
                </div>
                <p className="text-xs font-black uppercase tracking-wider text-rose-700">Application Needs Changes</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Update Application Details</h2>
                <p className="mt-2 text-sm text-slate-500 font-medium">
                  Admin feedback: {existingApp.adminNotes || 'Please contact operations support or re-submit updated documents.'}
                </p>
              </>
            )}
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="fc-card p-6 sm:p-8 bg-white shadow-soft space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Store Business Details</h2>
                <p className="text-xs text-slate-500 font-medium">Provide essential details for official vendor onboarding.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label>
                <span className="fc-label">Business / Store Name *</span>
                <input
                  className="fc-input"
                  required
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Royal Sweets & Food"
                />
              </label>

              <label>
                <span className="fc-label">Operating Category *</span>
                <select
                  className="fc-input"
                  value={form.vendorType}
                  onChange={(e) => setForm({ ...form, vendorType: e.target.value })}
                >
                  <option value="CRAVINGS">Cravings — Prepared Food & Meals</option>
                  <option value="FRESH">Fresh Mandi — Fruits, Vegetables & Grocery</option>
                </select>
              </label>

              <label>
                <span className="fc-label">Contact Phone *</span>
                <input
                  className="fc-input"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label>
                <span className="fc-label">Business Email</span>
                <input
                  className="fc-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="store@example.com"
                />
              </label>

              <label className="md:col-span-2">
                <span className="fc-label">Store Address *</span>
                <input
                  className="fc-input"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Shop #12, Main Market"
                />
              </label>

              <label>
                <span className="fc-label">City</span>
                <input
                  className="fc-input"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </label>

              <label>
                <span className="fc-label">State</span>
                <input
                  className="fc-input"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </label>

              <label className="md:col-span-2">
                <span className="fc-label">Pincode</span>
                <input
                  className="fc-input"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                />
              </label>
            </div>

            <div className="pt-5 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <h2 className="font-bold text-slate-900">Legal Compliance & Verification</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <label>
                  <span className="fc-label">FSSAI License Number</span>
                  <input
                    className="fc-input"
                    value={form.fssaiNumber}
                    onChange={(e) => setForm({ ...form, fssaiNumber: e.target.value })}
                    placeholder="14-digit FSSAI number"
                  />
                </label>

                <label>
                  <span className="fc-label">GST Registration Number</span>
                  <input
                    className="fc-input"
                    value={form.gstNumber}
                    onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </label>

                <label>
                  <span className="fc-label">Aadhaar Number</span>
                  <input
                    className="fc-input"
                    value={form.aadhaarNumber}
                    onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })}
                    placeholder="12-digit Aadhaar number"
                  />
                </label>

                <label>
                  <span className="fc-label">Bank Account Number</span>
                  <input
                    className="fc-input"
                    value={form.bankAccount}
                    onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                    placeholder="Account number for settlement"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Submitting Application…' : 'Submit Vendor Application'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-xs text-slate-400 flex items-center justify-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Keep shop address accurate for automated delivery rider dispatch.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
