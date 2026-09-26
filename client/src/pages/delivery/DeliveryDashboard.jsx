import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import MapSimulator from '../../components/MapSimulator';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import { Bike, MapPin, Navigation, ToggleLeft, ToggleRight, DollarSign, BellRing, CheckCircle2, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react';
import { startRepeatingAlert, stopAlertSound } from '../../utils/alertSound';

export default function DeliveryDashboard() {
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [newJobAlert, setNewJobAlert] = useState(null);

  // Rider Geolocation & Mandatory Enforcement
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [riderCoords, setRiderCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [rejectedJobs, setRejectedJobs] = useState([]);

  useEffect(() => {
    fetchDashboard();
    requestRiderLocation();

    // Listen to real-time driver notifications
    socket.emit('join_drivers_room', 'driver_active');

    socket.on('delivery:new_job_available', (job) => {
      setNewJobAlert(job);
      fetchDashboard();
      startRepeatingAlert();
    });

    socket.on('order:assigned', () => {
      fetchDashboard();
      stopAlertSound();
    });

    return () => {
      socket.off('delivery:new_job_available');
      socket.off('order:assigned');
      stopAlertSound();
    };
  }, []);

  const requestRiderLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationEnabled(true);
          setLocationError(null);
          setRiderCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('Rider geolocation error:', err);
          setLocationEnabled(false);
          setLocationError('Live GPS Location access is mandatory to receive delivery requests.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [resDash, resOrders] = await Promise.all([
        API.get('/deliveries/dashboard'),
        API.get('/orders')
      ]);
      if (resDash.data.success) setData(resDash.data);
      if (resOrders.data.success) setOrders(resOrders.data.orders);
    } catch (err) {
      console.error('Error loading driver dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      const res = await API.put('/deliveries/toggle-online');
      if (res.data.success) {
        setIsOnline(res.data.isOnline);
      }
    } catch (err) {
      console.error('Toggle online error:', err);
    }
  };

  const handleAcceptJob = async (orderId) => {
    if (!locationEnabled) {
      alert('Location mandatory! Please enable live GPS location before accepting delivery orders.');
      requestRiderLocation();
      return;
    }
    try {
      const res = await API.put(`/orders/${orderId}/accept-job`);
      if (res.data.success) {
        stopAlertSound();
        setNewJobAlert(null);
        fetchDashboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error accepting delivery job');
    }
  };

  const handleRejectJob = (orderId) => {
    stopAlertSound();
    setRejectedJobs(prev => [...prev, orderId]);
    if (newJobAlert?.orderId === orderId) {
      setNewJobAlert(null);
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      const res = await API.put(`/orders/${orderId}/status`, { status });
      if (res.data.success) {
        fetchDashboard();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeDelivery = orders.find(o => o.deliveryPartnerId && !['DELIVERED', 'CANCELLED'].includes(o.status));
  const availableUnassignedJobs = orders.filter(o => 
    !o.deliveryPartnerId && 
    ['VENDOR_ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.status) &&
    !rejectedJobs.includes(o._id) && !rejectedJobs.includes(o.id)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* MANDATORY LOCATION STATUS BAR */}
        {!locationEnabled && (
          <div className="bg-rose-500 text-white p-5 rounded-3xl shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-300 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-md">LOCATION MANDATORY</span>
                <h3 className="text-sm font-extrabold mt-0.5">Current GPS Location is OFF</h3>
                <p className="text-xs text-rose-100 font-medium">You must turn on live GPS location to view nearby orders, receive delivery payouts, and navigate maps.</p>
              </div>
            </div>
            <button
              onClick={requestRiderLocation}
              className="px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 font-extrabold text-xs rounded-xl shadow-sm transition whitespace-nowrap"
            >
              📍 Turn On Current Location
            </button>
          </div>
        )}

        {/* Driver Header & Online Switch */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-2xl">
              <Bike className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {isOnline ? 'ONLINE & READY FOR JOBS' : 'OFFLINE'}
                </span>
                {locationEnabled ? (
                  <span className="text-xs text-emerald-600 font-extrabold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 fill-emerald-600" />
                    <span>GPS Active</span>
                  </span>
                ) : (
                  <span className="text-xs text-rose-600 font-extrabold">GPS Off</span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Delivery Driver Control Center</h1>
            </div>
          </div>

          <button
            onClick={handleToggleOnline}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-extrabold text-xs transition ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {isOnline ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5" />}
            <span>{isOnline ? 'Go Offline' : 'Go Online'}</span>
          </button>
        </div>

        {/* Real-time Broadcast New Job Alert Banner */}
        {newJobAlert && !rejectedJobs.includes(newJobAlert.orderId) && (
          <div className="bg-gradient-to-r from-amber-500 via-emerald-600 to-slate-900 text-white p-5 rounded-3xl shadow-soft-lg space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BellRing className="w-8 h-8 animate-bounce text-yellow-300" />
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider bg-white/20 px-2 py-0.5 rounded-md">LIVE NEARBY ORDER ALERT</span>
                  <h3 className="text-base font-extrabold mt-0.5">Order #{newJobAlert.orderCode || 'REQ'} • {newJobAlert.restaurantName || 'Nearby Store'}</h3>
                  <p className="text-xs text-emerald-100 font-medium">Distance: {newJobAlert.distanceKm || '2.4'} km • Revenue Payout: <strong className="text-yellow-300 text-sm font-extrabold">₹{newJobAlert.payout || 85}</strong></p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAcceptJob(newJobAlert.orderId)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold rounded-xl shadow-md transition whitespace-nowrap"
                >
                  Accept Job (₹{newJobAlert.payout || 85})
                </button>
                <button
                  onClick={() => handleRejectJob(newJobAlert.orderId)}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold rounded-xl transition"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Today's Earnings</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">₹{data?.totalEarnings || 480}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Completed Trips</p>
            <p className="text-2xl font-extrabold text-cyan-600 mt-1">{data?.completedCount || 7}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft col-span-2 md:col-span-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Estimated Revenue Rate</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">Base ₹35 + ₹20 / km</p>
          </div>
        </div>

        {/* Available Unassigned Nearby Jobs Grid with Distance & Revenue */}
        {availableUnassignedJobs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900">Nearby Orders Ready for Pickup ({availableUnassignedJobs.length})</h2>
              <span className="text-xs font-bold text-slate-500">Calculated Payouts</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {availableUnassignedJobs.map(job => {
                const dist = Number(job.tripDistanceKm || 2.5);
                const payout = Math.round(35 + dist * 20 + 15);

                return (
                  <div key={job._id || job.id} className="bg-white p-5 rounded-3xl border border-cyan-200 shadow-soft flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-mono font-extrabold text-slate-800">#{job.orderId || job.id}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${job.orderType === 'FRESH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {job.orderType === 'FRESH' ? '🥬 FRESH SABZI MANDI' : '🍔 RESTAURANT'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <p className="text-slate-800 font-bold flex items-center justify-between">
                        <span>Pickup: {job.restaurantId?.name || 'Local Store'}</span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] font-extrabold">🔥 High Revenue</span>
                      </p>
                      <p className="text-slate-500 font-medium">Trip Distance: <strong className="text-slate-900">{dist} km</strong></p>
                      <p className="text-slate-500 font-medium">Revenue Earnings: <strong className="text-emerald-600 font-extrabold text-sm">₹{payout}</strong></p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleAcceptJob(job._id || job.id)}
                        className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                      >
                        Accept Job (₹{payout})
                      </button>
                      <button
                        onClick={() => handleRejectJob(job._id || job.id)}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Delivery Job Card with Live Map & Pick/Drop Routing */}
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">My Current Active Delivery</h2>
          
          {activeDelivery ? (
            <div className="bg-white p-6 rounded-3xl border border-cyan-300 shadow-soft-lg space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono font-bold">Order #{activeDelivery.orderId || activeDelivery.id}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${activeDelivery.orderType === 'FRESH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      {activeDelivery.orderType === 'FRESH' ? '🥬 FRESH SABZI MANDI' : '🍔 RESTAURANT MEAL'}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                    Trip Payout: <span className="text-emerald-600 font-extrabold">₹{activeDelivery.predictedPayout || 85}</span> ({activeDelivery.tripDistanceKm || 2.4} km)
                  </h3>
                </div>
                <OrderStatusBadge status={activeDelivery.status} />
              </div>

              {/* LIVE MAP TRACKER INTEGRATION */}
              <MapSimulator
                orderId={activeDelivery.id || activeDelivery._id}
                orderType={activeDelivery.orderType}
                vendor={activeDelivery.restaurantId || activeDelivery.restaurant}
                customerAddress={activeDelivery.address}
              />

              {/* Pickup vs Delivery Locations */}
              <div className="grid md:grid-cols-2 gap-4">
                
                {/* Pickup Restaurant/Mandi */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 text-xs font-extrabold uppercase tracking-wider">
                      <Navigation className="w-4 h-4 text-amber-600" />
                      <span>1. Pickup Store Location</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.restaurantId?.latitude || 28.5700},${activeDelivery.restaurantId?.longitude || 77.3200}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-extrabold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition"
                    >
                      🗺️ Map Directions
                    </a>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900">{activeDelivery.restaurantId?.name || 'Sabzi Store'}</h4>
                  <p className="text-xs text-slate-500 font-medium">{activeDelivery.restaurantId?.address?.street || 'Lakkarpur Mandi'}, {activeDelivery.restaurantId?.address?.city || 'Faridabad'}</p>
                </div>

                {/* Dropoff Customer */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700 text-xs font-extrabold uppercase tracking-wider">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>2. Customer Dropoff Location</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.address?.latitude || 28.5355},${activeDelivery.address?.longitude || 77.3910}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition"
                    >
                      🗺️ Map Directions
                    </a>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900">{activeDelivery.customerId?.name || 'Customer'}</h4>
                  <p className="text-xs text-slate-500 font-medium">{activeDelivery.address?.street || 'Customer Address'}, {activeDelivery.address?.city || 'Faridabad'}</p>
                  <p className="text-xs text-slate-600 font-mono font-bold">Phone: {activeDelivery.customerId?.phone || 'Contact Available'}</p>
                </div>

              </div>

              {/* Driver Actions */}
              <div className="pt-2 flex flex-wrap gap-3">
                {['READY_FOR_PICKUP', 'COURIER_ASSIGNED', 'VENDOR_ACCEPTED', 'PREPARING'].includes(activeDelivery.status) && (
                  <button
                    onClick={() => handleUpdateStatus(activeDelivery._id || activeDelivery.id, 'PICKED_UP')}
                    className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                  >
                    Confirm {activeDelivery.orderType === 'FRESH' ? 'Sabzi Basket' : 'Food'} Picked Up
                  </button>
                )}

                {activeDelivery.status === 'PICKED_UP' && (
                  <button
                    onClick={() => handleUpdateStatus(activeDelivery._id || activeDelivery.id, 'OUT_FOR_DELIVERY')}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                  >
                    Start Trip (Out For Delivery)
                  </button>
                )}

                {activeDelivery.status === 'OUT_FOR_DELIVERY' && (
                  <button
                    onClick={() => handleUpdateStatus(activeDelivery._id || activeDelivery.id, 'DELIVERED')}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Order as Delivered</span>
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-soft">
              <Bike className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-slate-800">No Active Delivery Job</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">When vendors accept orders, you will get real-time trip notifications and route maps here.</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
