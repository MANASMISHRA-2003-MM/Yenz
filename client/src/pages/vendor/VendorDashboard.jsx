import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import { Store, Flame, RefreshCw, PackageCheck, Tag, BellRing, CheckCircle2, XCircle, Bike, Volume2, Clock, MapPin, Timer, History, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { startRepeatingAlert, stopAlertSound, playActionSound, playCashRegisterSound, unlockAudio } from '../../utils/alertSound';
import { requestNotificationPermission, showBrowserAlert } from '../../utils/browserNotification';

import StoreStatusSlider from '../../components/StoreStatusSlider';

const formatOrderTiming = (dateStr) => {
  if (!dateStr) return { time: 'Recently', elapsed: 'Just now' };
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const diffMinutes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  let elapsed = 'Just now';
  if (diffMinutes === 1) elapsed = '1m ago';
  else if (diffMinutes > 1 && diffMinutes < 60) elapsed = `${diffMinutes}m ago`;
  else if (diffMinutes >= 60) elapsed = `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m ago`;
  return { time, elapsed, diffMinutes };
};

const getPredictedETA = (dateStr, prepOrDeliveryMinutes = 35) => {
  const base = dateStr ? new Date(dateStr) : new Date();
  const etaDate = new Date(base.getTime() + prepOrDeliveryMinutes * 60000);
  const etaTime = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return { etaTime, durationMinutes: prepOrDeliveryMinutes };
};

export default function VendorDashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const restaurantRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'products', 'history'
  const [pendingAlertOrder, setPendingAlertOrder] = useState(null);

  useEffect(() => {
    restaurantRef.current = restaurant;
    if (restaurant?.id) {
      socket.emit('join_vendor_room', restaurant.id);
    }
  }, [restaurant]);

  useEffect(() => {
    fetchVendorData();
    unlockAudio();
    requestNotificationPermission();

    const handleNewOrder = (data) => {
      const newOrd = data?.order || data;
      // Strict vendor isolation: ignore orders belonging to other restaurants
      if (restaurantRef.current?.id && newOrd?.vendorId && String(newOrd.vendorId) !== String(restaurantRef.current.id)) {
        return;
      }

      fetchOrders();
      setPendingAlertOrder(newOrd);

      // Trigger background browser notification, cash register sound & haptic vibration
      showBrowserAlert({
        title: `🚨 NEW ORDER #${newOrd.orderNumber || newOrd.id}`,
        body: `Order amount: ₹${newOrd.totalAmount || 0}. Tap to open vendor dashboard and start preparing.`,
        tag: `order-${newOrd.id || Date.now()}`,
        url: '/vendor/dashboard'
      });

      startRepeatingAlert(() => {
        toast.warning('🚨 NEW INCOMING ORDER! Tap to accept now.');
      });
    };

    const handleStatusUpdate = () => {
      fetchOrders();
    };

    socket.on('order:created', handleNewOrder);
    socket.on('order:new', handleNewOrder);
    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('delivery:status_updated', handleStatusUpdate);
    socket.on('order:delivered', handleStatusUpdate);

    return () => {
      socket.off('order:created', handleNewOrder);
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_updated', handleStatusUpdate);
      socket.off('delivery:status_updated', handleStatusUpdate);
      socket.off('order:delivered', handleStatusUpdate);
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
        restaurantRef.current = r;
        if (r?.id) {
          socket.emit('join_vendor_room', r.id);
        }
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

  // Continuous alarm ringing for any unhandled PENDING order until vendor accepts or rejects
  useEffect(() => {
    const unhandledPending = orders.filter(o => o.status === 'PENDING');
    if (unhandledPending.length > 0) {
      setPendingAlertOrder(unhandledPending[0]);
      startRepeatingAlert(() => {
        toast.warning('🚨 UNACCEPTED ORDER WAITING! Tap Accept or Reject now.');
      });
    } else {
      stopAlertSound();
      setPendingAlertOrder(null);
    }
  }, [orders]);

  const handleUpdateStatus = async (orderId, newStatus, note = '') => {
    try {
      const res = await API.put(`/orders/${orderId}/status`, { status: newStatus, note });
      if (res.data.success) {
        stopAlertSound();
        playActionSound();
        setPendingAlertOrder(null);
        fetchOrders();
        toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleToggleAvailability = async (product) => {
    try {
      const targetId = product._id || product.id;
      const nextAvailable = !product.isAvailable;
      const res = await API.put(`/foods/${targetId}`, {
        isAvailable: nextAvailable
      });
      if (res.data.success) {
        toast.success(`"${product.name}" marked ${nextAvailable ? 'Available' : 'Out of Stock'}`);
        setProducts(prev => prev.map(p => ((p.id === targetId || p._id === targetId) ? { ...p, isAvailable: nextAvailable } : p)));
      }
    } catch (err) {
      toast.error('Failed to update product availability');
    }
  };

  const [togglingStatus, setTogglingStatus] = useState(false);

  const handleToggleStoreStatus = async () => {
    try {
      setTogglingStatus(true);
      const res = await API.put('/restaurants/vendor/toggle-status');
      if (res.data.success) {
        const updatedRest = res.data.restaurant;
        setRestaurant(updatedRest);
        restaurantRef.current = updatedRest;
        const isNowOpen = updatedRest.status === 'open';
        toast.success(res.data.message || `Store is now ${isNowOpen ? 'ONLINE (Open)' : 'OFFLINE (Closed)'}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle store status');
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeOrders = orders.filter(o => ['PENDING', 'CONFIRMED', 'PREPARING'].includes(o.status));
  const completedOrders = orders.filter(o => ['READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'COMPLETED'].includes(o.status));
  const totalRevenue = completedOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);
  const isOpen = restaurant?.status === 'open';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Quick Audio & Haptic Vibration Test Bar */}
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-amber-900 text-xs shadow-sm">
          <div className="flex items-center gap-2 font-extrabold">
            <Volume2 className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>🔔 Sound Alarms & Haptic Vibration Alerts are ACTIVE for new orders</span>
          </div>
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              playCashRegisterSound();
              triggerHaptics();
              toast.success('🔔 Sound alarm & mobile vibration tested successfully!');
            }}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] rounded-xl shadow-sm transition active:scale-95"
          >
            Test Sound & Vibration
          </button>
        </div>

        {/* Premium Itemized New Order Decision Modal Overlay */}
        {pendingAlertOrder && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-0 flex flex-col my-auto">
              
              {/* Animated Alarm Header */}
              <div className="bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-white p-5 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-2xl animate-bounce">
                    <BellRing className="w-7 h-7 text-yellow-300" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-md tracking-wider">
                      🚨 INCOMING CUSTOMER ORDER
                    </span>
                    <h3 className="text-lg font-black mt-0.5">
                      Order #{pendingAlertOrder.orderNumber || pendingAlertOrder.orderId || 'NEW'}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Modal Content Details */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                
                {/* Customer & Location Details */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Customer Name:</span>
                    <strong className="text-slate-900 font-extrabold text-sm">{pendingAlertOrder.customer?.name || pendingAlertOrder.customerName || 'Customer'}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Order Placed:</span>
                    <strong className="text-slate-900 font-bold">{formatOrderTiming(pendingAlertOrder.placedAt).time} ({formatOrderTiming(pendingAlertOrder.placedAt).elapsed})</strong>
                  </div>
                  <div className="flex items-start gap-2 pt-1 text-slate-700">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>Dropoff: <strong className="text-slate-900 font-extrabold">{pendingAlertOrder.locationName || pendingAlertOrder.customerLocationName || pendingAlertOrder.address?.addressLine || 'Customer Delivery Address'}</strong></span>
                  </div>
                </div>

                {/* Itemized Order Breakdown */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Itemized Order Items:</h4>
                  <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-3 space-y-2 max-h-48 overflow-y-auto">
                    {(pendingAlertOrder.items || pendingAlertOrder.OrderItem || []).map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/60 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-[11px] shrink-0">
                            {it.quantity}x
                          </span>
                          <div>
                            <p className="font-extrabold text-slate-900">{it.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{it.selectedWeight || 'Std'}</p>
                          </div>
                        </div>
                        <span className="font-black text-slate-900">₹{it.lineTotal || (it.price * it.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Price Summary */}
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">Total Order Amount</p>
                    <p className="text-2xl font-black text-emerald-800">₹{pendingAlertOrder.totalAmount || 0}</p>
                  </div>
                  <div className="text-right text-[11px] text-emerald-700 font-medium">
                    <span>Payment Mode: <strong>COD</strong></span>
                  </div>
                </div>

              </div>

              {/* Decision Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const targetId = pendingAlertOrder._id || pendingAlertOrder.id;
                    stopAlertSound();
                    handleUpdateStatus(targetId, 'CONFIRMED', 'Vendor accepted order. Dispatching nearby delivery partners.');
                    setPendingAlertOrder(null);
                  }}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Accept Order</span>
                </button>

                <button
                  onClick={() => {
                    const targetId = pendingAlertOrder._id || pendingAlertOrder.id;
                    stopAlertSound();
                    handleUpdateStatus(targetId, 'CANCELLED', 'Vendor rejected the order.');
                    setPendingAlertOrder(null);
                  }}
                  className="py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <XCircle className="w-5 h-5" />
                  <span>Reject Order</span>
                </button>
              </div>

            </div>
          </div>
        )}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={restaurant?.image || restaurant?.bannerImage || '/favicon.png'} alt="logo" className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  isOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {restaurant?.vendorType || 'STORE'} {isOpen ? 'OPEN' : 'CLOSED'}
                </span>
                <span className="text-xs text-slate-400 font-mono font-bold">ID: {restaurant?._id || restaurant?.id}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{restaurant?.name || 'My Store'}</h1>
              <p className="text-xs text-slate-500 font-medium">{restaurant?.address}, {restaurant?.city}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {/* Vendor Interactive Store Status Slider Switch */}
            <StoreStatusSlider
              isOpen={isOpen}
              onToggle={handleToggleStoreStatus}
              loading={togglingStatus}
            />

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
        </div>

        {/* Dashboard Section Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition ${
                activeTab === 'history' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Order History ({completedOrders.length})
            </button>
          </div>

          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold rounded-xl transition shadow-sm"
          >
            <History className="w-3.5 h-3.5" />
            <span>Open Full History Screen →</span>
          </Link>
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

            {/* URGENT INCOMING ORDER ALERT BANNER WITH ITEMIZED PREVIEW & BUTTON PRICES */}
            {pendingAlertOrder && (
              <div className="bg-gradient-to-r from-amber-500 via-rose-600 to-slate-900 text-white p-6 rounded-3xl shadow-soft-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-pulse border-2 border-amber-300">
                <div className="flex items-start gap-4 flex-1 w-full">
                  <div className="p-3 bg-white/20 rounded-2xl animate-bounce shrink-0 mt-1">
                    <BellRing className="w-8 h-8 text-yellow-300" />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-black tracking-wider bg-white/20 px-2.5 py-1 rounded-md text-yellow-300">
                        🚨 NEW INCOMING ORDER (RINGING)
                      </span>
                      <span className="text-xs font-mono font-black bg-black/30 px-2 py-0.5 rounded-md">
                        #{pendingAlertOrder.orderNumber || pendingAlertOrder.orderId || 'NEW'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-rose-100 font-semibold">
                      <span className="text-white font-extrabold text-sm">Customer: {pendingAlertOrder.customer?.name || pendingAlertOrder.customerName || 'Customer'}</span>
                      <span className="flex items-center gap-1 text-yellow-200">
                        <Clock className="w-3.5 h-3.5 text-yellow-300" /> Placed: {formatOrderTiming(pendingAlertOrder.placedAt).time} ({formatOrderTiming(pendingAlertOrder.placedAt).elapsed})
                      </span>
                      <span className="flex items-center gap-1 text-emerald-200 font-bold truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" /> Dropoff: {pendingAlertOrder.locationName || pendingAlertOrder.customerLocationName || pendingAlertOrder.address?.addressLine || 'Customer Delivery Address'}
                      </span>
                    </div>

                    {/* Itemized Order Items Preview inside Banner */}
                    <div className="bg-black/40 backdrop-blur-sm p-3.5 rounded-2xl border border-white/20 space-y-1.5 text-xs max-h-36 overflow-y-auto">
                      <p className="text-[10px] font-black uppercase text-yellow-300 tracking-wider">Ordered Items ({ (pendingAlertOrder.items || pendingAlertOrder.OrderItem || []).length }):</p>
                      {(pendingAlertOrder.items || pendingAlertOrder.OrderItem || []).map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-white/90 font-bold py-1 border-b border-white/10 last:border-0">
                          <span className="truncate pr-2">{it.quantity}x {it.name} <span className="text-[10px] text-yellow-200/80 font-normal">({it.selectedWeight || 'Std'})</span></span>
                          <span className="font-black text-emerald-300 shrink-0">₹{it.lineTotal || (it.price * it.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Independent Accept / Reject Buttons with Explicit Price */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch gap-2.5 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => {
                      const targetId = pendingAlertOrder._id || pendingAlertOrder.id;
                      stopAlertSound();
                      handleUpdateStatus(targetId, 'CONFIRMED', 'Vendor accepted order. Dispatching nearby delivery partners.');
                      setPendingAlertOrder(null);
                    }}
                    className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs rounded-2xl shadow-xl transition flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>Accept Order • ₹{pendingAlertOrder.totalAmount || 0}</span>
                  </button>

                  <button
                    onClick={() => {
                      const targetId = pendingAlertOrder._id || pendingAlertOrder.id;
                      stopAlertSound();
                      handleUpdateStatus(targetId, 'CANCELLED', 'Vendor rejected the order.');
                      setPendingAlertOrder(null);
                    }}
                    className="px-5 py-3.5 bg-rose-700 hover:bg-rose-800 active:scale-95 text-white font-black text-xs rounded-2xl shadow-xl transition flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <XCircle className="w-5 h-5 text-white" />
                    <span>Reject Order • ₹{pendingAlertOrder.totalAmount || 0}</span>
                  </button>
                </div>
              </div>
            )}

            {activeOrders.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeOrders.map((ord) => (
                  <div key={ord._id || ord.id} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-mono font-extrabold text-slate-800">#{ord.orderId || ord.orderNumber}</span>
                        <OrderStatusBadge status={ord.status} />
                      </div>

                      <div className="text-xs space-y-1.5">
                        <p className="text-slate-500 font-medium">Customer: <strong className="text-slate-900">{ord.customer?.name || 'Customer'}</strong></p>
                        <p className="text-slate-500 font-medium">Amount: <strong className="text-brand-600 font-extrabold">₹{ord.totalAmount}</strong></p>

                        {/* Order Placement Timing */}
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium pt-1">
                          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Placed: <strong className="text-slate-900">{formatOrderTiming(ord.placedAt).time}</strong> ({formatOrderTiming(ord.placedAt).elapsed})</span>
                        </div>

                        {/* User Delivery Location Name */}
                        <div className="flex items-start gap-1.5 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">
                            Dropoff: <strong className="text-slate-900">{ord.locationName || ord.customerLocationName || (ord.address ? `${ord.address.addressLine}, ${ord.address.city}` : 'Customer Delivery Address')}</strong>
                          </span>
                        </div>

                        {/* Predicted Completion ETA */}
                        <div className="flex items-center gap-1.5 p-2 bg-amber-50/90 border border-amber-200/90 rounded-xl text-[11px] text-amber-900 font-semibold mt-1">
                          <Timer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Est. Prep: ~{ord.estimatedPrepMinutes || 15}m • Order ETA: ~{getPredictedETA(ord.placedAt, ord.predictedDeliveryMinutes || 35).etaTime}</span>
                        </div>
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
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleUpdateStatus(ord._id || ord.id, 'CONFIRMED', 'Vendor accepted order. Dispatching nearby delivery partners.')}
                            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accept • ₹{ord.totalAmount}</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(ord._id || ord.id, 'CANCELLED', 'Order rejected by store due to unavailability.')}
                            className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject • ₹{ord.totalAmount}</span>
                          </button>
                        </div>
                      )}

                      {['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED'].includes(ord.status) && (
                        <div className="space-y-2">
                          {['CONFIRMED', 'PREPARING', 'ASSIGNED'].includes(ord.status) && (
                            <button
                              onClick={() => handleUpdateStatus(ord._id || ord.id, 'READY_FOR_PICKUP', 'Order prepared by store and ready for pickup.')}
                              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
                            >
                              <PackageCheck className="w-4 h-4" />
                              <span>Mark Order Prepared (Ready for Pickup)</span>
                            </button>
                          )}

                          {ord.status === 'READY_FOR_PICKUP' && (
                            <div className="py-2 px-3 bg-teal-50 text-teal-800 text-xs font-extrabold rounded-xl border border-teal-200 flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-teal-600" />
                              <span>Order Prepared & Ready for Pickup</span>
                            </div>
                          )}

                          {ord.deliveryPartner ? (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                              <div className="flex items-center justify-between font-extrabold">
                                <span className="flex items-center gap-1.5">
                                  <Bike className="w-4 h-4 text-emerald-600" />
                                  <span>Rider Assigned: {ord.deliveryPartner.name}</span>
                                </span>
                                {ord.deliveryPartner.phone && (
                                  <a href={`tel:${ord.deliveryPartner.phone}`} className="font-bold text-emerald-700 underline bg-emerald-100 px-2 py-0.5 rounded-md text-[11px]">
                                    Call Rider
                                  </a>
                                )}
                              </div>
                              <p className="text-[11px] text-emerald-700 font-medium">Verify rider name <strong>"{ord.deliveryPartner.name}"</strong> when they arrive to pick up the package.</p>
                            </div>
                          ) : (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2 font-bold animate-pulse">
                              <span className="shrink-0">📡</span>
                              <span>Order Accepted! Finding & Ringing nearest 3km riders...</span>
                            </div>
                          )}
                        </div>
                      )}

                      {['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(ord.status) && (
                        <div className="py-2.5 px-3 bg-purple-50 text-purple-800 text-xs font-extrabold rounded-xl border border-purple-200 flex items-center justify-center gap-1.5">
                          <Bike className="w-4 h-4" />
                          <span>Picked Up by Rider • Out for Delivery</span>
                        </div>
                      )}

                      {ord.status === 'CANCELLED' && (
                        <div className="py-2.5 px-3 bg-rose-50 text-rose-800 text-xs font-extrabold rounded-xl border border-rose-200 flex items-center justify-center gap-1.5">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Order Rejected / Cancelled</span>
                        </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Store Menu & Item Availability ({products.length})</h3>
                <p className="text-xs text-slate-500 font-medium">Mark items Available or Out of Stock in real-time. Customers can only order items marked "Available".</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  {products.filter(p => p.isAvailable).length} Available
                </span>
                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                  {products.filter(p => !p.isAvailable).length} Out of Stock
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => (
                <div
                  key={p._id || p.id}
                  className={`p-4 rounded-2xl border transition space-y-3 flex flex-col justify-between ${
                    p.isAvailable
                      ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                      : 'bg-rose-50/30 border-rose-200/80 opacity-90'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-slate-200 bg-white" />
                        {!p.isAvailable && (
                          <div className="absolute inset-0 bg-slate-900/60 rounded-xl flex items-center justify-center">
                            <span className="text-[9px] font-black text-white px-1 text-center">OUT</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">{p.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">{p.category || 'General'}</p>
                        <div className="text-xs font-extrabold text-emerald-700 mt-0.5">₹{p.price}</div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 font-normal line-clamp-2">{p.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Live Status</span>
                      <span className={`text-xs font-extrabold flex items-center gap-1.5 ${p.isAvailable ? 'text-emerald-700' : 'text-rose-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${p.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{p.isAvailable ? 'Available' : 'Out of Stock'}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleAvailability(p)}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs shadow-sm transition border flex items-center gap-1.5 ${
                        p.isAvailable
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                      }`}
                    >
                      <span>{p.isAvailable ? 'Mark Out of Stock' : 'Mark Available'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* ORDER HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                Store Order History ({completedOrders.length})
              </h2>
              <Link
                to="/orders"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>View Full Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {completedOrders.length > 0 ? (
              <div className="space-y-3">
                {completedOrders.map((ord) => {
                  const orderId = ord.orderNumber || ord.orderId || ord.id || ord._id;
                  const dateText = new Date(ord.placedAt || ord.createdAt || Date.now()).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const rawItems = ord.items || ord.OrderItem || [];

                  return (
                    <div key={ord._id || ord.id} className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-900">#{orderId}</span>
                          <OrderStatusBadge status={ord.status} />
                          <span className="text-[10px] text-slate-400 font-medium">• {dateText}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          {rawItems.map(i => `${i.quantity}x ${i.name || i.title}`).join(', ') || 'No item details'}
                        </p>
                        {ord.customer && (
                          <p className="text-[11px] text-slate-400 font-medium">
                            Customer: {ord.customer.name || ord.customer.fullName} {ord.customer.phone && `(${ord.customer.phone})`}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Earned</span>
                          <span className="text-base font-extrabold text-emerald-600">₹{ord.totalAmount}</span>
                        </div>
                        <Link
                          to={`/order-tracking/${ord._id || ord.id}`}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-soft">
                <PackageCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-extrabold text-slate-700">No Completed Orders Yet</h3>
                <p className="text-xs text-slate-400 mt-1">Orders that have been successfully delivered to customers will be archived here.</p>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

