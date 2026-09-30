import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import DeliveryTimeline from '../../components/DeliveryTimeline';
import { useAuth } from '../../context/AuthContext';
import { ShoppingBag, ArrowRight, Utensils, Sprout, Store, Bike, ArrowLeft, MapPin, Phone, User, Clock, CheckCircle2 } from 'lucide-react';
import MobileBottomNavigation from '../../components/MobileBottomNavigation';

export default function OrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'CRAVINGS' | 'FRESH' | 'DELIVERED'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED'

  const role = (user?.role || 'customer').toLowerCase();
  const isVendor = role === 'vendor';
  const isDriver = role === 'delivery_partner' || role === 'driver';

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get('/orders');
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error('Error fetching order history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(ord => {
    // Channel filter
    if (activeTab === 'CRAVINGS' && ord.orderType === 'FRESH') return false;
    if (activeTab === 'FRESH' && ord.orderType !== 'FRESH') return false;
    
    // Status filter
    if (statusFilter === 'ACTIVE') {
      return !['DELIVERED', 'CANCELLED'].includes(ord.status);
    }
    if (statusFilter === 'DELIVERED') {
      return ord.status === 'DELIVERED';
    }
    if (statusFilter === 'CANCELLED') {
      return ord.status === 'CANCELLED';
    }
    return true;
  });

  const totalDelivered = orders.filter(o => o.status === 'DELIVERED').length;
  const totalRevenue = orders
    .filter(o => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Back navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isVendor && (
                <Link
                  to="/vendor/dashboard"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Vendor Dashboard</span>
                </Link>
              )}
              {isDriver && (
                <Link
                  to="/delivery/dashboard"
                  className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 hover:text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Rider Dashboard</span>
                </Link>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900">
              {isVendor ? 'Store Order History' : isDriver ? 'Delivery Trip History' : 'My Orders'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isVendor
                ? `Total ${orders.length} orders recorded • ₹${totalRevenue} total revenue earned`
                : isDriver
                ? `Total ${orders.length} delivery trips • ${totalDelivered} completed handovers`
                : 'Track active live orders or review your previous food & grocery deliveries'}
            </p>
          </div>

          {/* Channel Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                  activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('CRAVINGS')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                  activeTab === 'CRAVINGS' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Utensils className="w-3 h-3" />
                <span>Cravings</span>
              </button>
              <button
                onClick={() => setActiveTab('FRESH')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                  activeTab === 'FRESH' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sprout className="w-3 h-3" />
                <span>Fresh</span>
              </button>
            </div>

            {/* Status Filter for Vendors & Riders */}
            {(isVendor || isDriver) && (
              <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl text-xs font-bold">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-xl transition ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  All Status
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-2.5 py-1 rounded-xl transition ${statusFilter === 'ACTIVE' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('DELIVERED')}
                  className={`px-2.5 py-1 rounded-xl transition ${statusFilter === 'DELIVERED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}
                >
                  Delivered
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Orders Listing */}
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
              const storeName = ord.restaurant?.name || ord.restaurantId?.name || ord.Vendor?.name || 'Local Store';
              const storeImage = ord.restaurant?.image || ord.restaurantId?.image || ord.Vendor?.image || '/favicon.png';
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
                <div key={ord._id || ord.id} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4 hover:border-slate-300 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={storeImage}
                        alt={storeName}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/favicon.png';
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900">{storeName}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase ${
                            isFreshOrder ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {isFreshOrder ? '🥬 FRESH MANDI' : '🍔 CRAVINGS'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono font-bold">Order #{orderId} • {dateText}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={ord.status} />
                      <span className="text-base font-extrabold text-brand-600">₹{ord.totalAmount}</span>
                    </div>
                  </div>

                  {/* Role-Specific details */}
                  {isVendor && ord.customer && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-bold">
                        <User className="w-3.5 h-3.5 text-amber-700" />
                        <span>Customer: {ord.customer.name || ord.customer.fullName}</span>
                        {ord.customer.phone && <span className="text-amber-700 font-mono">({ord.customer.phone})</span>}
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ord.customerLocationName || ord.locationName || 'Local Delivery'}</span>
                      </div>
                    </div>
                  )}

                  {isDriver && (
                    <div className="p-3.5 bg-cyan-50/80 border border-cyan-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-cyan-900 font-bold">
                          <Store className="w-3.5 h-3.5 text-cyan-700" />
                          <span>Pickup Store: {storeName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Dropoff: {ord.customerLocationName || ord.locationName || 'Customer Address'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:text-right">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Rider Payout</p>
                          <p className="text-sm font-extrabold text-emerald-700">₹{ord.deliveryFee || 65}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase border ${
                          ord.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {ord.status === 'DELIVERED' ? '✓ Completed Trip' : 'In Transit'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Items summary */}
                  {rawItems.length > 0 && (
                    <div className="text-xs text-slate-600 font-medium">
                      <span className="font-bold text-slate-400">Items: </span>
                      {rawItems.map(i => `${i.quantity}x ${i.name || i.title}${i.selectedWeight ? ` (${i.selectedWeight})` : ''}`).join(', ')}
                    </div>
                  )}

                  {/* Compact Delivery Timeline for live status tracking */}
                  <div className="pt-2 border-t border-slate-100">
                    <DeliveryTimeline status={ord.status} isFresh={isFreshOrder} compact={true} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Placed: {dateText}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDriver && ['ASSIGNED', 'WAITING_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(ord.status) ? (
                        <Link
                          to="/delivery/dashboard"
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Bike className="w-3.5 h-3.5" />
                          <span>Open Live Navigator</span>
                        </Link>
                      ) : (
                        <Link
                          to={`/order-tracking/${ord._id || ord.id}`}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                        >
                          <span>{isDriver ? 'View Trip Details' : 'View Order Details'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-soft">
            <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-extrabold text-slate-800">No Orders Found</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {isVendor
                ? 'No past or active store orders match the selected filters.'
                : isDriver
                ? 'No delivery trips found in your account history. Only deliveries assigned to and completed by you will appear here.'
                : 'You have not placed any orders yet.'}
            </p>
          </div>
        )}
      </main>

      <MobileBottomNavigation />
    </div>
  );
}
