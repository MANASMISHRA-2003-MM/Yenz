import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { ShieldCheck, CheckCircle2, XCircle, FileText, UserCheck, Store, Bike } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vendorApps, setVendorApps] = useState([]);
  const [driverApps, setDriverApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [resMetrics, resAnalytics, resUsers, resOrders, resVendorApps, resDriverApps] = await Promise.all([
        API.get('/admin/metrics'),
        API.get('/analytics'),
        API.get('/admin/users'),
        API.get('/orders'),
        API.get('/admin/vendors/applications'),
        API.get('/admin/delivery-partners/applications')
      ]);

      if (resMetrics.data.success) setMetrics(resMetrics.data.metrics);
      if (resAnalytics.data.success) setAnalytics(resAnalytics.data);
      if (resUsers.data.success) {
        setUsers(resUsers.data.users);
        setDrivers(resUsers.data.users.filter(u => u.role === 'DELIVERY_PARTNER' || u.role === 'delivery_partner'));
      }
      if (resOrders.data.success) setOrders(resOrders.data.orders);
      if (resVendorApps.data.success) setVendorApps(resVendorApps.data.applications || []);
      if (resDriverApps.data.success) setDriverApps(resDriverApps.data.applications || []);
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDriver = async (orderId, deliveryPartnerId) => {
    try {
      const res = await API.put(`/orders/${orderId}/assign-delivery`, { deliveryPartnerId });
      if (res.data.success) {
        toast.success('Driver assigned successfully');
        fetchAdminData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    }
  };

  const handleVendorAppStatus = async (appId, status) => {
    try {
      const res = await API.put(`/admin/vendors/applications/${appId}/status`, { status });
      if (res.data.success) {
        toast.success(`Vendor application ${status}`);
        fetchAdminData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleDriverAppStatus = async (appId, status) => {
    try {
      const res = await API.put(`/admin/delivery-partners/applications/${appId}/status`, { status });
      if (res.data.success) {
        toast.success(`Driver application ${status}`);
        fetchAdminData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Admin Title & Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-2xl">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold">
                CENTRAL CONTROL SYSTEM
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Krawing Admin Control Panel</h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl flex-wrap">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'vendor_apps', label: `Vendor Apps (${vendorApps.filter(a => a.status === 'PENDING').length})` },
              { id: 'driver_apps', label: `Driver Apps (${driverApps.filter(a => a.status === 'PENDING').length})` },
              { id: 'users', label: 'Users' },
              { id: 'orders', label: 'Orders' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* METRICS CARDS */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">₹{metrics?.revenue || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Orders</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{metrics?.totalOrders || 0}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Pending Vendor Apps</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">{metrics?.pendingVendorApps || vendorApps.filter(a => a.status === 'PENDING').length}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Pending Driver Apps</p>
                <p className="text-2xl font-extrabold text-cyan-600 mt-1">{metrics?.pendingDeliveryApps || driverApps.filter(a => a.status === 'PENDING').length}</p>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft">
                <h3 className="text-sm font-extrabold text-slate-900 mb-4">Revenue & Orders Weekly Trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.revenueTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px' }} />
                      <Line type="monotone" dataKey="revenue" stroke="#ff4757" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col items-center justify-center">
                <h3 className="text-sm font-extrabold text-slate-900 mb-2">Order Status Distribution</h3>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.statusCounts || []}
                        dataKey="count"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label
                      >
                        {(analytics?.statusCounts || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VENDOR APPLICATIONS TAB */}
        {activeTab === 'vendor_apps' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-extrabold text-sm text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-500" />
                Vendor Onboarding Applications ({vendorApps.length})
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-400 font-extrabold">
                  <tr>
                    <th className="p-3">Store & Applicant</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">FSSAI / GST</th>
                    <th className="p-3">Masked Documents</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {vendorApps.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-slate-900">
                        <div>{app.businessName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{app.fullName} ({app.phone})</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${app.vendorType === 'FRESH' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {app.vendorType}
                        </span>
                      </td>
                      <td className="p-3">{app.city}, {app.pincode}</td>
                      <td className="p-3 font-mono text-[11px]">
                        <div>FSSAI: {app.fssaiNumber || 'N/A'}</div>
                        <div>GST: {app.gstNumber || 'N/A'}</div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        <div>Aadhaar: {app.documents?.aadhaarNumber || 'Masked'}</div>
                        <div>Bank: {app.documents?.bankAccount || 'Masked'}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          app.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        {app.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleVendorAppStatus(app.id, 'APPROVED')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleVendorAppStatus(app.id, 'REJECTED')}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 font-bold text-[10px]">Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DRIVER APPLICATIONS TAB */}
        {activeTab === 'driver_apps' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-extrabold text-sm text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-cyan-500" />
                Delivery Fleet Onboarding Applications ({driverApps.length})
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-400 font-extrabold">
                  <tr>
                    <th className="p-3">Applicant Name</th>
                    <th className="p-3">Vehicle Details</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">License (DL)</th>
                    <th className="p-3">Masked Payout Info</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {driverApps.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-slate-900">{app.fullName}</td>
                      <td className="p-3 font-bold text-slate-800">
                        {app.vehicleType} ({app.vehicleNumber})
                      </td>
                      <td className="p-3">{app.phone}</td>
                      <td className="p-3 font-mono text-[11px]">{app.dlNumber || 'N/A'}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        <div>Account: {app.bankDetails?.accountNumber || 'Masked'}</div>
                        <div>Aadhaar: {app.documents?.aadhaarNumber || 'Masked'}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          app.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        {app.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => handleDriverAppStatus(app.id, 'APPROVED')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleDriverAppStatus(app.id, 'REJECTED')}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 font-bold text-[10px]">Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS DIRECTORY TAB */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-extrabold text-sm text-slate-900">
              Registered Users Directory ({users.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-400 font-extrabold">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-slate-50">
                      <td className="p-3 font-extrabold text-slate-900 flex items-center gap-2">
                        <img src={u.avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                        <span>{u.name || u.fullName}</span>
                      </td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">{u.phone || 'N/A'}</td>
                      <td className="p-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ORDERS MANAGEMENT TAB */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-extrabold text-sm text-slate-900">
              Platform Orders & Driver Assignment ({orders.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-400 font-extrabold">
                  <tr>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Restaurant</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Assigned Driver</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orders.map(o => (
                    <tr key={o._id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-extrabold text-slate-900">#{o.orderId}</td>
                      <td className="p-3">{o.customer?.name}</td>
                      <td className="p-3">{o.restaurant?.name}</td>
                      <td className="p-3 font-extrabold text-brand-600">₹{o.totalAmount}</td>
                      <td className="p-3"><OrderStatusBadge status={o.status} /></td>
                      <td className="p-3 text-slate-700 font-bold">{o.deliveryPartner?.name || 'Unassigned'}</td>
                      <td className="p-3">
                        <select
                          value={o.deliveryPartner?._id || o.deliveryPartner?.id || ''}
                          onChange={(e) => handleAssignDriver(o._id || o.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Assign Driver...</option>
                          {drivers.map(d => (
                            <option key={d._id || d.id} value={d._id || d.id}>{d.name || d.fullName} ({d.vehicleType || 'Driver'})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
