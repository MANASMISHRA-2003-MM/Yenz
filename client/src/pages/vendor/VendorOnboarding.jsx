import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import { Store, CheckCircle, Clock, XCircle, ArrowRight, ShieldCheck, MapPin, Building2, FileCheck2 } from 'lucide-react';
import FreshCartFooter from '../../components/FreshCartFooter';
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
    <div className="min-h-screen bg-white text-gray-800">
      <Navbar />
      <main className="fc-container py-8 sm:py-10 pb-20">
        <section className="fc-card overflow-hidden mb-6">
          <div className="p-6 sm:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div><p className="fc-eyebrow" style={{color:'var(--fc-fresh)'}}>Partner with Milega</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mt-1">Vendor & store partner registration</h1><p className="text-sm text-gray-500 mt-2 max-w-2xl">Bring prepared food or fresh grocery products to the Milega marketplace. Your existing application is submitted to the same Yenz verification API.</p></div>
            <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{background:'rgba(22,138,91,.08)',color:'var(--fc-fresh)'}}><Store className="w-8 h-8" /></div>
          </div>
        </section>

        {existingApp ? <section className="fc-card p-7 text-center">
          {existingApp.status === 'PENDING' && <><div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto"><Clock className="w-6 h-6" /></div><p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-700">Application under review</p><h2 className="mt-2 text-xl font-bold text-gray-900">{existingApp.businessName}</h2><p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">Submitted on {new Date(existingApp.createdAt).toLocaleDateString()}. Admin verification is in progress.</p></>}
          {existingApp.status === 'APPROVED' && <><div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 border border-green-200 flex items-center justify-center mx-auto"><CheckCircle className="w-6 h-6" /></div><p className="mt-4 text-xs font-bold uppercase tracking-wide" style={{color:'var(--fc-fresh)'}}>Application approved</p><h2 className="mt-2 text-xl font-bold text-gray-900">{existingApp.businessName} is active</h2><p className="mt-2 text-sm text-gray-500">Your store can now manage orders and products.</p><button onClick={() => navigate('/vendor/dashboard')} className="mt-5 fc-btn text-white" style={{background:'var(--fc-fresh)',borderColor:'var(--fc-fresh)'}}>Open vendor dashboard <ArrowRight className="w-4 h-4" /></button></>}
          {existingApp.status === 'REJECTED' && <><div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto" style={{background:'rgba(229,27,75,.08)',color:'var(--fc-red)'}}><XCircle className="w-6 h-6" /></div><p className="mt-4 text-xs font-bold uppercase tracking-wide" style={{color:'var(--fc-red)'}}>Application needs changes</p><h2 className="mt-2 text-xl font-bold text-gray-900">Update application details</h2><p className="mt-2 text-sm text-gray-500">Admin notes: {existingApp.adminNotes || 'Please contact support for more details.'}</p></>}
        </section> : <form onSubmit={handleSubmit} className="fc-card p-5 sm:p-7">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200"><div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700"><Building2 className="w-5 h-5" /></div><div><h2 className="font-semibold text-gray-900">Store business details</h2><p className="text-xs text-gray-500">Complete these fields for admin review.</p></div></div>
          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <label><span className="fc-label">Business / store name *</span><input className="fc-input" required value={form.businessName} onChange={e => setForm({...form,businessName:e.target.value})} placeholder="Royal Sweets & Food" /></label>
            <label><span className="fc-label">Operating category *</span><select className="fc-input" value={form.vendorType} onChange={e => setForm({...form,vendorType:e.target.value})}><option value="CRAVINGS">Cravings — prepared food</option><option value="FRESH">Fresh Mandi — fruits, vegetables & groceries</option></select></label>
            <label><span className="fc-label">Contact phone *</span><input className="fc-input" required value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} placeholder="+91 98765 43210" /></label>
            <label><span className="fc-label">Business email</span><input className="fc-input" type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="store@example.com" /></label>
            <label className="md:col-span-2"><span className="fc-label">Store address *</span><input className="fc-input" required value={form.address} onChange={e => setForm({...form,address:e.target.value})} placeholder="Shop #12, Main Market" /></label>
            <label><span className="fc-label">City</span><input className="fc-input" value={form.city} onChange={e => setForm({...form,city:e.target.value})} /></label>
            <label><span className="fc-label">State</span><input className="fc-input" value={form.state} onChange={e => setForm({...form,state:e.target.value})} /></label>
            <label><span className="fc-label">Pincode</span><input className="fc-input" value={form.pincode} onChange={e => setForm({...form,pincode:e.target.value})} /></label>
          </div>
          <div className="mt-7 pt-5 border-t border-gray-200"><div className="flex items-center gap-2"><FileCheck2 className="w-5 h-5" style={{color:'var(--fc-fresh)'}} /><h2 className="font-semibold text-gray-900">Legal compliance & verification</h2></div><div className="grid md:grid-cols-2 gap-4 mt-4">
            <label><span className="fc-label">FSSAI license number</span><input className="fc-input" value={form.fssaiNumber} onChange={e => setForm({...form,fssaiNumber:e.target.value})} placeholder="14-digit FSSAI number" /></label>
            <label><span className="fc-label">GST registration number</span><input className="fc-input" value={form.gstNumber} onChange={e => setForm({...form,gstNumber:e.target.value})} placeholder="22AAAAA0000A1Z5" /></label>
            <label><span className="fc-label">Aadhaar number</span><input className="fc-input" value={form.aadhaarNumber} onChange={e => setForm({...form,aadhaarNumber:e.target.value})} placeholder="12-digit Aadhaar number" /></label>
            <label><span className="fc-label">Bank account number</span><input className="fc-input" value={form.bankAccount} onChange={e => setForm({...form,bankAccount:e.target.value})} placeholder="Account number" /></label>
          </div></div>
          <button type="submit" disabled={submitting} className="mt-7 w-full fc-btn text-white disabled:opacity-50" style={{background:'var(--fc-fresh)',borderColor:'var(--fc-fresh)'}}>{submitting ? 'Submitting application…' : 'Submit vendor application'} <ArrowRight className="w-4 h-4" /></button>
          <p className="mt-3 text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Keep your shop address accurate for delivery dispatch.</p>
        </form>}
      </main>
      <FreshCartFooter />
    </div>
  );
}
