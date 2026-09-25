import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import MapSimulator from '../../components/MapSimulator';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import { Phone, CheckCircle2, PackageX, ShoppingBag } from 'lucide-react';

export default function OrderTracking() {
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
      if (data.orderId === activeOrderId || data.id === activeOrderId) {
        setOrder(prev => prev ? { ...prev, status: data.status, timeline: data.timeline || prev.timeline } : prev);
      }
    };

    const handleLocationUpdate = (data) => {
      if (data.orderId === activeOrderId || data.id === activeOrderId) {
        setCourierLocation({ lat: data.lat, lng: data.lng, statusText: data.statusText });
      }
    };

    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('courier:location_update', handleLocationUpdate);

    return () => {
      socket.emit('leave_order', activeOrderId);
      socket.off('order:status_updated', handleStatusUpdate);
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
              Estimated Delivery: <span className={isFresh ? 'text-emerald-600' : 'text-brand-600'}>15-20 Mins</span>
            </h1>
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
        {order.deliveryPartner && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={order.deliveryPartner.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'}
                alt="Delivery Partner"
                className="w-12 h-12 rounded-full object-cover border border-slate-200"
              />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Assigned Driver</p>
                <h4 className="text-sm font-extrabold text-slate-900">{order.deliveryPartner.name}</h4>
                <p className="text-xs text-slate-500 font-medium">{order.deliveryPartner.vehicleType || 'EV Scooter'} • ⭐ {order.deliveryPartner.ratings || 4.9}</p>
              </div>
            </div>

            <a
              href={`tel:${order.deliveryPartner.phone || '9876543210'}`}
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-600 hover:text-white transition"
            >
              <Phone className="w-5 h-5" />
            </a>
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
