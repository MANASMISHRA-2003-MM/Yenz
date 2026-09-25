import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import RoleSwitcher from '../../components/RoleSwitcher';
import { ShoppingBag, ArrowRight, Utensils, Sprout } from 'lucide-react';

import MobileBottomNavigation from '../../components/MobileBottomNavigation';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'CRAVINGS' | 'FRESH'

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

  const filteredOrders = orders.filter(ord => {
    if (activeTab === 'CRAVINGS') return ord.orderType !== 'FRESH';
    if (activeTab === 'FRESH') return ord.orderType === 'FRESH';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold text-slate-900">My Orders</h1>

          {/* Channel Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('CRAVINGS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                activeTab === 'CRAVINGS' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Cravings</span>
            </button>
            <button
              onClick={() => setActiveTab('FRESH')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                activeTab === 'FRESH' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>Fresh Mandi</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-32 bg-slate-200/60 rounded-3xl animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((ord) => {
              const isFreshOrder = ord.orderType === 'FRESH';
              return (
                <div key={ord._id || ord.id} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4 hover:border-slate-300 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={ord.restaurantId?.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=200'}
                        alt="Restaurant"
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900">{ord.restaurantId?.name || 'Local Store'}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase ${
                            isFreshOrder ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {isFreshOrder ? '🥬 FRESH MANDI' : '🍔 CRAVINGS'}
                          </span>
                        </div>
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
                    {ord.items.map(i => `${i.quantity}x ${i.name}${i.selectedWeight ? ` (${i.selectedWeight})` : ''}`).join(', ')}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Link
                      to={`/order-tracking/${ord._id || ord.id}`}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span>View / Track Order</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-soft">
            <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-extrabold text-slate-800">No Orders Found</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">No orders matched the selected channel filter.</p>
          </div>
        )}
      </main>

      <RoleSwitcher />
      <MobileBottomNavigation />
    </div>
  );
}
