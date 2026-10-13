import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import DeliveryNavbar from '../../components/DeliveryNavbar';
import DeliveryBottomNav from '../../components/DeliveryBottomNav';
import {
  History, Bike, Calendar, ArrowRight, CheckCircle2,
  TrendingUp, RefreshCw, IndianRupee, Store, User, MapPin, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function DeliveryHistory() {
  const [loading, setLoading] = useState(true);
  const [pastDeliveries, setPastDeliveries] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'TODAY'
  const [selectedTrip, setSelectedTrip] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await API.get('/deliveries/dashboard');
      if (res.data.success) {
        setPastDeliveries(res.data.pastDeliveries || []);
        setTotalEarnings(res.data.totalEarnings || 0);
      }
    } catch (err) {
      console.error('Error fetching delivery history:', err);
      toast.error('Failed to load past trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const filteredTrips = pastDeliveries.filter((d) => {
    if (filter === 'TODAY') {
      return isToday(d.createdAt || d.updatedAt);
    }
    return true;
  });

  const todayEarnings = pastDeliveries
    .filter((d) => isToday(d.createdAt || d.updatedAt))
    .reduce((sum, d) => sum + (d.earnings || 65), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-900">
      <DeliveryNavbar />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Trip History</h1>
              <p className="text-xs text-slate-500 font-medium">Completed deliveries & earnings record</p>
            </div>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-xs disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Earnings Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-white/10 rounded-full blur-xs pointer-events-none" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> All-Time Earned
            </span>
            <div className="text-2xl sm:text-3xl font-black mt-1 flex items-baseline">
              <span>₹{totalEarnings || (pastDeliveries.length * 65)}</span>
            </div>
            <p className="text-[10px] text-emerald-100/90 mt-1">{pastDeliveries.length} completed trips</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Today's Payout
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              ₹{todayEarnings}
            </div>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">Direct to Bank</p>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Avg. Per Trip
            </span>
            <div className="text-2xl sm:text-3xl font-black text-cyan-600 mt-1">
              ₹{pastDeliveries.length ? Math.round(totalEarnings / pastDeliveries.length || 65) : 65}
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Base + Surge + Tips</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Trips ({pastDeliveries.length})
          </button>
          <button
            onClick={() => setFilter('TODAY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === 'TODAY'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Today's Trips ({pastDeliveries.filter((d) => isToday(d.createdAt || d.updatedAt)).length})
          </button>
        </div>

        {/* Trip List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-cyan-500" />
            <p className="text-sm font-medium">Loading your trip history...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Bike className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Trips Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filter === 'TODAY'
                ? 'You have not completed any deliveries today yet. Go online on the dashboard to accept orders!'
                : 'Completed deliveries will appear here with timestamps and payout breakdowns.'}
            </p>
            <Link
              to="/delivery/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-cyan-700 transition"
            >
              Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTrips.map((trip) => {
              const vendor = trip.restaurant?.name || trip.restaurantId?.name || 'Local Store';
              const customer = trip.customer?.name || trip.customerId?.name || 'Customer';
              const payout = trip.earnings || 65;
              const date = trip.createdAt ? new Date(trip.createdAt) : new Date();

              return (
                <div
                  key={trip.id}
                  onClick={() => setSelectedTrip(selectedTrip?.id === trip.id ? null : trip)}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-cyan-300 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500">
                            #{trip.orderNumber || trip.orderId || trip.id?.slice(0, 8)}
                          </span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            COMPLETED
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                          {vendor} → {customer}
                        </h4>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-emerald-600 flex items-center justify-end">
                        +₹{payout}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Earned</span>
                    </div>
                  </div>

                  {/* Expanded trip details */}
                  {selectedTrip?.id === trip.id && (
                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-2 bg-slate-50/70 p-3 rounded-xl">
                      <div className="flex items-start gap-2 text-slate-600">
                        <Store className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-700">Pickup:</span>{' '}
                          {trip.restaurant?.address || trip.pickupAddress || 'Restaurant Address'}
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-700">Dropoff:</span>{' '}
                          {trip.customerAddress?.addressLine || trip.dropAddress || 'Customer Address'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-500 font-medium">Delivery Verification</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 4-Digit PIN Verified
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <DeliveryBottomNav />
    </div>
  );
}
