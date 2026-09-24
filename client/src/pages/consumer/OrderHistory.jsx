import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import RoleSwitcher from '../../components/RoleSwitcher';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get('/orders');
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Error fetching order history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-900">My Past Orders</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-32 bg-slate-200/60 rounded-3xl animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((ord) => (
              <div key={ord._id} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4 hover:border-slate-300 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={ord.restaurantId?.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=200'}
                      alt="Restaurant"
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                    />
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{ord.restaurantId?.name || 'Kitchen Hub'}</h3>
                      <p className="text-[11px] text-slate-400 font-mono font-bold">Order #{ord.orderId} • {new Date(ord.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={ord.status} />
                    <span className="text-sm font-extrabold text-brand-600">₹{ord.totalAmount}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 font-medium">
                  <span className="font-bold text-slate-400">Items: </span>
                  {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Link
                    to={`/order-tracking/${ord._id}`}
                    className="px-4 py-2 bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white border border-brand-200 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>View / Track Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-soft">
            <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-extrabold text-slate-800">No Orders Yet</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Place your first order to see tracking details here.</p>
          </div>
        )}
      </main>

      <RoleSwitcher />
    </div>
  );
}
