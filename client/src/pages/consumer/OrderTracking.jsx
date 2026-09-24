import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import MapSimulator from '../../components/MapSimulator';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import { Phone, CheckCircle2 } from 'lucide-react';

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courierLocation, setCourierLocation] = useState(null);

  useEffect(() => {
    fetchOrder();

    socket.emit('join_order', id);

    socket.on('order:status_updated', (data) => {
      if (data.orderId === id) {
        setOrder(prev => prev ? { ...prev, status: data.status, timeline: data.timeline || prev.timeline } : prev);
      }
    });

    socket.on('courier:location_update', (data) => {
      if (data.orderId === id) {
        setCourierLocation({ lat: data.lat, lng: data.lng, statusText: data.statusText });
      }
    });

    return () => {
      socket.emit('leave_order', id);
      socket.off('order:status_updated');
      socket.off('courier:location_update');
    };
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/orders/${id}`);
      if (res.data.success) {
        setOrder(res.data.order);
        if (res.data.order.courierLocation) {
          setCourierLocation(res.data.order.courierLocation);
        }
      }
    } catch (err) {
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isFresh = order.orderType === 'FRESH';

  const steps = isFresh ? [
    { key: 'PLACED', label: 'Basket Confirmed' },
    { key: 'VENDOR_ACCEPTED', label: 'Vendor Packing' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { key: 'DELIVERED', label: 'Delivered' }
  ] : [
    { key: 'PLACED', label: 'Order Placed' },
    { key: 'PREPARING', label: 'Kitchen Preparing' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { key: 'DELIVERED', label: 'Delivered' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono font-bold">ID: #{order.orderId}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${isFresh ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                {isFresh ? '🥬 FRESH SABZI MANDI' : '🍔 GOURMET FOOD'}
              </span>
              <OrderStatusBadge status={order.status} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">
              Estimated Delivery: <span className={isFresh ? 'text-emerald-600' : 'text-brand-600'}>15-20 Mins</span>
            </h1>
          </div>
        </div>

        {/* Live Map Component */}
        <MapSimulator
          orderId={id}
          orderType={order.orderType}
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
        {order.deliveryPartnerId && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={order.deliveryPartnerId.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'}
                alt="Delivery Partner"
                className="w-12 h-12 rounded-full object-cover border border-slate-200"
              />
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Assigned Driver</p>
                <h4 className="text-sm font-extrabold text-slate-900">{order.deliveryPartnerId.name}</h4>
                <p className="text-xs text-slate-500 font-medium">{order.deliveryPartnerId.vehicleType || 'EV Scooter'} • ⭐ {order.deliveryPartnerId.ratings || 4.9}</p>
              </div>
            </div>

            <a
              href={`tel:${order.deliveryPartnerId.phone || '9876543210'}`}
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
            <span>Total Paid</span>
            <span className={isFresh ? 'text-emerald-600' : 'text-brand-600'}>₹{order.totalAmount}</span>
          </div>
        </div>

      </main>
    </div>
  );
}
