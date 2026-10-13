import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import DeliveryNavbar from '../../components/DeliveryNavbar';
import { Bike, CheckCircle, Clock, XCircle, ArrowRight, ShieldCheck, Wallet, FileCheck2 } from 'lucide-react';
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
      if (res.data?.success && res.data?.application) {
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
      if (res.data?.success) {
        toast.success('Delivery partner application submitted successfully!');
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
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-20">
      <DeliveryNavbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <section className="fc-card overflow-hidden mb-6 bg-white shadow-soft">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="fc-eyebrow text-sky-600">Delivery Fleet Partner</p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-1">
                Rider Fleet Partner Verification
              </h1>
              <p className="mt-2 text-sm text-slate-500 max-w-2xl font-medium">
                Apply to receive nearby delivery trips with live navigation and guaranteed payouts. Your verification is handled by the central Milega operations team.
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
              <Bike className="w-8 h-8" />
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
                <p className="text-xs font-black uppercase tracking-wider text-amber-700">Verification in Progress</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {existingApp.fullName} · {existingApp.vehicleType}
                </h2>
                <p className="mt-2 text-sm text-slate-500 max-w-lg mx-auto font-medium">
                  Submitted on {new Date(existingApp.createdAt).toLocaleDateString()}. Operations team is verifying your license and vehicle details.
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
                <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Account Approved</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Ready to Deliver</h2>
                <p className="mt-2 text-sm text-slate-500 font-medium">
                  Your delivery partner account is active and verified to receive live orders.
                </p>
                <button
                  onClick={() => navigate('/delivery/dashboard')}
                  className="mt-6 px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-sm transition flex items-center gap-2 mx-auto shadow-md"
                >
                  <span>Open Rider Dashboard</span>
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
                <p className="mt-2 text-sm text-slate-500 font-medium">
                  Admin feedback: {existingApp.adminNotes || 'Verification details could not be validated. Contact fleet operations.'}
                </p>
              </>
            )}
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="fc-card p-6 sm:p-8 bg-white shadow-soft space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">Delivery Partner Information</h2>
                <p className="text-xs text-slate-500 font-medium">Provide essential details for official driver verification.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label>
                <span className="fc-label">Full Legal Name *</span>
                <input
                  className="fc-input"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Aarav Sharma"
                />
              </label>

              <label>
                <span className="fc-label">Vehicle Category *</span>
                <select
                  className="fc-input"
                  value={form.vehicleType}
                  onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                >
                  <option value="Bike">Motorcycle / Bike</option>
                  <option value="Scooter">EV Scooter / Activa</option>
                  <option value="Bicycle">Bicycle</option>
                </select>
              </label>

              <label>
                <span className="fc-label">Vehicle Registration Number *</span>
                <input
                  className="fc-input"
                  required
                  value={form.vehicleNumber}
                  onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                  placeholder="HR 51 AB 1234"
                />
              </label>

              <label>
                <span className="fc-label">Driving License Number</span>
                <input
                  className="fc-input"
                  value={form.dlNumber}
                  onChange={(e) => setForm({ ...form, dlNumber: e.target.value })}
                  placeholder="DL-1420110012345"
                />
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
                <span className="fc-label">Email Address</span>
                <input
                  className="fc-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="rider@example.com"
                />
              </label>

              <label className="md:col-span-2">
                <span className="fc-label">Operating Address / Hub</span>
                <input
                  className="fc-input"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Faridabad, Sector 15"
                />
              </label>
            </div>

            <div className="pt-5 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <FileCheck2 className="w-5 h-5 text-sky-600" />
                <h2 className="font-bold text-slate-900">Identity & Bank Settlement</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                    placeholder="Account number for daily payout"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="fc-label">IFSC Code</span>
                  <input
                    className="fc-input"
                    value={form.ifscCode}
                    onChange={(e) => setForm({ ...form, ifscCode: e.target.value })}
                    placeholder="HDFC0001234"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Submitting Application…' : 'Submit Fleet Partner Verification'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
