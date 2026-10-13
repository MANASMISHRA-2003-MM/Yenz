import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import VendorNavbar from '../../components/VendorNavbar';
import VendorBottomNav from '../../components/VendorBottomNav';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import { History, PackageCheck, ArrowLeft, RefreshCw, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function VendorOrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get('/orders');
      if (res.data?.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'DELIVERED' && o.status !== 'DELIVERED') return false;
    if (filter === 'CANCELLED' && o.status !== 'CANCELLED') return false;
    if (filter === 'ACTIVE' && ['DELIVERED', 'CANCELLED'].includes(o.status)) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const numMatch = (o.orderNumber || o.orderId || o.id || '').toLowerCase().includes(q);
      const custMatch = (o.customer?.name || o.customerName || '').toLowerCase().includes(q);
      return numMatch || custMatch;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-28">
      <VendorNavbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                to="/vendor/dashboard"
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                <History className="w-6 h-6 text-emerald-600" />
                Store Order History
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Review and audit all past and completed customer deliveries for your shop.
            </p>
          </div>

          <button
            onClick={fetchOrders}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-slate-300 font-bold text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order # or customer..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'ACTIVE', 'DELIVERED', 'CANCELLED'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filter === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Listing */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="space-y-3">
            {filteredOrders.map((ord) => {
              const orderId = ord.orderNumber || ord.orderId || ord.id || ord._id;
              const dateText = new Date(ord.placedAt || ord.createdAt || Date.now()).toLocaleDateString(
                'en-IN',
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }
              );
              const rawItems = ord.items || ord.OrderItem || [];

              return (
                <div
                  key={ord._id || ord.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900">#{orderId}</span>
                      <OrderStatusBadge status={ord.status} />
                      <span className="text-[10px] text-slate-400 font-medium">• {dateText}</span>
                    </div>

                    <p className="text-xs text-slate-700 font-semibold">
                      {rawItems.map((i) => `${i.quantity}x ${i.name || i.title}`).join(', ') || 'No item details'}
                    </p>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                      <span>Customer: <strong>{ord.customer?.name || ord.customerName || 'Customer'}</strong></span>
                      {ord.customer?.phone && <span>Tel: {ord.customer.phone}</span>}
                      {ord.deliveryPartner && (
                        <span className="text-emerald-700 font-medium">
                          Rider: {ord.deliveryPartner.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right sm:shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Order Amount</span>
                    <span className="text-base font-black text-emerald-600">₹{ord.totalAmount}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-soft">
            <PackageCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-extrabold text-slate-700">No Orders Match Filter</h3>
            <p className="text-xs text-slate-400 mt-1">Try changing the filter or search term above.</p>
          </div>
        )}
      </main>

      <VendorBottomNav />
    </div>
  );
}
