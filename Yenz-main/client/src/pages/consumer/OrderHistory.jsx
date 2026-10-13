import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import DeliveryTimeline from '../../components/DeliveryTimeline';
import { useAuth } from '../../context/AuthContext';
import { ShoppingBag, ArrowRight, Utensils, Sprout, Store, Bike, ArrowLeft, MapPin, Phone, User, Clock, CheckCircle2 } from 'lucide-react';
import MobileBottomNavigation from '../../components/MobileBottomNavigation';
import FreshCartFooter from '../../components/FreshCartFooter';

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
    <div className="min-h-screen bg-white text-gray-800">
      <Navbar />
      <main className="fc-container py-7 sm:py-10 pb-24">
        <div className="fc-page-heading">
          <div><p className="fc-eyebrow">Orders</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{isVendor ? 'Store order history' : isDriver ? 'Delivery trip history' : 'My orders'}</h1><p className="text-sm text-gray-500 mt-1">{isVendor ? `Total ${orders.length} orders • ₹${totalRevenue} delivered revenue` : isDriver ? `${orders.length} delivery trips • ${totalDelivered} completed` : 'Review active and previous food & grocery deliveries.'}</p></div>
          {(isVendor || isDriver) && <Link to={isVendor ? '/vendor/dashboard' : '/delivery/dashboard'} className="fc-btn-secondary">Back to dashboard</Link>}
        </div>

        <section className="fc-card p-2 mb-6 flex flex-wrap gap-2">
          {[
            ['ALL', `All (${orders.length})`],
            ['CRAVINGS', 'Cravings'],
            ['FRESH', 'Fresh Mandi']
          ].map(([key,label]) => <button key={key} onClick={() => setActiveTab(key)} className={`px-4 py-2 rounded-md text-xs font-semibold transition ${activeTab === key ? (key === 'FRESH' ? 'text-white' : 'text-white') : 'text-gray-600 hover:bg-gray-50'}`} style={activeTab === key ? { background: key === 'FRESH' ? 'var(--fc-fresh)' : key === 'CRAVINGS' ? 'var(--fc-red)' : '#1f2937' } : {}}>{label}</button>)}
          {(isVendor || isDriver) && <div className="w-px bg-gray-200 mx-1 hidden sm:block" />}
          {(isVendor || isDriver) && ['ALL','ACTIVE','DELIVERED','CANCELLED'].map(key => <button key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-2 rounded-md text-xs font-semibold ${statusFilter === key ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>{key[0] + key.slice(1).toLowerCase()}</button>)}
        </section>

        {loading ? <div className="space-y-3">{[1,2,3].map(n => <div key={n} className="h-36 rounded-lg bg-gray-100 animate-pulse" />)}</div> : filteredOrders.length ? <div className="space-y-4">
          {filteredOrders.map(ord => {
            const isFreshOrder = ord.orderType === 'FRESH';
            const storeName = ord.restaurant?.name || ord.restaurantId?.name || ord.Vendor?.name || 'Local Store';
            const storeImage = ord.restaurant?.image || ord.restaurantId?.image || ord.Vendor?.image || '/favicon.png';
            const orderId = ord.orderNumber || ord.orderId || ord.id || ord._id;
            const dateText = new Date(ord.placedAt || ord.createdAt || Date.now()).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
            const rawItems = ord.items || ord.OrderItem || [];
            return <article key={ord._id || ord.id} className="fc-card p-5 hover:border-gray-400 transition">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-gray-200">
                <div className="flex gap-3 min-w-0"><img src={storeImage} alt={storeName} className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0" onError={e => { e.currentTarget.src = '/favicon.png'; }} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-gray-900 truncate">{storeName}</h2><span className="text-[10px] px-2 py-1 rounded-full font-bold" style={isFreshOrder ? {color:'var(--fc-fresh)',background:'rgba(22,138,91,.08)'} : {color:'var(--fc-red)',background:'rgba(229,27,75,.08)'}}>{isFreshOrder ? 'Fresh Mandi' : 'Cravings'}</span></div><p className="text-xs text-gray-400 mt-1">#{orderId} • {dateText}</p></div></div>
                <div className="flex items-center gap-3"><OrderStatusBadge status={ord.status} /><span className="text-base font-bold text-gray-900">₹{ord.totalAmount}</span></div>
              </div>
              {(isVendor && ord.customer) && <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><span className="font-semibold">Customer:</span> {ord.customer.name || ord.customer.fullName}{ord.customer.phone ? ` • ${ord.customer.phone}` : ''} • {ord.customerLocationName || ord.locationName || 'Local Delivery'}</div>}
              {isDriver && <div className="mt-4 rounded-md border px-3 py-3 text-xs" style={{ borderColor:'rgba(22,138,91,.25)', background:'rgba(22,138,91,.05)' }}><div className="font-semibold text-gray-900">Pickup: {storeName}</div><div className="mt-1 text-gray-500">Dropoff: {ord.customerLocationName || ord.locationName || 'Customer Address'}</div><div className="mt-2 flex items-center justify-between"><span className="font-semibold" style={{color:'var(--fc-fresh)'}}>Rider payout ₹{ord.deliveryFee || 65}</span><span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{ord.status === 'DELIVERED' ? 'Completed' : 'In transit'}</span></div></div>}
              {rawItems.length > 0 && <p className="mt-4 text-xs text-gray-600"><span className="font-semibold text-gray-400">Items: </span>{rawItems.map(i => `${i.quantity}x ${i.name || i.title}${i.selectedWeight ? ` (${i.selectedWeight})` : ''}`).join(', ')}</p>}
              <div className="mt-4 pt-4 border-t border-gray-200"><DeliveryTimeline status={ord.status} isFresh={isFreshOrder} compact={true} /></div>
              <div className="mt-4 flex justify-end"><Link to={`/order-tracking/${ord._id || ord.id}`} className="fc-btn" style={{ background: isFreshOrder ? 'var(--fc-fresh)' : 'var(--fc-red)' }}>{isDriver && ['ASSIGNED','WAITING_PICKUP','PICKED_UP','OUT_FOR_DELIVERY'].includes(ord.status) ? 'Open Live Navigator' : isDriver ? 'View Trip Details' : 'View Order'} <ArrowRight className="w-4 h-4" /></Link></div>
            </article>;
          })}
        </div> : <div className="fc-card py-16 px-6 text-center"><ShoppingBag className="w-12 h-12 text-gray-300 mx-auto" /><h2 className="mt-4 font-semibold text-gray-900">No orders found</h2><p className="mt-1 text-sm text-gray-500">{isVendor ? 'No store orders match these filters.' : isDriver ? 'No assigned delivery trips match these filters.' : 'You have not placed an order yet.'}</p><Link to="/home" className="mt-5 inline-flex fc-btn" style={{background:'var(--fc-green)'}}>Start shopping <ArrowRight className="w-4 h-4" /></Link></div>}
      </main>
      <FreshCartFooter />
      <MobileBottomNavigation />
    </div>
  );
}
