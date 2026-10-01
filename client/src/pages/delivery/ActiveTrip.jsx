import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import FreshCartFooter from '../../components/FreshCartFooter';
import MapSimulator from '../../components/MapSimulator';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import DeliveryTimeline from '../../components/DeliveryTimeline';
import {
  Bike, MapPin, Navigation, Phone, KeyRound, Package, Store,
  CheckCircle2, ArrowLeft, ArrowRight, Clock, Timer, Compass,
  ShieldCheck, Route, ChevronRight, AlertTriangle, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { playActionSound } from '../../utils/alertSound';
import { reverseGeocode } from '../../utils/reverseGeocode';

const formatOrderTiming = (dateStr) => {
  if (!dateStr) return { time: 'Recently', elapsed: 'Just now' };
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const diffMinutes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  let elapsed = 'Just now';
  if (diffMinutes === 1) elapsed = '1m ago';
  else if (diffMinutes > 1 && diffMinutes < 60) elapsed = `${diffMinutes}m ago`;
  else if (diffMinutes >= 60) elapsed = `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m ago`;
  return { time, elapsed, diffMinutes };
};

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null ||
      lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) {
    return null;
  }
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2) || (nLat1 === 0 && nLon1 === 0) || (nLat2 === 0 && nLon2 === 0)) return null;

  const R = 6371e3; // Earth's radius in meters
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(nLat2 - nLat1);
  const dLon = toRad(nLon2 - nLon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(nLat1)) * Math.cos(toRad(nLat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Delivery lifecycle steps for the progress tracker
const TRIP_STEPS = [
  { key: 'ASSIGNED', label: 'Assigned', emoji: '📋', color: 'bg-blue-500' },
  { key: 'ARRIVED_AT_PICKUP', label: 'At Store', emoji: '🏪', color: 'bg-amber-500' },
  { key: 'PICKED_UP', label: 'Picked Up', emoji: '📦', color: 'bg-cyan-500' },
  { key: 'OUT_FOR_DELIVERY', label: 'On the Way', emoji: '🛵', color: 'bg-purple-500' },
  { key: 'ARRIVED_AT_CUSTOMER', label: 'At Customer', emoji: '📍', color: 'bg-emerald-500' },
  { key: 'DELIVERED', label: 'Delivered', emoji: '✅', color: 'bg-green-600' }
];

export default function ActiveTrip() {
  const { deliveryId } = useParams();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riderCoords, setRiderCoords] = useState(null);
  const [riderAddressName, setRiderAddressName] = useState('');
  const [deliveryPinInput, setDeliveryPinInput] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const watchIdRef = useRef(null);
  const deliveryRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    deliveryRef.current = delivery;
  }, [delivery]);

  // Fetch delivery data
  const fetchDelivery = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/deliveries/dashboard');
      if (res.data.success && res.data.activeDelivery) {
        setDelivery(res.data.activeDelivery);
      } else {
        // No active delivery — go back to dashboard
        toast.info('No active delivery found.');
        navigate('/delivery/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Error fetching active trip:', err);
      toast.error('Error loading trip details');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  // GPS tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setRiderCoords({ lat, lng });

        reverseGeocode(lat, lng).then((geo) => {
          const addressName = geo?.street
            ? `${geo.street}${geo.city ? `, ${geo.city}` : ''}`
            : (geo?.city || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
          setRiderAddressName(addressName);
        }).catch(() => {
          setRiderAddressName(`${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
        });

        // Emit live location
        socket.emit('driver:online_location', { lat, lng });
        API.post('/deliveries/location', { latitude: lat, longitude: lng }).catch(() => {});

        // If active delivery, push tracking location
        const active = deliveryRef.current;
        if (active && (active.id || active.orderId)) {
          socket.emit('driver:update_location', {
            orderId: active.orderId || active.id,
            lat,
            lng
          });
        }
      },
      (err) => {
        console.warn('GPS watch error:', err);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Listen for order status updates
  useEffect(() => {
    const handleStatusUpdate = (data) => {
      if (data.status === 'DELIVERED' || data.status === 'CANCELLED') {
        toast.success('Delivery completed! Returning to dashboard.');
        navigate('/delivery/dashboard', { replace: true });
      } else {
        fetchDelivery();
      }
    };

    socket.on('order:status_updated', handleStatusUpdate);
    return () => { socket.off('order:status_updated', handleStatusUpdate); };
  }, [fetchDelivery, navigate]);

  const handleUpdateStatus = async (status) => {
    if (!delivery) return;
    setUpdatingStatus(true);
    try {
      const targetId = delivery._id || delivery.id;
      const res = await API.put(`/deliveries/${targetId}/status`, { status });
      if (res.data.success) {
        playActionSound();
        toast.success(`Status updated: ${status.replace(/_/g, ' ')}`);
        await fetchDelivery();
      }
    } catch (err) {
      // Fallback to order status endpoint
      const orderId = delivery.orderId || delivery.order?._id || delivery.order?.id;
      if (orderId) {
        try {
          const res2 = await API.put(`/orders/${orderId}/status`, { status });
          if (res2.data.success) {
            playActionSound();
            toast.success(`Status updated: ${status.replace(/_/g, ' ')}`);
            await fetchDelivery();
            return;
          }
        } catch (e2) {}
      }
      toast.error(err.response?.data?.message || 'Error updating status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleVerifyPinAndComplete = async () => {
    if (deliveryPinInput.length !== 4) {
      toast.error('Please enter the 4-digit PIN provided by the customer');
      return;
    }
    setPinSubmitting(true);
    try {
      const targetId = delivery._id || delivery.id;
      const res = await API.put(`/deliveries/${targetId}/status`, {
        status: 'DELIVERED',
        deliveryPin: deliveryPinInput,
        currentLat: riderCoords?.lat,
        currentLng: riderCoords?.lng
      });
      if (res.data.success) {
        playActionSound();
        toast.success('🎉 Delivery completed! Earnings added.');
        setDeliveryPinInput('');
        navigate('/delivery/dashboard', { replace: true });
      }
    } catch (err) {
      const orderId = delivery.orderId || delivery.order?._id || delivery.order?.id;
      if (orderId) {
        try {
          const res2 = await API.put(`/orders/${orderId}/status`, {
            status: 'DELIVERED',
            deliveryPin: deliveryPinInput,
            currentLat: riderCoords?.lat,
            currentLng: riderCoords?.lng
          });
          if (res2.data.success) {
            playActionSound();
            toast.success('🎉 Delivery completed! Earnings added.');
            setDeliveryPinInput('');
            navigate('/delivery/dashboard', { replace: true });
            return;
          }
        } catch (err2) {
          toast.error(err2.response?.data?.message || 'Invalid 4-digit PIN.');
          return;
        }
      }
      toast.error(err.response?.data?.message || 'Invalid 4-digit PIN. Please re-check with customer.');
    } finally {
      setPinSubmitting(false);
    }
  };

  // Current step index for progress bar
  const getCurrentStepIndex = () => {
    if (!delivery) return 0;
    const idx = TRIP_STEPS.findIndex(s => s.key === delivery.status);
    return idx >= 0 ? idx : 0;
  };

  // Get the next action for the rider
  const getNextAction = () => {
    if (!delivery) return null;
    switch (delivery.status) {
      case 'ASSIGNED':
      case 'PREPARING':
      case 'READY_FOR_PICKUP':
        return {
          primary: { label: '🏪 Arrived at Store', status: 'ARRIVED_AT_PICKUP', color: 'from-amber-500 to-orange-500' },
          secondary: { label: '📦 Skip to Picked Up', status: 'PICKED_UP', color: 'bg-cyan-600 hover:bg-cyan-700' }
        };
      case 'ARRIVED_AT_PICKUP':
        return {
          primary: { label: '📦 Confirm Order Picked Up', status: 'PICKED_UP', color: 'from-cyan-500 to-blue-500' }
        };
      case 'PICKED_UP':
        return {
          primary: { label: '🛵 Start Delivery Trip', status: 'OUT_FOR_DELIVERY', color: 'from-purple-500 to-indigo-500' }
        };
      case 'OUT_FOR_DELIVERY':
        return {
          primary: { label: '📍 Arrived at Customer', status: 'ARRIVED_AT_CUSTOMER', color: 'from-emerald-500 to-teal-500' }
        };
      case 'ARRIVED_AT_CUSTOMER':
        return { showPinVerification: true };
      default:
        return null;
    }
  };

  if (loading && !delivery) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Navbar />
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin my-auto" />
        <p className="text-xs text-slate-500 font-bold mt-3">Loading active trip...</p>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Bike className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-black text-slate-800">No Active Trip</h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Accept a delivery offer to start a new trip.</p>
          <Link
            to="/delivery/dashboard"
            className="mt-6 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm rounded-2xl shadow-md transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIdx = getCurrentStepIndex();
  const nextAction = getNextAction();
  const vendorName = delivery.restaurant?.name || delivery.restaurantId?.name || 'Store';
  const customerName = delivery.customer?.name || delivery.customerId?.name || 'Customer';
  const isHeadingToVendor = ['ASSIGNED', 'PREPARING', 'READY_FOR_PICKUP'].includes(delivery.status);
  const isHeadingToCustomer = ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(delivery.status);
  const isAtCustomer = delivery.status === 'ARRIVED_AT_CUSTOMER';
  const showPinInterface = ['OUT_FOR_DELIVERY', 'PICKED_UP', 'ARRIVED_AT_CUSTOMER'].includes(delivery.status);

  // Build Google Maps navigation URL
  const vendorNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${delivery.pickupLat || delivery.restaurant?.latitude || 28.57},${delivery.pickupLng || delivery.restaurant?.longitude || 77.32}`;
  const customerNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${delivery.dropLat || delivery.customerAddress?.latitude || delivery.address?.latitude || 28.57},${delivery.dropLng || delivery.customerAddress?.longitude || delivery.address?.longitude || 77.32}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-6">
      <Navbar />

      {/* Top Bar — Order Info + Back Button */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/delivery/dashboard"
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4 text-slate-300" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">ACTIVE TRIP</span>
                <span className="text-xs font-mono text-slate-400">#{delivery.orderNumber || delivery.orderId || delivery.id}</span>
              </div>
              <h1 className="text-base font-black text-white mt-0.5">{vendorName} → {customerName}</h1>
            </div>
          </div>
          <div className="text-right">
            <OrderStatusBadge status={delivery.status} />
            <p className="text-emerald-400 font-black text-lg mt-0.5">₹{delivery.predictedPayout || delivery.earnings || 85}</p>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-4 space-y-5">

        {/* Modern Live Delivery Timeline */}
        <DeliveryTimeline status={delivery.status} isFresh={delivery.orderType === 'FRESH'} />

        {/* Navigation Direction Banner */}
        <div className={`rounded-3xl p-5 border-2 transition-all ${
          isHeadingToVendor ? 'bg-gradient-to-r from-amber-950/80 to-amber-900/50 border-amber-600/40' :
          isHeadingToCustomer ? 'bg-gradient-to-r from-purple-950/80 to-purple-900/50 border-purple-600/40' :
          isAtCustomer ? 'bg-gradient-to-r from-emerald-950/80 to-emerald-900/50 border-emerald-600/40' :
          'bg-slate-900 border-slate-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                isHeadingToVendor ? 'bg-amber-500/20' :
                isHeadingToCustomer ? 'bg-purple-500/20' :
                'bg-emerald-500/20'
              }`}>
                {isHeadingToVendor ? '🏪' : isHeadingToCustomer ? '🛵' : '📍'}
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  isHeadingToVendor ? 'text-amber-400' :
                  isHeadingToCustomer ? 'text-purple-400' :
                  'text-emerald-400'
                }`}>
                  {isHeadingToVendor ? 'NAVIGATE TO STORE' :
                   isHeadingToCustomer ? 'DELIVERING TO CUSTOMER' :
                   isAtCustomer ? 'ARRIVED — VERIFY PIN' :
                   'TRIP IN PROGRESS'}
                </span>
                <h2 className="text-lg font-black text-white mt-0.5">
                  {isHeadingToVendor ? vendorName :
                   isHeadingToCustomer ? customerName :
                   isAtCustomer ? `Deliver to ${customerName}` :
                   'Active Trip'}
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {isHeadingToVendor
                    ? (delivery.restaurant?.address || delivery.restaurantId?.address?.street || 'Store Address')
                    : (delivery.customerAddress?.addressLine || delivery.address?.street || 'Customer Address')
                  }
                </p>
              </div>
            </div>

            {/* Big Navigate Button */}
            <a
              href={isHeadingToVendor ? vendorNavUrl : customerNavUrl}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm shadow-lg transition active:scale-95 ${
                isHeadingToVendor ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' :
                'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              <Navigation className="w-5 h-5" />
              <span>Navigate</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Estimated time */}
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Order placed: {formatOrderTiming(delivery.vendorReceivedAt || delivery.placedAt).time} ({formatOrderTiming(delivery.vendorReceivedAt || delivery.placedAt).elapsed})
            </span>
            <span className="flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-slate-500" />
              ~{delivery.tripDistanceKm || delivery.distanceKm || '2.4'} km total trip
            </span>
            <span className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-slate-500" />
              ETA: ~{delivery.estimatedMinutes || 20} mins
            </span>
          </div>
        </div>

        {/* Live Map */}
        <div className="rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl">
          <MapSimulator
            orderId={delivery.orderId || delivery.id}
            orderType={delivery.orderType || delivery.order?.orderType}
            vendor={delivery.restaurant || delivery.restaurantId}
            customerAddress={delivery.customerAddress || delivery.address}
            initialCourierLocation={riderCoords || { lat: delivery.pickupLat, lng: delivery.pickupLng }}
          />
        </div>

        {/* Vendor & Customer Cards Side-by-Side */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Vendor Card */}
          <div className={`rounded-3xl p-5 border transition-all ${
            isHeadingToVendor
              ? 'bg-amber-950/50 border-amber-600/40 ring-2 ring-amber-500/20'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Store className={`w-4 h-4 ${isHeadingToVendor ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isHeadingToVendor ? 'text-amber-400' : 'text-slate-500'}`}>
                  Pickup Store
                </span>
              </div>
              {isHeadingToVendor && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                  HEADING HERE
                </span>
              )}
            </div>
            <h4 className="text-sm font-black text-white">{vendorName}</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {delivery.restaurant?.address || delivery.restaurantId?.address?.street || 'Store Address'}, {delivery.restaurant?.city || 'City'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <a
                href={vendorNavUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-black transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                Navigate
              </a>
              {(delivery.restaurant?.phone || delivery.restaurantId?.phone) && (
                <a
                  href={`tel:${delivery.restaurant?.phone || delivery.restaurantId?.phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-[11px] font-black transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Store
                </a>
              )}
            </div>
          </div>

          {/* Customer Card */}
          <div className={`rounded-3xl p-5 border transition-all ${
            isHeadingToCustomer || isAtCustomer
              ? 'bg-emerald-950/50 border-emerald-600/40 ring-2 ring-emerald-500/20'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${isHeadingToCustomer || isAtCustomer ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isHeadingToCustomer || isAtCustomer ? 'text-emerald-400' : 'text-slate-500'}`}>
                  Customer Dropoff
                </span>
              </div>
              {(isHeadingToCustomer || isAtCustomer) && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  {isAtCustomer ? 'ARRIVED' : 'NEXT STOP'}
                </span>
              )}
            </div>
            <h4 className="text-sm font-black text-white">{customerName}</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {delivery.customerAddress?.addressLine || delivery.address?.street || 'Customer Address'}, {delivery.customerAddress?.city || 'City'}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <a
                href={customerNavUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-black transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                Navigate
              </a>
              {(delivery.customer?.phone || delivery.customerId?.phone) && (
                <a
                  href={`tel:${delivery.customer?.phone || delivery.customerId?.phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-[11px] font-black transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Customer
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Order Items Summary (Collapsible) */}
        {delivery.items && delivery.items.length > 0 && (
          <details className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden">
            <summary className="p-4 cursor-pointer flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-800/50 transition">
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Order Items ({delivery.items.length})
              </span>
              <ChevronRight className="w-4 h-4 transition-transform" />
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {delivery.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                  <div>
                    <span className="text-sm font-bold text-white">{item.name}</span>
                    {item.selectedWeight && (
                      <span className="text-[10px] text-slate-500 ml-2">({item.selectedWeight})</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400">x{item.quantity}</span>
                    <span className="text-xs font-bold text-emerald-400 ml-3">₹{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* 4-Digit PIN Verification with 350m Live Geofence Lock */}
        {showPinInterface && (() => {
          const dropLat = delivery.dropLat || delivery.customerAddress?.latitude || delivery.address?.latitude;
          const dropLng = delivery.dropLng || delivery.customerAddress?.longitude || delivery.address?.longitude;
          const distMeters = (riderCoords?.lat && riderCoords?.lng && dropLat && dropLng)
            ? calculateDistanceMeters(riderCoords.lat, riderCoords.lng, dropLat, dropLng)
            : null;
          const isWithin350m = distMeters !== null ? distMeters <= 350 : true;

          return (
            <div className={`border-2 rounded-3xl p-6 space-y-4 shadow-2xl transition-all ${
              isWithin350m
                ? 'bg-gradient-to-br from-emerald-950/80 to-teal-950/80 border-emerald-500/40'
                : 'bg-amber-950/60 border-amber-500/40'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Customer Delivery PIN</h4>
                    <p className="text-xs text-emerald-400/80 font-medium">
                      Ask customer for their 4-digit secret PIN upon handing over the order.
                    </p>
                  </div>
                </div>

                {distMeters !== null && (
                  <div className={`px-3.5 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${
                    isWithin350m
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {isWithin350m ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>📍 Within 350m ({distMeters}m away) — UNLOCKED</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>🔒 Geofence Locked ({distMeters}m away)</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!isWithin350m && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200 font-bold space-y-1">
                  <p className="flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>📍 Live Device GPS Match Required:</span>
                    <span>Move closer to the customer's delivery location to unlock PIN entry.</span>
                  </p>
                  <p className="text-[11px] text-amber-300/80 font-medium pl-5">
                    Rider live location distance: <strong>{distMeters} meters (Max allowed: 350 meters)</strong>. Drive remaining {distMeters - 350}m to unlock.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  maxLength={4}
                  placeholder={isWithin350m ? "• • • •" : `Locked (${distMeters || '350+'}m away)`}
                  disabled={!isWithin350m || pinSubmitting}
                  value={deliveryPinInput}
                  onChange={(e) => setDeliveryPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full sm:w-48 text-center tracking-[0.5em] text-3xl font-mono font-black py-3 px-4 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-slate-600 shadow-inner disabled:bg-slate-900 disabled:border-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleVerifyPinAndComplete}
                  disabled={!isWithin350m || deliveryPinInput.length !== 4 || pinSubmitting}
                  className="w-full sm:flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {!isWithin350m
                      ? `Arrive within 350m of customer (${distMeters}m away) to unlock PIN`
                      : (pinSubmitting ? 'Verifying...' : 'Verify PIN & Complete Delivery')
                    }
                  </span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Next Action Buttons — Large & Prominent */}
        {nextAction && !nextAction.showPinVerification && (
          <div className="space-y-3">
            {nextAction.primary && (
              <button
                onClick={() => handleUpdateStatus(nextAction.primary.status)}
                disabled={updatingStatus}
                className={`w-full py-5 bg-gradient-to-r ${nextAction.primary.color} text-white font-black text-base uppercase tracking-wider rounded-3xl shadow-2xl transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
              >
                {updatingStatus ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">{nextAction.primary.label.split(' ')[0]}</span>
                    <span>{nextAction.primary.label.substring(nextAction.primary.label.indexOf(' ') + 1)}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
            {nextAction.secondary && (
              <button
                onClick={() => handleUpdateStatus(nextAction.secondary.status)}
                disabled={updatingStatus}
                className={`w-full py-3.5 ${nextAction.secondary.color} text-white font-bold text-xs rounded-2xl transition disabled:opacity-50`}
              >
                {nextAction.secondary.label}
              </button>
            )}
          </div>
        )}

        {/* Rider Location Footer */}
        {riderCoords && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              GPS Live: {riderAddressName || `${riderCoords.lat.toFixed(4)}°, ${riderCoords.lng.toFixed(4)}°`}
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure Trip
            </span>
          </div>
        )}

      <FreshCartFooter />
      </main>
    </div>
  );
}
