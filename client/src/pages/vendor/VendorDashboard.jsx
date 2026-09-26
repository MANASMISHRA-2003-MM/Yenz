import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import ProductModal from '../../components/ProductModal';
import { Store, Flame, RefreshCw, PackageCheck, Plus, Edit2, Trash2, Tag, BellRing, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { startRepeatingAlert, stopAlertSound } from '../../utils/alertSound';

export default function VendorDashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'products'

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pendingAlertOrder, setPendingAlertOrder] = useState(null);

  useEffect(() => {
    fetchVendorData();

    socket.on('order:created', (data) => {
      fetchOrders();
      const newOrd = data?.order || data;
      setPendingAlertOrder(newOrd);
      startRepeatingAlert(() => {
        toast.warning('🚨 NEW INCOMING ORDER! Please accept now.');
      });
    });

    return () => {
      socket.off('order:created');
      stopAlertSound();
    };
  }, []);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      const [resRest, resOrders, resCats] = await Promise.all([
        API.get('/restaurants/vendor/me'),
        API.get('/orders'),
        API.get('/categories')
      ]);

      if (resRest.data.success) {
        const r = resRest.data.restaurant;
        setRestaurant(r);
        fetchMyProducts(r.id || r._id);
      }
      if (resOrders.data.success) setOrders(resOrders.data.orders);
      if (resCats.data.success) setCategories(resCats.data.categories || []);
    } catch (err) {
      console.error('Error fetching vendor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProducts = async (vendorId) => {
    try {
      const res = await API.get(`/foods?vendorId=${vendorId}&availableOnly=false`);
      if (res.data.success) {
        setProducts(res.data.foods || []);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await API.get('/orders');
      if (res.data.success) setOrders(res.data.orders);
    } catch (err) {
      console.error('Orders refresh error:', err);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await API.put(`/orders/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        fetchOrders();
        toast.success(`Order status updated to ${newStatus}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleToggleAvailability = async (product) => {
    try {
      const res = await API.put(`/foods/${product._id || product.id}`, {
        isAvailable: !product.isAvailable
      });
      if (res.data.success) {
        toast.success(`Availability updated`);
        fetchMyProducts(restaurant.id || restaurant._id);
      }
    } catch (err) {
      toast.error('Failed to update availability');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Delete this product from your store menu?')) return;
    try {
      const res = await API.delete(`/foods/${productId}`);
      if (res.data.success) {
        toast.success('Product deleted');
        fetchMyProducts(restaurant.id || restaurant._id);
      }
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');
  const totalRevenue = completedOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Urgent Incoming Order Ringing Banner */}
        {pendingAlertOrder && (
          <div className="bg-gradient-to-r from-amber-500 via-rose-600 to-slate-900 text-white p-6 rounded-3xl shadow-soft-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-pulse border-2 border-amber-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <BellRing className="w-10 h-10 text-yellow-300 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-md tracking-wider">
                  🚨 NEW CUSTOMER ORDER RECEIVED
                </span>
                <h3 className="text-xl font-extrabold mt-1">
                  Order #{pendingAlertOrder.orderNumber || pendingAlertOrder.orderId || 'NEW'} • ₹{pendingAlertOrder.totalAmount || 0}
                </h3>
                <p className="text-xs text-amber-100 font-medium mt-0.5">
                  Sound & Haptic Alarm Active (Repeats every 60s until confirmed)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const targetId = pendingAlertOrder._id || pendingAlertOrder.id;
                  handleUpdateStatus(targetId, 'CONFIRMED');
                  stopAlertSound();
                  setPendingAlertOrder(null);
                }}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm & Accept Order</span>
              </button>
            </div>
          </div>
        )}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={restaurant?.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'} alt="logo" className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase">
                  {restaurant?.vendorType || 'STORE'} OPEN
                </span>
                <span className="text-xs text-slate-400 font-mono font-bold">ID: {restaurant?._id || restaurant?.id}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{restaurant?.name || 'My Store'}</h1>
              <p className="text-xs text-slate-500 font-medium">{restaurant?.address}, {restaurant?.city}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Active Orders</p>
              <p className="text-xl font-extrabold text-brand-600">{activeOrders.length}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Revenue</p>
              <p className="text-xl font-extrabold text-emerald-600">₹{totalRevenue}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Section Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'orders' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Orders Pipeline ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'products' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Store Products ({products.length})
          </button>
        </div>

        {/* LIVE ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                Live Orders Pipeline
              </h2>
              <button
                onClick={fetchOrders}
                className="p-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl shadow-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {activeOrders.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeOrders.map((ord) => (
                  <div key={ord._id || ord.id} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-mono font-extrabold text-slate-800">#{ord.orderId || ord.orderNumber}</span>
                        <OrderStatusBadge status={ord.status} />
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="text-slate-500 font-medium">Customer: <strong className="text-slate-900">{ord.customer?.name}</strong></p>
                        <p className="text-slate-500 font-medium">Amount: <strong className="text-brand-600 font-extrabold">₹{ord.totalAmount}</strong></p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1 text-xs">
                        <p className="font-extrabold text-slate-700 border-b border-slate-200 pb-1">Items:</p>
                        {(ord.items || ord.OrderItem || []).map((it, i) => (
                          <div key={i} className="flex justify-between text-slate-600 font-medium">
                            <span>{it.quantity}x {it.name} ({it.selectedWeight || 'Std'})</span>
                            <span className="font-bold text-slate-900">₹{it.lineTotal || (it.price * it.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {ord.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(ord._id || ord.id, 'CONFIRMED')}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                        >
                          Accept & Confirm Order
                        </button>
                      )}

                      {ord.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleUpdateStatus(ord._id || ord.id, 'PREPARING')}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                        >
                          Mark as Preparing
                        </button>
                      )}

                      {ord.status === 'PREPARING' && (
                        <button
                          onClick={() => handleUpdateStatus(ord._id || ord.id, 'READY_FOR_PICKUP')}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                        >
                          Ready for Driver Pickup
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-soft">
                <PackageCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-extrabold text-slate-800">No Active Orders</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Incoming customer orders will update here automatically.</p>
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS MANAGEMENT TAB */}
        {activeTab === 'products' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Store Product Catalog ({products.length})</h3>
                <p className="text-xs text-slate-500 font-medium">Add products, edit prices, unit variants, and Cloudinary media</p>
              </div>
              <button
                onClick={() => { setSelectedProduct(null); setIsProductModalOpen(true); }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div key={p._id || p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-white" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-xs truncate">{p.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">{p.category || 'General'}</p>
                        <div className="text-xs font-extrabold text-emerald-700 mt-0.5">₹{p.price}</div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 font-normal line-clamp-2">{p.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleAvailability(p)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.isAvailable ? 'In Stock' : 'Out of Stock'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setSelectedProduct(p); setIsProductModalOpen(true); }}
                        className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-white transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p._id || p.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Product Edit/Create Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => { setIsProductModalOpen(false); setSelectedProduct(null); }}
        product={selectedProduct}
        vendorId={restaurant?.id || restaurant?._id}
        vendorType={restaurant?.vendorType || 'CRAVINGS'}
        categories={categories}
        onSaved={() => fetchMyProducts(restaurant.id || restaurant._id)}
      />

    </div>
  );
}
