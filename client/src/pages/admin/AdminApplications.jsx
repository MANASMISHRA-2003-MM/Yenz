import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import FreshCartFooter from '../../components/FreshCartFooter';
import {
  ShieldCheck, Store, Bike, CheckCircle2, XCircle, Clock, Search, Filter,
  Phone, Mail, MapPin, FileCheck2, User, ExternalLink, ArrowRight, X, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminApplications() {
  const [vendorApps, setVendorApps] = useState([]);
  const [driverApps, setDriverApps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL | VENDOR | DRIVER
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED

  // Inspection Modal
  const [selectedApp, setSelectedApp] = useState(null); // { app, type: 'vendor'|'driver' }
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [processing, setProcessing] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const [resVendor, resDriver] = await Promise.all([
        API.get('/admin/vendors/applications'),
        API.get('/admin/delivery-partners/applications')
      ]);

      if (resVendor.data.success) {
        setVendorApps(resVendor.data.applications || []);
      }
      if (resDriver.data.success) {
        setDriverApps(resDriver.data.applications || []);
      }
    } catch (err) {
      console.error('Error loading onboarding applications:', err);
      toast.error('Failed to load incoming onboarding requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVendorStatus = async (appId, status, note = '') => {
    try {
      setProcessing(true);
      const res = await API.put(`/admin/vendors/applications/${appId}/status`, {
        status,
        adminNotes: note || undefined
      });
      if (res.data.success) {
        toast.success(`Vendor application marked as ${status}`);
        setSelectedApp(null);
        setAdminNoteInput('');
        fetchApplications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update application status');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateDriverStatus = async (appId, status, note = '') => {
    try {
      setProcessing(true);
      const res = await API.put(`/admin/delivery-partners/applications/${appId}/status`, {
        status,
        adminNotes: note || undefined
      });
      if (res.data.success) {
        toast.success(`Driver application marked as ${status}`);
        setSelectedApp(null);
        setAdminNoteInput('');
        fetchApplications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update application status');
    } finally {
      setProcessing(false);
    }
  };

  // Combine & filter applications
  const combinedApplications = useMemo(() => {
    const vendors = vendorApps.map(app => ({
      id: app.id,
      appType: 'VENDOR',
      applicantName: app.fullName || app.User?.fullName || app.User?.name || 'Store Applicant',
      businessName: app.businessName,
      subType: app.vendorType || 'CRAVINGS',
      phone: app.phone || app.User?.phone || '',
      email: app.email || app.User?.email || '',
      address: `${app.address || ''}, ${app.city || ''} - ${app.pincode || ''}`,
      city: app.city,
      status: app.status || 'PENDING',
      createdAt: app.createdAt,
      adminNotes: app.adminNotes,
      details: {
        fssaiNumber: app.fssaiNumber,
        gstNumber: app.gstNumber,
        documents: app.documents
      },
      raw: app
    }));

    const drivers = driverApps.map(app => ({
      id: app.id,
      appType: 'DRIVER',
      applicantName: app.fullName || app.User?.fullName || 'Driver Applicant',
      businessName: `${app.vehicleType || 'Vehicle'} Driver (${app.vehicleNumber || 'Unregistered'})`,
      subType: app.vehicleType || 'Fleet Partner',
      phone: app.phone || app.User?.phone || '',
      email: app.email || app.User?.email || '',
      address: app.address || 'Local Region',
      city: 'Faridabad',
      status: app.status || 'PENDING',
      createdAt: app.createdAt,
      adminNotes: app.adminNotes,
      details: {
        vehicleNumber: app.vehicleNumber,
        dlNumber: app.dlNumber,
        bankDetails: app.bankDetails,
        documents: app.documents
      },
      raw: app
    }));

    let list = [];
    if (typeFilter === 'ALL') list = [...vendors, ...drivers];
    else if (typeFilter === 'VENDOR') list = vendors;
    else if (typeFilter === 'DRIVER') list = drivers;

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Filter by status
    if (statusFilter !== 'ALL') {
      list = list.filter(item => item.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item =>
        item.applicantName?.toLowerCase().includes(q) ||
        item.businessName?.toLowerCase().includes(q) ||
        item.phone?.includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q) ||
        item.subType?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [vendorApps, driverApps, typeFilter, statusFilter, searchQuery]);

  const pendingCount = useMemo(() => {
    const vPending = vendorApps.filter(a => a.status === 'PENDING').length;
    const dPending = driverApps.filter(a => a.status === 'PENDING').length;
    return { total: vPending + dPending, vendor: vPending, driver: dPending };
  }, [vendorApps, driverApps]);

  const approvedCount = useMemo(() => {
    const vApp = vendorApps.filter(a => a.status === 'APPROVED').length;
    const dApp = driverApps.filter(a => a.status === 'APPROVED').length;
    return { total: vApp + dApp, vendor: vApp, driver: dApp };
  }, [vendorApps, driverApps]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Page Banner & Header */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-50 border border-purple-200 text-purple-700 rounded-2xl flex items-center justify-center shrink-0">
              <FileCheck2 className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Incoming Partner Applications
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Onboarding Requests & Verification</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">Review registrations submitted via /vendor/onboarding & /delivery/onboarding.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="fc-btn text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
            >
              Back to Admin Console
            </button>
          </div>
        </div>

        {/* Analytics & Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Onboarding Submissions</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{vendorApps.length + driverApps.length}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-amber-200 bg-amber-50/20 shadow-soft">
            <p className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Action Required
            </p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{pendingCount.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{pendingCount.vendor} vendors · {pendingCount.driver} drivers</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-emerald-200 bg-emerald-50/20 shadow-soft">
            <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved Active Partners
            </p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{approvedCount.total}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-rose-200 bg-rose-50/20 shadow-soft">
            <p className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected / Need Info
            </p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">
              {(vendorApps.length + driverApps.length) - pendingCount.total - approvedCount.total}
            </p>
          </div>
        </div>

        {/* Filter & Controls Bar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-soft space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by store name, applicant, phone, email or city..."
              className="fc-input pl-10 pr-4 py-2.5 text-xs bg-slate-50 border-slate-300 rounded-2xl"
            />
          </div>

          {/* Type & Status Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl transition ${typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                All Types
              </button>
              <button
                onClick={() => setTypeFilter('VENDOR')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${typeFilter === 'VENDOR' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Store className="w-3.5 h-3.5" /> Stores ({vendorApps.length})
              </button>
              <button
                onClick={() => setTypeFilter('DRIVER')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 ${typeFilter === 'DRIVER' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Bike className="w-3.5 h-3.5" /> Drivers ({driverApps.length})
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="fc-input py-2 px-3 text-xs bg-slate-50 border-slate-300 rounded-2xl font-bold text-slate-700"
            >
              <option value="ALL">Status: All</option>
              <option value="PENDING">Pending Action Required</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Main List of Incoming Applications */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-xs font-bold text-slate-500">Fetching onboarding applications from database...</p>
          </div>
        ) : combinedApplications.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200/90 shadow-soft text-center text-slate-500">
            <FileCheck2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-extrabold text-slate-800">No onboarding applications found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">No incoming store or driver applications match your active search and status filter.</p>
            <button
              onClick={() => { setSearchQuery(''); setTypeFilter('ALL'); setStatusFilter('ALL'); }}
              className="mt-4 fc-btn text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {combinedApplications.map(item => (
              <div
                key={`${item.appType}-${item.id}`}
                className={`bg-white rounded-3xl border p-5 shadow-soft transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                  item.status === 'PENDING' ? 'border-amber-300 ring-2 ring-amber-500/10' :
                  item.status === 'APPROVED' ? 'border-emerald-200' : 'border-rose-200'
                }`}
              >
                <div className="space-y-4">
                  
                  {/* Badge & Type Header */}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      item.appType === 'VENDOR' ? 'bg-amber-100 text-amber-800' : 'bg-cyan-100 text-cyan-800'
                    }`}>
                      {item.appType === 'VENDOR' ? <Store className="w-3 h-3" /> : <Bike className="w-3 h-3" />}
                      {item.appType === 'VENDOR' ? `Store (${item.subType})` : `Driver (${item.subType})`}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      {item.status === 'PENDING' ? 'Action Needed' : item.status}
                    </span>
                  </div>

                  {/* Title & Applicant Name */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">{item.businessName}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" /> {item.applicantName}
                    </p>
                  </div>

                  {/* Contact & Location Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-900">{item.phone || 'No phone provided'}</span>
                    </div>
                    {item.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.email}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight text-slate-500 break-words">{item.address}</span>
                    </div>
                  </div>

                  {/* Document & Details Summary */}
                  {item.appType === 'VENDOR' ? (
                    <div className="text-[11px] text-slate-500 grid grid-cols-2 gap-2 font-mono bg-white p-2.5 rounded-xl border border-slate-100">
                      <div><span className="text-slate-400 font-sans block text-[9px] uppercase">FSSAI No:</span> {item.details.fssaiNumber || 'Not provided'}</div>
                      <div><span className="text-slate-400 font-sans block text-[9px] uppercase">GST No:</span> {item.details.gstNumber || 'Not provided'}</div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 grid grid-cols-2 gap-2 font-mono bg-white p-2.5 rounded-xl border border-slate-100">
                      <div><span className="text-slate-400 font-sans block text-[9px] uppercase">Vehicle No:</span> {item.details.vehicleNumber || 'Unregistered'}</div>
                      <div><span className="text-slate-400 font-sans block text-[9px] uppercase">DL No:</span> {item.details.dlNumber || 'Not provided'}</div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
                    <span>Submitted: {new Date(item.createdAt).toLocaleDateString()}</span>
                    <span>ID: #{item.id.slice(-6)}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                  
                  {/* Quick Direct Team Communication Buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {item.phone && (
                      <a
                        href={`tel:${item.phone}`}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        title="Call Applicant"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" /> Call
                      </a>
                    )}
                    {item.phone && (
                      <a
                        href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        title="WhatsApp Chat"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp
                      </a>
                    )}
                    {item.email && (
                      <a
                        href={`mailto:${item.email}`}
                        className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        title="Email Applicant"
                      >
                        <Mail className="w-3 h-3 text-purple-600" /> Email
                      </a>
                    )}
                  </div>

                  {/* Verification Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setSelectedApp(item)}
                      className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      Inspect & Verify <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* INSPECTION & VERIFICATION MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase mb-1 ${
                  selectedApp.appType === 'VENDOR' ? 'bg-amber-100 text-amber-800' : 'bg-cyan-100 text-cyan-800'
                }`}>
                  {selectedApp.appType === 'VENDOR' ? 'Vendor Store Registration' : 'Delivery Fleet Registration'}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900">{selectedApp.businessName}</h2>
                <p className="text-xs text-slate-500 font-medium">Submitted by {selectedApp.applicantName} on {new Date(selectedApp.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => { setSelectedApp(null); setAdminNoteInput(''); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Application Information Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Applicant & Contact Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                <div><span className="text-[10px] uppercase text-slate-400 font-bold block">Contact Person</span><span className="font-bold text-slate-800">{selectedApp.applicantName}</span></div>
                <div><span className="text-[10px] uppercase text-slate-400 font-bold block">Phone Number</span><span className="font-bold text-slate-800">{selectedApp.phone}</span></div>
                <div><span className="text-[10px] uppercase text-slate-400 font-bold block">Email Address</span><span className="font-semibold text-slate-700">{selectedApp.email || 'N/A'}</span></div>
                <div className="col-span-2 sm:col-span-3"><span className="text-[10px] uppercase text-slate-400 font-bold block">Operating Address</span><span className="font-medium text-slate-700">{selectedApp.address}</span></div>
              </div>

              {/* Compliance / Documents */}
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Compliance & Banking Information</h3>
              {selectedApp.appType === 'VENDOR' ? (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs font-mono">
                  <div><span className="text-[10px] uppercase text-slate-400 font-bold font-sans block">FSSAI License</span><span className="font-bold text-slate-800">{selectedApp.details.fssaiNumber || 'Not provided'}</span></div>
                  <div><span className="text-[10px] uppercase text-slate-400 font-bold font-sans block">GST Registration</span><span className="font-bold text-slate-800">{selectedApp.details.gstNumber || 'Not provided'}</span></div>
                  <div><span className="text-[10px] uppercase text-slate-400 font-bold font-sans block">Aadhaar Document No.</span><span className="font-bold text-slate-800">{selectedApp.details.documents?.aadhaarNumber || 'Masked / Protected'}</span></div>
                  <div><span className="text-[10px] uppercase text-slate-400 font-bold font-sans block">Bank Account</span><span className="font-bold text-slate-800">{selectedApp.details.documents?.bankAccount || 'Masked / Protected'}</span></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs font-mono">
                  <div><span className="text-[10px] uppercase text-slate-400 font-bold font-sans block">Vehicle Category</span><span className="font-bold text-slate-800">{selectedApp.subType}</span></div>
                  <div><span className="text-[10px] uppercase text-slate-400 font-bold font-sans block">Vehicle Number</span><span className="font-bold text-slate-800">{selectedApp.details.vehicleNumber || 'Unregistered'}</span></div>
                  <div><span className="text-[10px] uppercase text-slate-400 font-bold font-sans block">Driving License (DL)</span><span className="font-bold text-slate-800">{selectedApp.details.dlNumber || 'Not provided'}</span></div>
                  <div><span className="text-[10px] uppercase text-slate-400 font-bold font-sans block">Payout Bank Account</span><span className="font-bold text-slate-800">{selectedApp.details.bankDetails?.accountNumber || 'Masked'}</span></div>
                </div>
              )}

              {/* Direct Team Contact Bar */}
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-purple-900">Direct Contact Team Options:</span>
                <div className="flex gap-2">
                  <a href={`tel:${selectedApp.phone}`} className="fc-btn bg-emerald-600 text-white text-[11px] py-1.5 px-3">Call</a>
                  <a href={`https://wa.me/${selectedApp.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="fc-btn bg-green-700 text-white text-[11px] py-1.5 px-3">WhatsApp</a>
                  {selectedApp.email && <a href={`mailto:${selectedApp.email}`} className="fc-btn bg-purple-700 text-white text-[11px] py-1.5 px-3">Email</a>}
                </div>
              </div>

              {/* Admin Note Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Admin Verification Notes / Instructions (Optional)</label>
                <textarea
                  value={adminNoteInput}
                  onChange={e => setAdminNoteInput(e.target.value)}
                  placeholder="Enter notes for team record or feedback for applicant..."
                  className="fc-input text-xs h-20"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
              <button
                onClick={() => { setSelectedApp(null); setAdminNoteInput(''); }}
                className="fc-btn-secondary text-xs"
              >
                Close
              </button>

              <div className="flex gap-2">
                <button
                  disabled={processing}
                  onClick={() => {
                    if (selectedApp.appType === 'VENDOR') handleUpdateVendorStatus(selectedApp.id, 'REJECTED', adminNoteInput);
                    else handleUpdateDriverStatus(selectedApp.id, 'REJECTED', adminNoteInput);
                  }}
                  className="fc-btn bg-rose-600 hover:bg-rose-700 text-white text-xs px-4"
                >
                  <XCircle className="w-4 h-4" /> Reject Request
                </button>
                <button
                  disabled={processing}
                  onClick={() => {
                    if (selectedApp.appType === 'VENDOR') handleUpdateVendorStatus(selectedApp.id, 'APPROVED', adminNoteInput);
                    else handleUpdateDriverStatus(selectedApp.id, 'APPROVED', adminNoteInput);
                  }}
                  className="fc-btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve & Activate Partner
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      <FreshCartFooter />
    </div>
  );
}
