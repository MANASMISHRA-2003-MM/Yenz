import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import RoleSwitcher from '../../components/RoleSwitcher';
import { Store, Flame, RefreshCw, PackageCheck } from 'lucide-react';

export default function VendorDashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendorData();

    socket.on('order:created', (data) => {
      fetchOrders();
    });

    return () => {
      socket.off('order:created');
    };
  }, []);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      const [resRest, resOrders] = await Promise.all([
        API.get('/restaurants/vendor/me'),
        API.get('/orders')
      ]);
      if (resRest.data.success) setRestaurant(resRest.data.restaurant);
      if (resOrders.data.success) setOrders(resOrders.data.orders);
    } catch (err) {
      console.error('Error fetching vendor data:', err);
    } finally {
      setLoading(false);
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
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status');
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
  const totalRevenue = completedOrders.reduce((acc, o) => acc + o.totalAmount, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Restaurant Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                  KITCHEN OPEN
                </span>
                <span className="text-xs text-slate-400 font-mono font-bold">ID: {restaurant?._id}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{restaurant?.name || 'My Restaurant'}</h1>
              <p className="text-xs text-slate-500 font-medium">{restaurant?.address?.street}, {restaurant?.address?.city}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Active Orders</p>
              <p className="text-xl font-extrabold text-brand-600">{activeOrders.length}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Today's Revenue</p>
              <p className="text-xl font-extrabold text-emerald-600">₹{totalRevenue}</p>
            </div>
          </div>
        </div>

        {/* Live Orders Pipeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
              Live Orders Processing Pipeline
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
                <div key={ord._id} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-mono font-extrabold text-slate-800">#{ord.orderId}</span>
                      <OrderStatusBadge status={ord.status} />
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="text-slate-500 font-medium">Customer: <strong className="text-slate-900">{ord.customerId?.name}</strong> ({ord.customerId?.phone})</p>
                      <p className="text-slate-500 font-medium">Paid Amount: <strong className="text-brand-600 font-extrabold">₹{ord.totalAmount}</strong> ({ord.paymentMethod})</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1 text-xs">
                      <p className="font-extrabold text-slate-700 border-b border-slate-200 pb-1">Items Requested:</p>
                      {ord.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-slate-600 font-medium">
                          <span>{it.quantity}x {it.name}</span>
                          <span className="font-bold text-slate-900">₹{it.price * it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    {ord.status === 'PLACED' && (
                      <button
                        onClick={() => handleUpdateStatus(ord._id, 'VENDOR_ACCEPTED')}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                      >
                        Accept Order
                      </button>
                    )}

                    {ord.status === 'VENDOR_ACCEPTED' && (
                      <button
                        onClick={() => handleUpdateStatus(ord._id, 'PREPARING')}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                      >
                        Mark as Preparing
                      </button>
                    )}

                    {ord.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateStatus(ord._id, 'READY_FOR_PICKUP')}
                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                      >
                        Ready for Pickup
                      </button>
                    )}

                    {['READY_FOR_PICKUP', 'COURIER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(ord.status) && (
                      <div className="p-2.5 bg-slate-100 border border-slate-200 text-center text-xs font-bold text-slate-500 rounded-xl">
                        Waiting for driver pickup & delivery
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-soft">
              <PackageCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-slate-800">No Active Orders Right Now</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">New orders placed by consumers will appear here in real time.</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
