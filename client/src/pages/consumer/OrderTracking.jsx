import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import MapSimulator from '../../components/MapSimulator';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import DeliveryTimeline from '../../components/DeliveryTimeline';
import { useAuth } from '../../context/AuthContext';
import { Phone, CheckCircle2, PackageX, ShoppingBag, Key, Bike, ArrowLeft, ShieldCheck, MapPin } from 'lucide-react';
import { getUniversalProfileIcon } from '../../utils/imageUtils';
import FreshCartFooter from '../../components/FreshCartFooter';

export default function OrderTracking() {
  const { user } = useAuth();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courierLocation, setCourierLocation] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    const activeOrderId = order?.id || order?.orderNumber || id;
    if (!activeOrderId) return;

    socket.emit('join_order', activeOrderId);

    const handleStatusUpdate = (data) => {
      if (data.orderId === activeOrderId || data.id === activeOrderId || data.orderNumber === activeOrderId) {
        setOrder(prev => prev ? {
          ...prev,
          status: data.status,
          timeline: data.timeline || prev.timeline,
          deliveryPartner: data.deliveryPartner !== undefined ? data.deliveryPartner : prev.deliveryPartner
        } : prev);
      }
    };

    const handleDriverAssigned = (data) => {
      if (data.orderId === activeOrderId || data.id === activeOrderId || data.orderNumber === activeOrderId) {
        setOrder(prev => prev ? {
          ...prev,
          deliveryPartner: data.deliveryPartner
        } : prev);
      }
    };

    const handleLocationUpdate = (data) => {
      if (data.orderId === activeOrderId || data.id === activeOrderId || data.orderNumber === activeOrderId) {
        setCourierLocation({ lat: data.lat, lng: data.lng, statusText: data.statusText });
      }
    };

    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('order:driver_assigned', handleDriverAssigned);
    socket.on('courier:location_update', handleLocationUpdate);

    return () => {
      socket.emit('leave_order', activeOrderId);
      socket.off('order:status_updated', handleStatusUpdate);
      socket.off('order:driver_assigned', handleDriverAssigned);
      socket.off('courier:location_update', handleLocationUpdate);
    };
  }, [id, order?.id, order?.orderNumber]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      let targetId = id;

      if (!targetId) {
        const listRes = await API.get('/orders');
        if (listRes.data.success && listRes.data.orders && listRes.data.orders.length > 0) {
          targetId = listRes.data.orders[0].id || listRes.data.orders[0].orderNumber;
        }
      }

      if (!targetId) {
        setError('No active order found.');
        setLoading(false);
        return;
      }

      const res = await API.get(`/orders/${targetId}`);
      if (res.data.success && res.data.order) {
        setOrder(res.data.order);
        if (res.data.order.courierLocation) {
          setCourierLocation(res.data.order.courierLocation);
        }
      } else {
        setError('Order details could not be loaded.');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Order details could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <Navbar />
        <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin my-auto" />
      </div>
    );
  }

  if (!order || error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-20">
          <section className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-soft space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
              <PackageX className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900">No active order found</h2>
            <p className="text-xs text-slate-500 font-medium">You don't have an active delivery to track right now.</p>
            <div className="flex justify-center gap-3 pt-2">
              <Link to="/orders" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> My Orders
              </Link>
              <Link to="/home" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition">
                Explore Store
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const isFresh = order.orderType === 'FRESH' || order.shoppingMode === 'FRESH_MANDI';

  const steps = isFresh ? [
    { key: 'PENDING', label: 'Order Placed' },
    { key: 'CONFIRMED', label: 'Vendor Packing' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { key: 'DELIVERED', label: 'Delivered' }
  ] : [
    { key: 'PENDING', label: 'Order Placed' },
    { key: 'PREPARING', label: 'Kitchen Preparing' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { key: 'DELIVERED', label: 'Delivered' }
  ];

  let currentStepIndex = steps.findIndex(s => s.key === order.status);
  if (currentStepIndex === -1) {
    if (['ASSIGNED', 'PICKED_UP', 'READY_FOR_PICKUP'].includes(order.status)) {
      currentStepIndex = 2;
    } else {
      currentStepIndex = 0;
    }
  }

  const rawPin = order.deliveryPin ? String(order.deliveryPin).trim() : '';
  const pinDigits = rawPin ? rawPin.padStart(4, '0').slice(0, 4).split('') : [];

  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Order Tracking Header Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400">ORDER TRACKING</span>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${isFresh ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                {isFresh ? '🥬 Fresh Sabzi Mandi' : '🍔 Cravings Meal'}
              </span>
              <OrderStatusBadge status={order.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              #{order.orderNumber || order.orderId}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isCancelled ? 'The store rejected this order.' : 'Live driver location and dispatch tracking updates in real-time.'}
            </p>
          </div>

          <Link
            to="/orders"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Orders</span>
          </Link>
        </div>

        {isCancelled ? (
          <section className="bg-white p-8 rounded-3xl border border-rose-200 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <PackageX className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Order Rejected by Store</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {order.OrderTimeline?.find(t => t.note?.includes('Vendor') || t.note?.includes('store') || t.note?.includes('rejected'))?.note || 'Vendor rejected the order.'}
            </p>
            <Link to="/home" className="inline-flex px-6 py-2.5 bg-rose-600 text-white font-black text-xs rounded-xl shadow">
              Explore Stores
            </Link>
          </section>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6">

            <div className="space-y-6">

              {/* Live Map */}
              <section className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-soft">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      Live Delivery GPS Map
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Driver location updates appear here in real time.</p>
                  </div>
                  <span className="text-xs font-black" style={{ color: isFresh ? 'var(--fc-fresh)' : 'var(--fc-red)' }}>
                    {isFresh ? 'Fresh Mandi' : 'Cravings'}
                  </span>
                </div>
                <div className="p-3">
                  <MapSimulator
                    orderId={order.id || order.orderNumber || id}
                    orderType={order.orderType}
                    vendor={order.restaurant || order.Vendor}
                    customerAddress={order.address}
                    initialCourierLocation={courierLocation}
                  />
                </div>
              </section>

              {/* Timeline */}
              <section className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-sm">Delivery Progress Timeline</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{steps[Math.max(0, currentStepIndex)]?.label || 'Order placed'}</p>
                  </div>
                  <span className="text-xs font-black text-slate-400">{Math.max(0, currentStepIndex) + 1}/{steps.length}</span>
                </div>
                <DeliveryTimeline status={order.status} isFresh={isFresh} />
              </section>

            </div>

            {/* Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-28 h-fit">

              {/* 4-Digit Delivery PIN Highlight Card */}
              <section className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300/80 p-5 rounded-3xl shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-extrabold text-amber-950 text-sm flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-600" />
                      Secret Delivery PIN
                    </h2>
                    <p className="text-[11px] text-amber-800 font-medium">Share this 4-digit PIN with rider upon delivery handover.</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-center pt-1">
                  {pinDigits.length ? pinDigits.map((digit, idx) => (
                    <span key={idx} className="w-12 h-14 rounded-2xl border-2 border-amber-400 bg-white flex items-center justify-center text-2xl font-black font-mono text-slate-900 shadow-sm">
                      {digit}
                    </span>
                  )) : (
                    <span className="text-xs text-amber-800 font-medium">PIN will be generated once assigned to driver.</span>
                  )}
                </div>

                {order.status === 'DELIVERED' && (
                  <div className="text-xs font-black text-emerald-700 flex items-center gap-1 justify-center pt-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Delivery verified & completed.
                  </div>
                )}
              </section>

              {/* Assigned Courier Card */}
              <section className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
                {order.deliveryPartner ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={getUniversalProfileIcon(order.deliveryPartner.avatar)}
                      alt="Delivery partner"
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Assigned Rider</div>
                      <div className="text-sm font-extrabold text-slate-900 truncate">
                        {user?.id === (order.deliveryPartner._id || order.deliveryPartner.id) ? `${order.deliveryPartner.name} (You)` : order.deliveryPartner.name}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {order.deliveryPartner.vehicleType || 'EV Scooter'} • ⭐ {order.deliveryPartner.ratings || 4.9}
                      </div>
                    </div>
                    {user?.id === (order.deliveryPartner._id || order.deliveryPartner.id) ? (
                      <Link to="/delivery/dashboard" className="p-2.5 bg-cyan-50 text-cyan-700 rounded-xl hover:bg-cyan-100 transition">
                        <Bike className="w-4 h-4" />
                      </Link>
                    ) : (
                      <a href={`tel:${order.deliveryPartner.phone || '9876543210'}`} className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition">
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <Bike className="w-5 h-5 animate-pulse text-cyan-600" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Delivery Partner</div>
                      <div className="text-sm font-extrabold text-slate-900">Finding nearby rider…</div>
                      <div className="text-xs text-slate-500 font-medium">Hyperlocal dispatch in progress.</div>
                    </div>
                  </div>
                )}
              </section>

              {/* Items Summary */}
              <section className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft space-y-3">
                <h2 className="font-extrabold text-slate-900 text-sm">Ordered Items</h2>
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-600 font-medium">
                        {item.quantity}× {item.name}{item.selectedWeight ? ` (${item.selectedWeight})` : ''}
                      </span>
                      <span className="font-extrabold text-slate-900">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Total Paid</span>
                  <span className="font-black text-base" style={{ color: isFresh ? 'var(--fc-fresh)' : 'var(--fc-red)' }}>
                    ₹{order.totalAmount}
                  </span>
                </div>
              </section>

            </aside>

          </div>
        )}
      </main>

      <FreshCartFooter />
    </div>
  );
}
