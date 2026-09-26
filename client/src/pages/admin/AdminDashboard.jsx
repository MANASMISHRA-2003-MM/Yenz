import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import ProductModal from '../../components/ProductModal';
import VendorModal from '../../components/VendorModal';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import {
  ShieldCheck, CheckCircle2, XCircle, FileText, Store, Bike, Plus, Edit2,
  Trash2, History, Utensils, ShoppingBag, Eye, Tag, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vendorApps, setVendorApps] = useState([]);
  const [driverApps, setDriverApps] = useState([]);
  const [categories, setCategories] = useState([]);

  // Cravings & Fresh Mandi state
  const [cravingsVendors, setCravingsVendors] = useState([]);
  const [freshVendors, setFreshVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorProducts, setVendorProducts] = useState([]);

  // Modals & History
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [priceHistoryModal, setPriceHistoryModal] = useState({ isOpen: false, history: [], title: '' });

  // New Category Input
  const [newCatName, setNewCatName] = useState('');

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      fetchVendorProducts(selectedVendor.id || selectedVendor._id);
    }
  }, [selectedVendor]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [
        resMetrics,
        resAnalytics,
        resUsers,
        resOrders,
        resVendorApps,
        resDriverApps,
        resCategories,
        resCravings,
        resFresh
      ] = await Promise.all([
        API.get('/admin/metrics'),
        API.get('/analytics'),
        API.get('/admin/users'),
        API.get('/orders'),
        API.get('/admin/vendors/applications'),
        API.get('/admin/delivery-partners/applications'),
        API.get('/categories'),
        API.get('/restaurants?vendorType=CRAVINGS'),
        API.get('/restaurants?vendorType=FRESH')
      ]);

      if (resMetrics.data.success) setMetrics(resMetrics.data.metrics);
      if (resAnalytics.data.success) setAnalytics(resAnalytics.data);
      if (resUsers.data.success) {
        setUsers(resUsers.data.users);
        setDrivers(resUsers.data.users.filter(u => (u.role || '').toUpperCase() === 'DELIVERY_PARTNER'));
      }
      if (resOrders.data.success) setOrders(resOrders.data.orders);
      if (resVendorApps.data.success) setVendorApps(resVendorApps.data.applications || []);
      if (resDriverApps.data.success) setDriverApps(resDriverApps.data.applications || []);
      if (resCategories.data.success) setCategories(resCategories.data.categories || []);
      if (resCravings.data.success) setCravingsVendors(resCravings.data.restaurants || []);
      if (resFresh.data.success) setFreshVendors(resFresh.data.restaurants || []);
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorProducts = async (vendorId) => {
    try {
      const res = await API.get(`/foods?vendorId=${vendorId}&availableOnly=false`);
      if (res.data.success) {
        setVendorProducts(res.data.foods || []);
      }
    } catch (err) {
      toast.error('Failed to load store products');
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

  // Quick Price Edit with Audit Logging
  const handleQuickPriceUpdate = async (productId, newPrice, currentPrice) => {
    if (!newPrice || Number(newPrice) === Number(currentPrice)) return;
    try {
      const res = await API.put(`/foods/${productId}`, {
        price: Number(newPrice),
        priceChangeReason: 'Instant price adjustment via Admin Panel'
      });
      if (res.data.success) {
        toast.success(`Price updated to ₹${newPrice}`);
        if (selectedVendor) fetchVendorProducts(selectedVendor.id || selectedVendor._id);
      }
    } catch (err) {
      toast.error('Failed to update price');
    }
  };

  const handleQuickVariantPriceUpdate = async (variantId, newPrice, currentPrice) => {
    if (!newPrice || Number(newPrice) === Number(currentPrice)) return;
    try {
      const res = await API.put(`/foods/variants/${variantId}`, {
        price: Number(newPrice),
        reason: 'Variant price updated via Admin Mandi Manager'
      });
      if (res.data.success) {
        toast.success(`Variant price updated to ₹${newPrice}`);
        if (selectedVendor) fetchVendorProducts(selectedVendor.id || selectedVendor._id);
      }
    } catch (err) {
      toast.error('Failed to update variant price');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await API.delete(`/foods/${productId}`);
      if (res.data.success) {
        toast.success('Product deleted');
        if (selectedVendor) fetchVendorProducts(selectedVendor.id || selectedVendor._id);
      }
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const handleFetchPriceHistory = async (productId, productName) => {
    try {
      const res = await API.get(`/foods/${productId}/price-history`);
      if (res.data.success) {
        setPriceHistoryModal({
          isOpen: true,
          title: productName,
          history: res.data.history || []
        });
      }
    } catch (err) {
      toast.error('Failed to fetch price history');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      const res = await API.post('/categories', { name: newCatName });
      if (res.data.success) {
        toast.success('Category added');
        setNewCatName('');
        fetchAdminData();
      }
    } catch (err) {
      toast.error('Failed to add category');
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
        
        {/* Admin Title & Mode Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-2xl">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold">
                DATABASE-DRIVEN CENTRAL CONTROL
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Krawing Platform Management</h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl flex-wrap">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'cravings', label: 'CRAVINGS (Food)' },
              { id: 'fresh', label: 'FRESH MANDI' },
              { id: 'categories', label: 'Categories' },
              { id: 'vendor_apps', label: `Vendor Apps (${vendorApps.filter(a => a.status === 'PENDING').length})` },
              { id: 'driver_apps', label: `Driver Apps (${driverApps.filter(a => a.status === 'PENDING').length})` },
              { id: 'users', label: 'Users' },
              { id: 'orders', label: 'Orders' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'cravings') setSelectedVendor(cravingsVendors[0] || null);
                  if (tab.id === 'fresh') setSelectedVendor(freshVendors[0] || null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition ${
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

        {/* OVERVIEW TAB */}
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
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Cravings Vendors</p>
                <p className="text-2xl font-extrabold text-amber-600 mt-1">{cravingsVendors.length}</p>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Fresh Mandi Stores</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{freshVendors.length}</p>
              </div>
            </div>

            {/* CHARTS */}
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
                <h3 className="text-sm font-extrabold text-slate-900 mb-2">Order Distribution</h3>
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

        {/* CRAVINGS (FOOD MODE) MANAGEMENT */}
        {activeTab === 'cravings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-200 p-4 rounded-3xl">
              <div className="flex items-center gap-3">
                <Utensils className="w-6 h-6 text-amber-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">CRAVINGS Mode Store & Menu Catalog</h3>
                  <p className="text-xs text-slate-600 font-medium">Manage prepared food restaurants, menus, prices, and Cloudinary food images</p>
                </div>
              </div>
              <button
                onClick={() => { setEditingVendor(null); setIsVendorModalOpen(true); }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Add Restaurant
              </button>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              {/* Restaurant List Column */}
              <div className="lg:col-span-4 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Restaurants ({cravingsVendors.length})</h4>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {cravingsVendors.map(v => (
                    <div
                      key={v._id || v.id}
                      onClick={() => setSelectedVendor(v)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                        (selectedVendor?._id || selectedVendor?.id) === (v._id || v.id)
                          ? 'bg-amber-50 border-amber-300 shadow-sm'
                          : 'bg-white border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      <img src={v.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'} alt="logo" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-slate-900 text-xs truncate">{v.name}</h5>
                        <p className="text-[10px] text-slate-500 font-medium truncate">{v.address}, {v.city}</p>
                        <span className="text-[10px] text-amber-700 font-bold">★ {v.rating} • {v.deliveryTime}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingVendor(v); setIsVendorModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-white transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Restaurant Menu Column */}
              <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
                {selectedVendor ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">CRAVINGS STORE</span>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-1">{selectedVendor.name} — Menu ({vendorProducts.length})</h3>
                      </div>
                      <button
                        onClick={() => { setSelectedProduct(null); setIsProductModalOpen(true); }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" /> Add Food Product
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 uppercase text-[10px] text-slate-400 font-extrabold">
                          <tr>
                            <th className="p-3">Product</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Price (₹)</th>
                            <th className="p-3">Availability</th>
                            <th className="p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {vendorProducts.map(p => (
                            <tr key={p._id || p.id} className="hover:bg-slate-50">
                              <td className="p-3 flex items-center gap-3">
                                <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200" />
                                <div>
                                  <div className="font-extrabold text-slate-900">{p.name}</div>
                                  <div className="text-[10px] text-slate-400 font-normal">{p.description?.slice(0, 40)}...</div>
                                </div>
                              </td>
                              <td className="p-3 font-bold text-slate-800">{p.category || 'General'}</td>
                              <td className="p-3 font-extrabold text-slate-900">
                                <input
                                  type="number"
                                  defaultValue={p.price}
                                  onBlur={(e) => handleQuickPriceUpdate(p._id || p.id, e.target.value, p.price)}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono text-emerald-700 focus:outline-none focus:border-purple-500 bg-slate-50"
                                />
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                  {p.isAvailable ? 'AVAILABLE' : 'OUT OF STOCK'}
                                </span>
                              </td>
                              <td className="p-3 flex items-center gap-2">
                                <button
                                  onClick={() => handleFetchPriceHistory(p._id || p.id, p.name)}
                                  className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition"
                                  title="Price History Audit Trail"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setSelectedProduct(p); setIsProductModalOpen(true); }}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p._id || p.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16 text-slate-400 text-xs font-extrabold">
                    Select a restaurant from the left column to view & edit products.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FRESH MANDI (GROCERY/PRODUCE MODE) MANAGEMENT */}
        {activeTab === 'fresh' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-200 p-4 rounded-3xl">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-emerald-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">FRESH MANDI Mode Store & Unit Variant Catalog</h3>
                  <p className="text-xs text-slate-600 font-medium">Manage mandi vendors, vegetables/fruits, unit-based pricing (250g, 500g, 1kg), and Cloudinary images</p>
                </div>
              </div>
              <button
                onClick={() => { setEditingVendor(null); setIsVendorModalOpen(true); }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Add Mandi Store
              </button>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              {/* Mandi Vendors List */}
              <div className="lg:col-span-4 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Mandi Stores ({freshVendors.length})</h4>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {freshVendors.map(v => (
                    <div
                      key={v._id || v.id}
                      onClick={() => setSelectedVendor(v)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                        (selectedVendor?._id || selectedVendor?.id) === (v._id || v.id)
                          ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                          : 'bg-white border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      <img src={v.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e'} alt="logo" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-slate-900 text-xs truncate">{v.name}</h5>
                        <p className="text-[10px] text-slate-500 font-medium truncate">{v.address}, {v.city}</p>
                        <span className="text-[10px] text-emerald-700 font-bold">★ {v.rating} • {v.deliveryTime}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingVendor(v); setIsVendorModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mandi Products & Weight Variants */}
              <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
                {selectedVendor ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">FRESH MANDI STORE</span>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-1">{selectedVendor.name} — Fresh Items ({vendorProducts.length})</h3>
                      </div>
                      <button
                        onClick={() => { setSelectedProduct(null); setIsProductModalOpen(true); }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" /> Add Fresh Produce
                      </button>
                    </div>

                    <div className="space-y-4">
                      {vendorProducts.map(p => (
                        <div key={p._id || p.id} className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-xs">{p.name}</h4>
                                <span className="text-[10px] text-slate-500 font-medium">{p.category || 'Vegetables'} • Base Price: ₹{p.price}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleFetchPriceHistory(p._id || p.id, p.name)}
                                className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-purple-600 rounded-xl text-xs font-bold transition flex items-center gap-1"
                              >
                                <History className="w-3.5 h-3.5" /> History
                              </button>
                              <button
                                onClick={() => { setSelectedProduct(p); setIsProductModalOpen(true); }}
                                className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-amber-600 rounded-xl text-xs font-bold transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p._id || p.id)}
                                className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Unit Variants Pricing Table */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Unit Pricing Options</span>
                            {p.variants && p.variants.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {p.variants.map(v => (
                                  <div key={v._id || v.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                    <span className="font-extrabold text-slate-800">{v.name || `${v.quantity} ${v.unit}`}</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] font-bold text-slate-400">₹</span>
                                      <input
                                        type="number"
                                        defaultValue={v.price}
                                        onBlur={(e) => handleQuickVariantPriceUpdate(v._id || v.id, e.target.value, v.price)}
                                        className="w-14 px-1.5 py-0.5 text-xs font-mono font-extrabold text-emerald-700 bg-white border border-slate-200 rounded text-right focus:outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 font-medium italic">No custom weight variants created. Using standard base price ₹{p.price}.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16 text-slate-400 text-xs font-extrabold">
                    Select a Mandi Store from the left column to manage fresh produce variants.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CATEGORIES MANAGEMENT TAB */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Platform Global Categories ({categories.length})</h3>
                <p className="text-xs text-slate-500 font-medium">Add and organize product categories for CRAVINGS and FRESH MANDI</p>
              </div>
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-3 max-w-md">
              <input
                type="text"
                required
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="New Category Name (e.g. Organic Fruits)"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold focus:bg-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
              >
                Add Category
              </button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.map(c => (
                <div key={c._id || c.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-xs">{c.name}</span>
                  <Tag className="w-4 h-4 text-purple-600" />
                </div>
              ))}
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
                    <tr key={u._id || u.id} className="hover:bg-slate-50">
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
                    <tr key={o._id || o.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-extrabold text-slate-900">#{o.orderId || o.orderNumber}</td>
                      <td className="p-3">{o.customer?.name || o.customerId}</td>
                      <td className="p-3">{o.restaurant?.name || o.vendorId}</td>
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

      {/* Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => { setIsProductModalOpen(false); setSelectedProduct(null); }}
        product={selectedProduct}
        vendorId={selectedVendor?._id || selectedVendor?.id}
        vendorType={selectedVendor?.vendorType || 'CRAVINGS'}
        categories={categories}
        onSaved={() => {
          if (selectedVendor) fetchVendorProducts(selectedVendor.id || selectedVendor._id);
        }}
      />

      {/* Store Vendor Modal */}
      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => { setIsVendorModalOpen(false); setEditingVendor(null); }}
        vendor={editingVendor}
        defaultType={activeTab === 'fresh' ? 'FRESH' : 'CRAVINGS'}
        onSaved={fetchAdminData}
      />

      {/* Price History Audit Modal */}
      {priceHistoryModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-extrabold text-slate-900">Price Audit History: {priceHistoryModal.title}</h3>
              </div>
              <button onClick={() => setPriceHistoryModal({ isOpen: false, history: [], title: '' })} className="p-1 text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {priceHistoryModal.history.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {priceHistoryModal.history.map(h => (
                  <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between font-extrabold">
                      <span className="text-rose-600">₹{h.oldPrice}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-emerald-600">₹{h.newPrice}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{h.reason || 'Price adjustment'}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{new Date(h.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium py-4 text-center">No price change audit records found for this product.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
