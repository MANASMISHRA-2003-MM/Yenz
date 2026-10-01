import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import { Bike, CheckCircle, Clock, XCircle, ArrowRight, ShieldCheck, Wallet, FileCheck2 } from 'lucide-react';
import FreshCartFooter from '../../components/FreshCartFooter';
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
    <div className="min-h-screen bg-white text-gray-800">
      <Navbar />
      <main className="fc-container py-8 sm:py-10 pb-20">
        <section className="fc-card mb-6"><div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"><div><p className="fc-eyebrow" style={{color:'var(--fc-fresh)'}}>Delivery partner</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mt-1">Delivery fleet partner application</h1><p className="mt-2 text-sm text-gray-500 max-w-2xl">Apply to receive nearby Yenz delivery jobs. Your application and payout data continue to use the existing delivery API.</p></div><div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{background:'rgba(22,138,91,.08)',color:'var(--fc-fresh)'}}><Bike className="w-8 h-8" /></div></div></section>
        {existingApp ? <section className="fc-card p-7 text-center">
          {existingApp.status === 'PENDING' && <><div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto"><Clock className="w-6 h-6" /></div><p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-700">Application under review</p><h2 className="mt-2 text-xl font-bold text-gray-900">{existingApp.fullName} · {existingApp.vehicleType}</h2><p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">Submitted on {new Date(existingApp.createdAt).toLocaleDateString()}. Admin verification is in progress.</p></>}
          {existingApp.status === 'APPROVED' && <><div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 border border-green-200 flex items-center justify-center mx-auto"><CheckCircle className="w-6 h-6" /></div><p className="mt-4 text-xs font-bold uppercase tracking-wide" style={{color:'var(--fc-fresh)'}}>Driver account approved</p><h2 className="mt-2 text-xl font-bold text-gray-900">Ready to deliver</h2><p className="mt-2 text-sm text-gray-500">Your delivery account can receive live orders.</p><button onClick={() => navigate('/delivery/dashboard')} className="mt-5 fc-btn text-white" style={{background:'var(--fc-fresh)',borderColor:'var(--fc-fresh)'}}>Open delivery console <ArrowRight className="w-4 h-4" /></button></>}
          {existingApp.status === 'REJECTED' && <><div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto" style={{background:'rgba(229,27,75,.08)',color:'var(--fc-red)'}}><XCircle className="w-6 h-6" /></div><p className="mt-4 text-xs font-bold uppercase tracking-wide" style={{color:'var(--fc-red)'}}>Application rejected</p><p className="mt-2 text-sm text-gray-500">Admin notes: {existingApp.adminNotes || 'Verification details could not be validated.'}</p></>}
        </section> : <form onSubmit={handleSubmit} className="fc-card p-5 sm:p-7">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200"><div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Bike className="w-5 h-5" /></div><div><h2 className="font-semibold text-gray-900">Delivery partner information</h2><p className="text-xs text-gray-500">Provide the details needed for verification.</p></div></div>
          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <label><span className="fc-label">Full legal name *</span><input className="fc-input" required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Your full name" /></label>
            <label><span className="fc-label">Vehicle category *</span><select className="fc-input" value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}><option value="Bike">Motorcycle / Bike</option><option value="Scooter">EV Scooter / Activa</option><option value="Bicycle">Bicycle</option></select></label>
            <label><span className="fc-label">Vehicle registration *</span><input className="fc-input" required value={form.vehicleNumber} onChange={e=>setForm({...form,vehicleNumber:e.target.value})} placeholder="HR 51 AB 1234" /></label>
            <label><span className="fc-label">Driving license</span><input className="fc-input" value={form.dlNumber} onChange={e=>setForm({...form,dlNumber:e.target.value})} placeholder="DL-1420110012345" /></label>
            <label><span className="fc-label">Phone *</span><input className="fc-input" required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 98765 43210" /></label>
            <label><span className="fc-label">Email</span><input className="fc-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="driver@example.com" /></label>
            <label className="md:col-span-2"><span className="fc-label">Current operating address</span><input className="fc-input" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></label>
          </div>
          <div className="mt-7 pt-5 border-t border-gray-200"><div className="flex items-center gap-2"><FileCheck2 className="w-5 h-5" style={{color:'var(--fc-fresh)'}} /><h2 className="font-semibold text-gray-900">Identity & payout</h2></div><div className="grid md:grid-cols-2 gap-4 mt-4">
            <label><span className="fc-label">Aadhaar number</span><input className="fc-input" value={form.aadhaarNumber} onChange={e=>setForm({...form,aadhaarNumber:e.target.value})} placeholder="12-digit Aadhaar number" /></label>
            <label><span className="fc-label">Bank account number</span><input className="fc-input" value={form.bankAccount} onChange={e=>setForm({...form,bankAccount:e.target.value})} placeholder="Account number" /></label>
            <label><span className="fc-label">IFSC code</span><input className="fc-input" value={form.ifscCode} onChange={e=>setForm({...form,ifscCode:e.target.value})} placeholder="SBIN0001234" /></label>
          </div></div>
          <div className="mt-7 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 flex gap-2"><Wallet className="w-4 h-4 shrink-0" /> Payout information continues to be sent in the same backend payload as the existing Yenz application.</div>
          <button type="submit" disabled={submitting} className="mt-5 w-full fc-btn text-white disabled:opacity-50" style={{background:'var(--fc-fresh)',borderColor:'var(--fc-fresh)'}}>{submitting ? 'Submitting application…' : 'Submit driver verification'} <ArrowRight className="w-4 h-4" /></button>
        </form>}
      </main>
      <FreshCartFooter />
    </div>
  );
}
