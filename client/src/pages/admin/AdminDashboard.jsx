import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import FreshCartFooter from '../../components/FreshCartFooter';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import ProductModal from '../../components/ProductModal';
import VendorModal from '../../components/VendorModal';
import MasterMenuStickyBar from '../../components/MasterMenuStickyBar';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import {
  ShieldCheck, CheckCircle2, XCircle, FileText, Store, Bike, Plus, Edit2,
  Trash2, History, Utensils, ShoppingBag, Eye, Tag, AlertCircle, Search, X, FileCheck2,
  Camera, MapPin, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { getUniversalProfileIcon } from '../../utils/imageUtils';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vendorApps, setVendorApps] = useState([]);
  const [driverApps, setDriverApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [riderSelfies, setRiderSelfies] = useState([]);
  const [loadingSelfies, setLoadingSelfies] = useState(false);

  // Cravings & Fresh Mandi state
  const [cravingsVendors, setCravingsVendors] = useState([]);
  const [freshVendors, setFreshVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorProducts, setVendorProducts] = useState([]);

  // Search & Filter state for menus & stores
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [restaurantSearch, setRestaurantSearch] = useState('');

  // Modals & History
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingVendor, setEditingVendor] = useState(null);
  const [priceHistoryModal, setPriceHistoryModal] = useState({ isOpen: false, history: [], title: '' });
  const [proofPhotoModal, setProofPhotoModal] = useState({ isOpen: false, url: '', title: '' });

  // New Category Input
  const [newCatName, setNewCatName] = useState('');

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (selectedVendor) {
      setProductSearch('');
      setProductCategoryFilter('ALL');
      fetchVendorProducts(selectedVendor.id || selectedVendor._id);
    }
  }, [selectedVendor]);

  // Dynamic categories for selected store
  const availableCategories = useMemo(() => {
    const cats = new Set();
    vendorProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [vendorProducts]);

  // Filtered menu items
  const filteredProducts = useMemo(() => {
    return vendorProducts.filter(p => {
      const q = productSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        String(p.price).includes(q);

      const matchesCat = productCategoryFilter === 'ALL' ||
        (p.category && p.category.toLowerCase() === productCategoryFilter.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [vendorProducts, productSearch, productCategoryFilter]);

  // Filtered vendors for left column
  const filteredCravingsVendors = useMemo(() => {
    if (!restaurantSearch.trim()) return cravingsVendors;
    const q = restaurantSearch.toLowerCase();
    return cravingsVendors.filter(v =>
      v.name?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      v.address?.toLowerCase().includes(q)
    );
  }, [cravingsVendors, restaurantSearch]);

  const filteredFreshVendors = useMemo(() => {
    if (!restaurantSearch.trim()) return freshVendors;
    const q = restaurantSearch.toLowerCase();
    return freshVendors.filter(v =>
      v.name?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      v.address?.toLowerCase().includes(q)
    );
  }, [freshVendors, restaurantSearch]);

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
      if (resOrders.data.success) setOrders(resOrders.data.orders);
      if (resCategories.data.success) setCategories(resCategories.data.categories || []);
      if (resCravings.data.success) setCravingsVendors(resCravings.data.restaurants || []);
      if (resFresh.data?.success) setFreshVendors(resFresh.data.restaurants || []);

      const isRealSelfie = (url) => {
        if (!url || typeof url !== 'string') return false;
        if (url.includes('icons8')) return false;
        if (url.length < 80) return false;
        return url.startsWith('data:image') || url.includes('cloudinary') || url.includes('unsplash');
      };

      let auditSelfies = [];
      try {
        const resSelfies = await API.get('/admin/delivery-partners/selfies').catch(() => null);
        if (resSelfies?.data?.success && Array.isArray(resSelfies.data.selfies)) {
          auditSelfies = resSelfies.data.selfies.filter(s => isRealSelfie(s.photo));
        }
      } catch (e) {}

      if (resUsers?.data?.success && Array.isArray(resUsers.data.users)) {
        setUsers(resUsers.data.users);
        const driverList = resUsers.data.users.filter(u => (u.role || '').toUpperCase() === 'DELIVERY_PARTNER');
        setDrivers(driverList);

        let combinedSelfies = [...auditSelfies];
        driverList
          .filter(d => isRealSelfie(d.avatar))
          .forEach(d => {
            if (!combinedSelfies.some(s => s.actorId === d.id || s.id === 'driver-' + d.id || s.id === 'user-avatar-' + d.id)) {
              combinedSelfies.push({
                id: 'driver-' + d.id,
                actorId: d.id,
                action: 'RIDER_ONLINE_SELFIE',
                riderName: d.fullName || d.name || 'Fleet Driver',
                phone: d.phone || '',
                photo: d.avatar,
                coords: (d.latitude && d.longitude) ? { lat: d.latitude, lng: d.longitude } : null,
                addressName: d.isOnline ? 'Online Shift Active' : 'Registered Driver Shift',
                capturedAt: d.updatedAt || d.createdAt || new Date().toISOString(),
                type: 'SHIFT_SELFIE'
              });
            }
          });

        try {
          const cached = localStorage.getItem('milega_latest_rider_selfie');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (isRealSelfie(parsed.photo) && !combinedSelfies.some(s => s.actorId === parsed.actorId)) {
              combinedSelfies.unshift(parsed);
            }
          }
        } catch (e) {}

        setRiderSelfies(combinedSelfies);

        // Synthesize direct registrations from users into vendorApps & driverApps so admin sees everyone who registered
        const existingVendors = resVendorApps.data?.applications || [];
        const existingDrivers = resDriverApps.data?.applications || [];
        const combinedVendors = [...existingVendors];
        const combinedDrivers = [...existingDrivers];

        resUsers.data.users.forEach(u => {
          const roleUpper = (u.role || '').toUpperCase();
          if (roleUpper === 'VENDOR') {
            if (!combinedVendors.some(v => v.userId === u.id || v.email === u.email)) {
              combinedVendors.push({
                id: 'user-' + u.id,
                userId: u.id,
                businessName: `${u.fullName || 'Partner Store'} (Direct Signup)`,
                fullName: u.fullName,
                phone: u.phone,
                email: u.email,
                address: u.address || 'Registered via Web/App',
                city: 'Noida',
                vendorType: 'CRAVINGS',
                status: 'PENDING',
                createdAt: u.createdAt || new Date().toISOString()
              });
            }
          } else if (roleUpper === 'DELIVERY_PARTNER') {
            if (!combinedDrivers.some(d => d.userId === u.id || d.email === u.email)) {
              combinedDrivers.push({
                id: 'user-' + u.id,
                userId: u.id,
                fullName: u.fullName,
                phone: u.phone,
                email: u.email,
                vehicleType: u.vehicleType || 'Bike',
                vehicleNumber: 'Direct Signup',
                status: 'PENDING',
                createdAt: u.createdAt || new Date().toISOString()
              });
            }
          }
        });

        setVendorApps(combinedVendors);
        setDriverApps(combinedDrivers);
      } else {
        if (resVendorApps.data?.success) setVendorApps(resVendorApps.data.applications || []);
        if (resDriverApps.data?.success) setDriverApps(resDriverApps.data.applications || []);
      }
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

  const fetchRiderSelfies = async () => {
    const isRealSelfie = (url) => {
      if (!url || typeof url !== 'string') return false;
      if (url.includes('icons8')) return false;
      if (url.length < 80) return false;
      return url.startsWith('data:image') || url.includes('cloudinary') || url.includes('unsplash');
    };

    try {
      setLoadingSelfies(true);
      let combined = [];

      try {
        const resSelfies = await API.get('/admin/delivery-partners/selfies').catch(() => null);
        if (resSelfies?.data?.success && Array.isArray(resSelfies.data.selfies)) {
          combined = resSelfies.data.selfies.filter(s => isRealSelfie(s.photo));
        }
      } catch (e) {}

      const res = await API.get('/admin/users');
      if (res.data?.success && Array.isArray(res.data.users)) {
        const driversList = res.data.users.filter(u => (u.role || '').toUpperCase() === 'DELIVERY_PARTNER');
        setDrivers(driversList);
        driversList.forEach(d => {
          if (isRealSelfie(d.avatar) && !combined.some(s => s.actorId === d.id || s.id === 'driver-' + d.id || s.id === 'user-avatar-' + d.id)) {
            combined.push({
              id: 'driver-' + d.id,
              actorId: d.id,
              action: 'RIDER_ONLINE_SELFIE',
              riderName: d.fullName || d.name || 'Fleet Driver',
              phone: d.phone || '',
              photo: d.avatar,
              coords: (d.latitude && d.longitude) ? { lat: d.latitude, lng: d.longitude } : null,
              addressName: d.isOnline ? 'Online Shift Active' : 'Registered Driver Shift',
              capturedAt: d.updatedAt || d.createdAt || new Date().toISOString(),
              type: 'SHIFT_SELFIE'
            });
          }
        });
      }

      try {
        const cached = localStorage.getItem('milega_latest_rider_selfie');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (isRealSelfie(parsed.photo) && !combined.some(s => s.actorId === parsed.actorId)) {
            combined.unshift(parsed);
          }
        }
      } catch (e) {}

      setRiderSelfies(combined);
    } catch (err) {
      console.warn('Driver records fetch error:', err?.message);
    } finally {
      setLoadingSelfies(false);
    }
  };

  const handleDeleteDriverSelfie = async (selfie) => {
    const riderName = selfie.riderName || 'this driver';
    if (!window.confirm(`Are you sure you want to delete the shift selfie for ${riderName}?`)) {
      return;
    }
    const driverId = selfie.actorId || (selfie.id ? selfie.id.replace('driver-', '') : null);
    if (!driverId) {
      toast.error('Driver ID not found');
      return;
    }
    try {
      // 1. Reset avatar in User database record
      await API.put(`/admin/users/${driverId}`, {
        avatar: 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'
      });

      // 2. Clear selfie from audit logs in database
      await API.delete(`/admin/delivery-partners/selfies/${selfie.id || driverId}`, {
        data: { actorId: driverId }
      }).catch(e => console.warn('Selfie audit delete warning:', e.message));

      try {
        localStorage.removeItem('milega_latest_rider_selfie');
      } catch (e) {}

      setRiderSelfies(prev => prev.filter(s => s.id !== selfie.id && s.actorId !== driverId));
      setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, avatar: 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000' } : d));
      setUsers(prev => prev.map(u => u.id === driverId ? { ...u, avatar: 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000' } : u));
      toast.success(`Deleted verification selfie for ${riderName} from database`);
    } catch (err) {
      console.error('Failed to delete selfie:', err);
      toast.error('Failed to delete driver selfie from database');
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

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await API.put(`/orders/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Order #${orderId.slice(-6)} updated to ${newStatus}`);
        fetchAdminData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleVendorAppStatus = async (appId, status) => {
    try {
      const app = vendorApps.find(a => a.id === appId);
      const userId = app?.userId || (appId.startsWith('user-') ? appId.replace('user-', '') : null);

      if (status === 'APPROVED') {
        const vendorType = (app?.vendorType && app.vendorType.toUpperCase().includes('FRESH')) ? 'FRESH' : 'CRAVINGS';

        if (!appId.startsWith('user-')) {
          await API.put(`/admin/vendors/applications/${appId}/status`, { status: 'APPROVED', vendorType }).catch(() => {});
        }

        if (userId) {
          await API.put(`/admin/users/${userId}`, { role: 'VENDOR', status: 'ACTIVE', isVerified: true }).catch(() => {});
        }

        try {
          await API.post('/restaurants', {
            ownerUserId: userId,
            name: app?.businessName?.replace(' (Direct Signup)', '') || `${app?.fullName || 'Partner'}'s Store`,
            vendorType,
            phone: app?.phone,
            email: app?.email,
            address: app?.address || 'Main Market',
            city: app?.city || 'Noida'
          });
        } catch (e) {}

        toast.success(`Store approved and created under ${vendorType === 'FRESH' ? 'FRESH MANDI' : 'CRAVINGS (Food)'}!`);
        fetchAdminData();
        return;
      }

      if (!appId.startsWith('user-')) {
        await API.put(`/admin/vendors/applications/${appId}/status`, { status });
      }
      if (userId) {
        await API.put(`/admin/users/${userId}`, { status: 'REJECTED', isVerified: false }).catch(() => {});
      }
      toast.success(`Vendor application ${status}`);
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleDriverAppStatus = async (appId, status) => {
    try {
      const app = driverApps.find(a => a.id === appId);
      const userId = app?.userId || (appId.startsWith('user-') ? appId.replace('user-', '') : null);

      if (status === 'APPROVED') {
        if (!appId.startsWith('user-')) {
          await API.put(`/admin/delivery-partners/applications/${appId}/status`, { status: 'APPROVED' }).catch(() => {});
        }
        if (userId) {
          await API.put(`/admin/users/${userId}`, { role: 'DELIVERY_PARTNER', status: 'ACTIVE', isVerified: true }).catch(() => {});
        }
        toast.success('Driver application approved & activated! Visible in Available Drivers.');
        fetchAdminData();
        return;
      }

      if (!appId.startsWith('user-')) {
        await API.put(`/admin/delivery-partners/applications/${appId}/status`, { status });
      }
      if (userId) {
        await API.put(`/admin/users/${userId}`, { status: 'REJECTED', isVerified: false }).catch(() => {});
      }
      toast.success(`Driver application ${status}`);
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleDeleteVendorApp = async (app) => {
    const name = app.businessName || app.fullName || 'this store application';
    if (!window.confirm(`Permanently delete vendor application for "${name}" from database?`)) return;
    try {
      const userId = app.userId || (app.id.startsWith('user-') ? app.id.replace('user-', '') : null);
      if (!app.id.startsWith('user-')) {
        await API.delete(`/admin/vendors/applications/${app.id}`).catch(() => {});
      }
      if (userId) {
        await API.delete(`/admin/users/${userId}`).catch(async () => {
          await API.put(`/admin/users/${userId}`, { status: 'DELETED', isActive: false }).catch(() => {});
        });
      }
      setVendorApps(prev => prev.filter(v => v.id !== app.id && v.userId !== userId));
      toast.success(`Application for "${name}" deleted from database`);
    } catch (err) {
      toast.error('Failed to delete vendor application');
    }
  };

  const handleDeleteDriverApp = async (app) => {
    const name = app.fullName || 'this driver application';
    if (!window.confirm(`Permanently delete driver application for "${name}" from database?`)) return;
    try {
      const userId = app.userId || (app.id.startsWith('user-') ? app.id.replace('user-', '') : null);
      if (!app.id.startsWith('user-')) {
        await API.delete(`/admin/delivery-partners/applications/${app.id}`).catch(() => {});
      }
      if (userId) {
        await API.delete(`/admin/users/${userId}`).catch(async () => {
          await API.put(`/admin/users/${userId}`, { status: 'DELETED', isActive: false }).catch(() => {});
        });
      }
      setDriverApps(prev => prev.filter(d => d.id !== app.id && d.userId !== userId));
      toast.success(`Application for "${name}" deleted from database`);
    } catch (err) {
      toast.error('Failed to delete driver application');
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
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Milega Food Platform Management</h1>
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
              { id: 'rider_selfies', label: `Rider Shift Selfies (${riderSelfies.filter(s => s.photo && !s.photo.includes('icons8')).length})` },
              { id: 'users', label: 'Users' },
              { id: 'orders', label: 'Orders' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'cravings') setSelectedVendor(cravingsVendors[0] || null);
                  if (tab.id === 'fresh') setSelectedVendor(freshVendors[0] || null);
                  if (tab.id === 'rider_selfies') fetchRiderSelfies();
                }}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition ${activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {tab.label}
              </button>
            ))}
            <Link
              to="/admin/applications"
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 flex items-center gap-1.5 transition ml-1"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-purple-700" /> Full Applications Hub
            </Link>
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
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Restaurants ({filteredCravingsVendors.length})</h4>
                </div>

                {/* Restaurant Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search restaurants..."
                    value={restaurantSearch}
                    onChange={(e) => setRestaurantSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 font-medium"
                  />
                  {restaurantSearch && (
                    <button
                      onClick={() => setRestaurantSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                  {filteredCravingsVendors.map(v => (
                    <div
                      key={v._id || v.id}
                      onClick={() => setSelectedVendor(v)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${(selectedVendor?._id || selectedVendor?.id) === (v._id || v.id)
                          ? 'bg-amber-50 border-amber-300 shadow-sm'
                          : 'bg-white border-slate-200/90 hover:border-slate-300'
                        }`}
                    >
                      <img src={v.image || v.bannerImage || '/favicon.png'} alt="logo" className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-200 p-0.5" />
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
                  {filteredCravingsVendors.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 font-bold bg-white rounded-2xl border border-slate-200">
                      No restaurants match "{restaurantSearch}"
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Restaurant Menu Column */}
              <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
                {selectedVendor ? (
                  <>
                    {/* MASTER MENU STICKY BAR AT TOP OF RESTAURANT PRODUCTS */}
                    <MasterMenuStickyBar
                      restaurant={selectedVendor}
                      products={vendorProducts}
                      onProductUpdated={() => fetchVendorProducts(selectedVendor.id || selectedVendor._id)}
                      onRestaurantUpdated={(updated) => {
                        setSelectedVendor(updated);
                        setCravingsVendors(prev => prev.map(v => (v.id === updated.id || v._id === updated.id) ? updated : v));
                      }}
                      onAddProductClick={() => { setSelectedProduct(null); setIsProductModalOpen(true); }}
                      userRole="ADMIN"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">CRAVINGS STORE</span>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-1">{selectedVendor.name} — Menu ({vendorProducts.length})</h3>
                      </div>
                      <button
                        onClick={() => { setSelectedProduct(null); setIsProductModalOpen(true); }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition self-start sm:self-auto"
                      >
                        <Plus className="w-4 h-4" /> Add Food Product
                      </button>
                    </div>

                    {/* Food Product Live Search & Filter Bar */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search food by name, description, price..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 text-slate-900 font-medium shadow-sm"
                        />
                        {productSearch && (
                          <button
                            onClick={() => setProductSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 justify-between sm:justify-end">
                        {availableCategories.length > 0 && (
                          <select
                            value={productCategoryFilter}
                            onChange={(e) => setProductCategoryFilter(e.target.value)}
                            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 text-slate-700 font-bold shadow-sm"
                          >
                            <option value="ALL">All Categories ({vendorProducts.length})</option>
                            {availableCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        )}

                        {(productSearch || productCategoryFilter !== 'ALL') && (
                          <button
                            onClick={() => { setProductSearch(''); setProductCategoryFilter('ALL'); }}
                            className="text-[11px] text-purple-600 hover:text-purple-800 font-extrabold px-2.5 py-1.5 bg-purple-50 rounded-xl hover:bg-purple-100 transition whitespace-nowrap"
                          >
                            Reset
                          </button>
                        )}

                        <span className="text-[11px] font-extrabold text-slate-400 px-1 whitespace-nowrap">
                          {filteredProducts.length} of {vendorProducts.length}
                        </span>
                      </div>
                    </div>

                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                        <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                          <Search className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-600">No food items found matching your filters</p>
                        <button
                          onClick={() => { setProductSearch(''); setProductCategoryFilter('ALL'); }}
                          className="text-xs text-purple-600 font-extrabold hover:underline"
                        >
                          Clear search & category filter
                        </button>
                      </div>
                    ) : (
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
                            {filteredProducts.map(p => (
                              <tr key={p._id || p.id} className="hover:bg-slate-50">
                                <td className="p-3 flex items-center gap-3">
                                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-contain bg-slate-50 border border-slate-200 p-0.5" />
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
                                    title="Edit Product & Details"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(p._id || p.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Mandi Stores ({filteredFreshVendors.length})</h4>
                </div>

                {/* Mandi Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search Mandi stores..."
                    value={restaurantSearch}
                    onChange={(e) => setRestaurantSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  {restaurantSearch && (
                    <button
                      onClick={() => setRestaurantSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                  {filteredFreshVendors.map(v => (
                    <div
                      key={v._id || v.id}
                      onClick={() => setSelectedVendor(v)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${(selectedVendor?._id || selectedVendor?.id) === (v._id || v.id)
                          ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                          : 'bg-white border-slate-200/90 hover:border-slate-300'
                        }`}
                    >
                      <img src={v.image || v.bannerImage || '/favicon.png'} alt="logo" className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-200 p-0.5" />
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
                  {filteredFreshVendors.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-400 font-bold bg-white rounded-2xl border border-slate-200">
                      No Mandi stores match "{restaurantSearch}"
                    </div>
                  )}
                </div>
              </div>

              {/* Mandi Products & Weight Variants */}
              <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
                {selectedVendor ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">FRESH MANDI STORE</span>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-1">{selectedVendor.name} — Fresh Items ({vendorProducts.length})</h3>
                      </div>
                      <button
                        onClick={() => { setSelectedProduct(null); setIsProductModalOpen(true); }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition self-start sm:self-auto"
                      >
                        <Plus className="w-4 h-4" /> Add Fresh Produce
                      </button>
                    </div>

                    {/* Fresh Produce Live Search & Filter Bar */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search produce by name, description, price..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-900 font-medium shadow-sm"
                        />
                        {productSearch && (
                          <button
                            onClick={() => setProductSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 justify-between sm:justify-end">
                        {availableCategories.length > 0 && (
                          <select
                            value={productCategoryFilter}
                            onChange={(e) => setProductCategoryFilter(e.target.value)}
                            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-700 font-bold shadow-sm"
                          >
                            <option value="ALL">All Categories ({vendorProducts.length})</option>
                            {availableCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        )}

                        {(productSearch || productCategoryFilter !== 'ALL') && (
                          <button
                            onClick={() => { setProductSearch(''); setProductCategoryFilter('ALL'); }}
                            className="text-[11px] text-emerald-600 hover:text-emerald-800 font-extrabold px-2.5 py-1.5 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition whitespace-nowrap"
                          >
                            Reset
                          </button>
                        )}

                        <span className="text-[11px] font-extrabold text-slate-400 px-1 whitespace-nowrap">
                          {filteredProducts.length} of {vendorProducts.length}
                        </span>
                      </div>
                    </div>

                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                        <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                          <Search className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-600">No produce items found matching your filters</p>
                        <button
                          onClick={() => { setProductSearch(''); setProductCategoryFilter('ALL'); }}
                          className="text-xs text-emerald-600 font-extrabold hover:underline"
                        >
                          Clear search & category filter
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredProducts.map(p => (
                          <div key={p._id || p.id} className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-0.5" />
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
                                  title="Edit Product & Image"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p._id || p.id)}
                                  className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition"
                                  title="Delete Product"
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
                    )}
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
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
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 shadow-sm transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleVendorAppStatus(app.id, 'REJECTED')}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 shadow-sm transition"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 font-bold text-[10px]">Verified</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteVendorApp(app)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition border border-slate-200"
                          title="Directly delete vendor application from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
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
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 shadow-sm transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleDriverAppStatus(app.id, 'REJECTED')}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 shadow-sm transition"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 font-bold text-[10px]">Verified</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteDriverApp(app)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition border border-slate-200"
                          title="Directly delete driver application from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                        <img src={getUniversalProfileIcon(u.avatar)} alt="avatar" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
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
            <div className="p-4 border-b border-slate-100 font-extrabold text-sm text-slate-900 flex items-center justify-between">
              <div>
                <span>Platform Orders & Central Control ({orders.length})</span>
                <p className="text-xs text-slate-500 font-medium font-normal mt-0.5">Manage live order statuses, driver assignments, and admin delivery completion</p>
              </div>
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
                    <th className="p-3">Delivery Proofs</th>
                    <th className="p-3">Central Control Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orders.map(o => (
                    <tr key={o._id || o.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-extrabold text-slate-900">#{o.orderId || o.orderNumber || (o._id || o.id).slice(-6)}</td>
                      <td className="p-3">{o.customer?.name || o.customerId}</td>
                      <td className="p-3">{o.restaurant?.name || o.vendorId}</td>
                      <td className="p-3 font-extrabold text-brand-600">₹{o.totalAmount}</td>
                      <td className="p-3"><OrderStatusBadge status={o.status} /></td>
                      <td className="p-3 text-slate-700 font-bold">{o.deliveryPartner?.name || 'Unassigned'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {o.vendorHandoverPhoto ? (
                            <button
                              type="button"
                              onClick={() => setProofPhotoModal({ isOpen: true, url: o.vendorHandoverPhoto, title: `Vendor Handover Proof • Order #${o.orderNumber || o.id.slice(0, 8)}` })}
                              className="group relative flex flex-col items-center"
                              title="Click to view full vendor package handover photo"
                            >
                              <img
                                src={o.vendorHandoverPhoto}
                                alt="Vendor Handover"
                                className="w-9 h-9 rounded-lg object-cover border border-amber-300 shadow-sm group-hover:scale-105 transition"
                              />
                              <span className="text-[9px] font-extrabold text-amber-700 mt-0.5">Store</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-mono italic">No store pic</span>
                          )}

                          {o.riderDeliveryPhoto ? (
                            <button
                              type="button"
                              onClick={() => setProofPhotoModal({ isOpen: true, url: o.riderDeliveryPhoto, title: `Rider Dropoff Proof • Order #${o.orderNumber || o.id.slice(0, 8)}` })}
                              className="group relative flex flex-col items-center"
                              title="Click to view full rider delivery dropoff photo"
                            >
                              <img
                                src={o.riderDeliveryPhoto}
                                alt="Rider Dropoff"
                                className="w-9 h-9 rounded-lg object-cover border border-emerald-500 shadow-sm group-hover:scale-105 transition"
                              />
                              <span className="text-[9px] font-extrabold text-emerald-700 mt-0.5">Dropoff</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-mono italic">No dropoff pic</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        <select
                          value={o.deliveryPartner?._id || o.deliveryPartner?.id || ''}
                          onChange={(e) => handleAssignDriver(o._id || o.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Assign Driver...</option>
                          {drivers.map(d => (
                            <option key={d._id || d.id} value={d._id || d.id}>{d.name || d.fullName} ({d.vehicleType || 'Driver'})</option>
                          ))}
                        </select>

                        {/* Status Change Selector */}
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateOrderStatus(o._id || o.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PREPARING">PREPARING</option>
                          <option value="PACKING">PACKING</option>
                          <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>
                          <option value="ASSIGNED">ASSIGNED</option>
                          <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>

                        {/* Mark Completed Override Button */}
                        {o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(o._id || o.id, 'DELIVERED')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl flex items-center gap-1 shadow-sm transition whitespace-nowrap"
                            title="Mark Order as Complete (Delivered)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RIDER SHIFT SELFIES & ATTENDANCE TAB */}
        {activeTab === 'rider_selfies' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <Camera className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900">Rider Shift Front Camera Selfies</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-600 text-white">
                    {riderSelfies.filter(s => s.photo && !s.photo.includes('icons8')).length} Records
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Front camera live verification photos captured every time a delivery driver goes online. Stored in PostgreSQL audit log.
                </p>
              </div>
              <button
                onClick={fetchRiderSelfies}
                disabled={loadingSelfies}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition disabled:opacity-50"
              >
                <Camera className={`w-3.5 h-3.5 ${loadingSelfies ? 'animate-spin' : ''}`} />
                {loadingSelfies ? 'Refreshing...' : 'Refresh Records'}
              </button>
            </div>

            {loadingSelfies ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs bg-white rounded-3xl border border-slate-200">
                Loading live rider verification selfies...
              </div>
            ) : riderSelfies.filter(s => s.photo && !s.photo.includes('icons8')).length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-extrabold text-slate-700">No shift selfies recorded yet</p>
                <p className="text-xs text-slate-400">When delivery riders click "Go Online" in their dashboard, their front-camera verification will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {riderSelfies
                  .filter(selfie => selfie.photo && !selfie.photo.includes('icons8'))
                  .map(selfie => (
                  <div
                    key={selfie.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden flex flex-col hover:border-purple-300 transition group hover:shadow-md"
                  >
                    {/* Real Face Photo Viewport */}
                    <div
                      onClick={() => setProofPhotoModal({ isOpen: true, url: selfie.photo, title: `Shift Verification: ${selfie.riderName}` })}
                      className="relative h-64 bg-slate-950 cursor-pointer overflow-hidden group-hover:opacity-95 transition"
                    >
                      {selfie.photo ? (
                        <img
                          src={selfie.photo}
                          alt={selfie.riderName}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                          No Photo
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                        {selfie.action === 'VENDOR_HANDOVER_PHOTO' || selfie.type === 'VENDOR_HANDOVER' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm flex items-center gap-1">
                            <Store className="w-3 h-3" /> Store Handover Photo
                          </span>
                        ) : selfie.action === 'RIDER_DELIVERY_PHOTO' || selfie.type === 'DELIVERY_PROOF' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm flex items-center gap-1">
                            <Bike className="w-3 h-3" /> Delivery Doorstep Proof
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Live Front-Cam Selfie
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDriverSelfie(selfie);
                          }}
                          className="p-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-90 text-white shadow-lg transition flex items-center justify-center cursor-pointer"
                          title="Delete this driver verification selfie"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white text-[11px] flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-purple-200">
                          <Eye className="w-3.5 h-3.5 text-purple-300" /> Tap to Enlarge
                        </span>
                        <span className="text-white font-mono text-[11px] font-extrabold bg-black/50 px-2 py-0.5 rounded-md">
                          {new Date(selfie.capturedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </div>

                    {/* Card Details with Date & Time Prominently Displayed */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900 truncate">{selfie.riderName}</h4>
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-black">
                            {new Date(selfie.capturedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        {selfie.phone && (
                          <p className="text-xs font-bold text-slate-500">📞 {selfie.phone}</p>
                        )}
                      </div>

                      {/* Date & Time Timestamp Box */}
                      <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Captured: {new Date(selfie.capturedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} ({new Date(selfie.capturedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})</span>
                      </div>

                      {/* Location Box */}
                      <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                        <div className="flex items-start gap-1 font-semibold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {selfie.addressName || 'Live GPS Location Recorded'}
                          </span>
                        </div>
                        {selfie.coords && (
                          <div className="text-[10px] font-mono text-slate-400 pl-4.5">
                            {Number(selfie.coords.lat || selfie.coords.latitude).toFixed(4)}°, {Number(selfie.coords.lng || selfie.coords.longitude).toFixed(4)}°
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <FreshCartFooter />
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

      {/* Delivery Proof Photo Inspection Modal */}
      {proofPhotoModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-extrabold text-slate-900">{proofPhotoModal.title}</h3>
              <button
                onClick={() => setProofPhotoModal({ isOpen: false, url: '', title: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center">
              <img
                src={proofPhotoModal.url}
                alt="Delivery Proof"
                className="max-h-[60vh] w-auto max-w-full rounded-2xl object-contain shadow-lg"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Live Camera Verified • Stored in PostgreSQL</span>
              <button
                onClick={() => setProofPhotoModal({ isOpen: false, url: '', title: '' })}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition text-[11px]"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
