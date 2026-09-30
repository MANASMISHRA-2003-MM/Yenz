import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import MapSimulator from '../../components/MapSimulator';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { Phone, CheckCircle2, PackageX, ShoppingBag, Key, Bike } from 'lucide-react';
import { getUniversalProfileIcon } from '../../utils/imageUtils';

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

      // If page is loaded on /order-tracking without an ID, fetch the user's latest active order
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
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center">
        <Navbar />
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin my-auto" />
      </div>
    );
  }

  if (!order || error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <PackageX className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">No Active Order Found</h2>
          <p className="text-xs text-slate-500 font-medium">You don't have an active delivery to track right now. View your past orders or explore delicious items!</p>
          <div className="pt-2 flex justify-center gap-3">
            <Link to="/orders" className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              <span>View My Orders</span>
            </Link>
            <Link to="/home" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition">
              Explore Store
            </Link>
          </div>
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
      currentStepIndex = 2; // Map to Out for Delivery step range
    } else {
      currentStepIndex = 0;
    }
  }

  const rawPin = order.deliveryPin ? String(order.deliveryPin).trim() : '';
  const pinDigits = rawPin ? rawPin.padStart(4, '0').slice(0, 4).split('') : [];

  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono font-bold">ID: #{order.orderNumber || order.orderId}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${isFresh ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                {isFresh ? '🥬 FRESH SABZI MANDI' : '🍕 CRAVINGS FOOD'}
              </span>
              <OrderStatusBadge status={order.status} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">
              {isCancelled ? 'Order Rejection Notice' : 'Estimated Delivery:'} <span className={isCancelled ? 'text-rose-600' : (isFresh ? 'text-emerald-600' : 'text-brand-600')}>{isCancelled ? 'Store Rejected Order' : '15-20 Mins'}</span>
            </h1>
          </div>
        </div>

        {/* Dedicated Vendor Rejection Card */}
        {isCancelled ? (
          <div className="bg-rose-50/90 border-2 border-rose-300 p-8 rounded-3xl shadow-soft space-y-4 text-center">
            <div className="w-16 h-16 bg-rose-100 border border-rose-300 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <PackageX className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-rose-900 tracking-tight">❌ ORDER REJECTED BY STORE</h2>
              <p className="text-sm font-extrabold text-rose-700 mt-1">
                Store is unable to accept your order right now.
              </p>
              <p className="text-xs text-rose-600/90 font-medium mt-1">
                Reason: {order.OrderTimeline?.find(t => t.note?.includes('Vendor') || t.note?.includes('store') || t.note?.includes('rejected'))?.note || 'Vendor rejected the order.'}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link to="/home" className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition inline-flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Explore Other Merchants</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 4-Digit Delivery Verification PIN Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-2 border-amber-400/40 rounded-3xl p-6 shadow-soft relative overflow-hidden backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Key className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider">Secure Delivery PIN</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                      Required at Dropoff
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium max-w-md">
                    Share this 4-digit secret PIN with your delivery partner only when your food is handed over to you to complete delivery.
                  </p>
                </div>

                {order.status === 'DELIVERED' ? (
                  <div className="flex items-center gap-2 px-5 py-3 bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-300 font-extrabold text-sm shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Verified & Delivered</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {pinDigits.map((digit, idx) => (
                      <div
                        key={idx}
                        className="w-12 h-14 bg-white border-2 border-amber-400 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-900 shadow-md tracking-wider font-mono"
                      >
                        {digit}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Interactive Leaflet Map Component */}
            <MapSimulator
              orderId={order.id || order.orderNumber || id}
              orderType={order.orderType}
              vendor={order.restaurant || order.Vendor}
              customerAddress={order.address}
              initialCourierLocation={courierLocation}
            />
          </>
        )}

        {/* Progress Tracker Steps */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-6">Delivery Progress</h3>
          
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-0" />
            <div
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 transition-all duration-500 ${isFresh ? 'bg-emerald-600' : 'bg-brand-500'}`}
              style={{ width: `${Math.max(0, currentStepIndex) / (steps.length - 1) * 100}%` }}
            />

            {steps.map((step, idx) => {
              const isCompleted = currentStepIndex >= idx;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? isFresh ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-brand-500 border-brand-500 text-white shadow-md'
                        : 'bg-white border-slate-300 text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className={`mt-2 text-xs font-extrabold ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Partner Details Card */}
        {order.deliveryPartner ? (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={getUniversalProfileIcon(order.deliveryPartner.avatar)}
                alt="Delivery Partner"
                className="w-12 h-12 rounded-full object-cover border border-slate-200"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {user?.id === (order.deliveryPartner._id || order.deliveryPartner.id) ? 'My Assigned Trip' : 'Assigned Driver'}
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Assigned
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  {user?.id === (order.deliveryPartner._id || order.deliveryPartner.id)
                    ? `${order.deliveryPartner.name} (You)`
                    : order.deliveryPartner.name}
                </h4>
                <p className="text-xs text-slate-500 font-medium">{order.deliveryPartner.vehicleType || 'EV Scooter'} • ⭐ {order.deliveryPartner.ratings || 4.9}</p>
              </div>
            </div>

            {user?.id === (order.deliveryPartner._id || order.deliveryPartner.id) ? (
              <Link
                to="/delivery/dashboard"
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition flex items-center gap-1.5 font-bold text-xs shadow-sm"
              >
                <Bike className="w-4 h-4" />
                <span>Rider Dashboard</span>
              </Link>
            ) : (
              <a
                href={`tel:${order.deliveryPartner.phone || '9876543210'}`}
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-600 hover:text-white transition flex items-center gap-1.5 font-bold text-xs"
              >
                <Phone className="w-4 h-4" />
                <span>Call</span>
              </a>
            )}
          </div>
        ) : (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 animate-pulse">
                <Bike className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Delivery Partner</p>
                <h4 className="text-sm font-extrabold text-slate-900">Locating Nearest Driver...</h4>
                <p className="text-xs text-slate-500 font-medium">Orders are accepted live by nearby active drivers in the area</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Assigning</span>
            </div>
          </div>
        )}

        {/* Order Items Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
            {isFresh ? 'Items in Fresh Sabzi Basket' : 'Items in Food Order'}
          </h3>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs text-slate-600 font-medium">
                <span>{item.quantity}x {item.name} {item.selectedWeight ? `(${item.selectedWeight})` : ''}</span>
                <span className="font-extrabold text-slate-900">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm font-extrabold text-slate-900">
            <span>Total Paid ({order.paymentMethod})</span>
            <span className={isFresh ? 'text-emerald-600' : 'text-brand-600'}>₹{order.totalAmount}</span>
          </div>
        </div>

      </main>
    </div>
  );
}
