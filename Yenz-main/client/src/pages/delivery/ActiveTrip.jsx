import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import FreshCartFooter from '../../components/FreshCartFooter';
import RiderNavigationMap from '../../components/RiderNavigationMap';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import DeliveryTimeline from '../../components/DeliveryTimeline';
import {
  Bike, MapPin, Navigation, Phone, KeyRound, Package, Store,
  CheckCircle2, ArrowLeft, ArrowRight, Clock, Timer, Compass,
  ShieldCheck, Route, ChevronRight, AlertTriangle, ExternalLink, Camera, RefreshCw,
  Maximize2, X
} from 'lucide-react';
import CameraCaptureModal from '../../components/CameraCaptureModal';
import { toast } from 'sonner';
import { playActionSound } from '../../utils/alertSound';
import { reverseGeocode } from '../../utils/reverseGeocode';
import { validateGpsReading } from '../../utils/gpsFilter';

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
  const [hasArrivedAtCustomer, setHasArrivedAtCustomer] = useState(false);
  const [dropoffPhoto, setDropoffPhoto] = useState(null);
  const [dropoffCameraModalOpen, setDropoffCameraModalOpen] = useState(false);
  const [isFullScreenMap, setIsFullScreenMap] = useState(false);

  const watchIdRef = useRef(null);
  const deliveryRef = useRef(null);
  const lastGpsRef = useRef(null);

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

  // GPS tracking with filtering & sanity validation
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const rawCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null, // km/h
          timestamp: pos.timestamp || Date.now()
        };

        // Filter and sanity validate reading
        const validPos = validateGpsReading(rawCoords, lastGpsRef.current);
        if (!validPos) {
          return; // Discard invalid or teleported jitter
        }

        lastGpsRef.current = validPos;
        const lat = validPos.lat;
        const lng = validPos.lng;
        setRiderCoords(validPos);

        reverseGeocode(lat, lng).then((geo) => {
          const addressName = geo?.street
            ? `${geo.street}${geo.city ? `, ${geo.city}` : ''}`
            : (geo?.city || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
          setRiderAddressName(addressName);
        }).catch(() => {
          setRiderAddressName(`${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
        });

        // Emit live location with heading & speed
        socket.emit('driver:online_location', { lat, lng });
        API.post('/deliveries/location', { latitude: lat, longitude: lng }).catch(() => {});

        // If active delivery, push tracking location to order room
        const active = deliveryRef.current;
        if (active && (active.id || active.orderId)) {
          socket.emit('driver:update_location', {
            orderId: active.orderId || active.id,
            lat,
            lng,
            heading: validPos.heading,
            speed: validPos.speed,
            accuracy: validPos.accuracy,
            timestamp: validPos.timestamp
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
        toast.success('🎉 Delivery completed! Returning to dashboard.');
        navigate('/delivery/dashboard?completed=1', { replace: true });
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
      if (status === 'ARRIVED_AT_CUSTOMER') {
        setHasArrivedAtCustomer(true);
      }
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

  const handleVerifyPinAndComplete = async (overridePin) => {
    const pinToSubmit = (typeof overridePin === 'string' && overridePin.length === 4)
      ? overridePin
      : deliveryPinInput;

    if (!dropoffPhoto) {
      toast.warning('📸 Camera photo of the delivered package is required before completing!');
      setDropoffCameraModalOpen(true);
      return;
    }
    if (pinToSubmit.length !== 4) {
      toast.error('Please enter the 4-digit PIN provided by the customer');
      return;
    }
    setPinSubmitting(true);
    try {
      const targetId = delivery._id || delivery.id;
      const res = await API.put(`/deliveries/${targetId}/status`, {
        status: 'DELIVERED',
        deliveryPin: pinToSubmit,
        currentLat: riderCoords?.lat,
        currentLng: riderCoords?.lng,
        riderDeliveryPhoto: dropoffPhoto
      });
      if (res.data.success) {
        playActionSound();
        toast.success('🎉 Delivery completed! Proof photo saved.');
        setDeliveryPinInput('');
        navigate('/delivery/dashboard?completed=1', { replace: true });
      }
    } catch (err) {
      const orderId = delivery.orderId || delivery.order?._id || delivery.order?.id;
      if (orderId) {
        try {
          const res2 = await API.put(`/orders/${orderId}/status`, {
            status: 'DELIVERED',
            deliveryPin: pinToSubmit,
            currentLat: riderCoords?.lat,
            currentLng: riderCoords?.lng,
            riderDeliveryPhoto: dropoffPhoto
          });
          if (res2.data.success) {
            playActionSound();
            toast.success('🎉 Delivery completed! Proof photo saved.');
            setDeliveryPinInput('');
            navigate('/delivery/dashboard?completed=1', { replace: true });
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
    const st = delivery.status;
    if (st === 'ASSIGNED') return 0;
    if (st === 'ARRIVED_AT_PICKUP' || st === 'WAITING_PICKUP') return 1;
    if (st === 'PICKED_UP') return 2;
    if (st === 'OUT_FOR_DELIVERY') return hasArrivedAtCustomer ? 4 : 3;
    if (st === 'ARRIVED_AT_CUSTOMER') return 4;
    if (st === 'DELIVERED') return 5;
    return 0;
  };

  // Get the next action for the rider
  const getNextAction = () => {
    if (!delivery) return null;
    switch (delivery.status) {
      case 'ASSIGNED':
      case 'PREPARING':
      case 'WAITING_PICKUP':
      case 'ARRIVED_AT_PICKUP':
      case 'READY_FOR_PICKUP':
        return {
          primary: { label: '📦 Confirm Order Picked Up & Start Delivery', status: 'OUT_FOR_DELIVERY', color: 'from-cyan-500 to-blue-500' }
        };
      case 'PICKED_UP':
        return {
          primary: { label: '🛵 Start Delivery Trip', status: 'OUT_FOR_DELIVERY', color: 'from-purple-500 to-indigo-500' }
        };
      case 'OUT_FOR_DELIVERY':
        if (hasArrivedAtCustomer) {
          return { showPinVerification: true };
        }
        return {
          primary: { label: '📍 I Have Arrived at Customer', status: 'ARRIVED_AT_CUSTOMER', color: 'from-emerald-500 to-teal-500' }
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
  const isHeadingToVendor = ['ASSIGNED', 'PREPARING', 'WAITING_PICKUP', 'ARRIVED_AT_PICKUP', 'READY_FOR_PICKUP'].includes(delivery.status);
  const isHeadingToCustomer = ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(delivery.status) && !hasArrivedAtCustomer;
  const isAtCustomer = delivery.status === 'ARRIVED_AT_CUSTOMER' || hasArrivedAtCustomer;
  const showPinInterface = ['OUT_FOR_DELIVERY', 'PICKED_UP', 'ARRIVED_AT_CUSTOMER'].includes(delivery.status) || hasArrivedAtCustomer;

  // Build Google Maps navigation URL
  const vendorNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${delivery.pickupLat || delivery.restaurant?.latitude || 28.57},${delivery.pickupLng || delivery.restaurant?.longitude || 77.32}`;
  const customerNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${delivery.dropLat || delivery.customerAddress?.latitude || delivery.address?.latitude || 28.57},${delivery.dropLng || delivery.customerAddress?.longitude || delivery.address?.longitude || 77.32}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      <Navbar />

      {/* Top Bar — Order Info + Back Button */}
      <div className="bg-white border-b border-slate-200/90 px-4 py-4 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Link
              to="/delivery/dashboard"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition border border-slate-200"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ACTIVE TRIP
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  #{delivery.orderNumber || delivery.orderId || delivery.id}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {vendorName} → {customerName}
              </h1>
            </div>
          </div>
          <div className="text-right">
            <OrderStatusBadge status={delivery.status} />
            <p className="text-emerald-600 font-black text-xl mt-0.5">
              ₹{delivery.predictedPayout || delivery.earnings || 85}
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-6">

        {/* Modern Live Synchronized Delivery Timeline */}
        <DeliveryTimeline
          status={delivery.order?.status || delivery.status}
          orderStatus={delivery.order?.status}
          deliveryStatus={delivery.status}
          deliveryPartner={delivery.deliveryPartner}
          isFresh={delivery.orderType === 'FRESH' || delivery.order?.orderType === 'FRESH'}
        />

        {/* Realtime Kitchen Preparation Notification Banner for Rider */}
        {isHeadingToVendor && (
          <div className={`p-4 rounded-3xl border flex items-center justify-between gap-3 text-xs font-bold shadow-xs ${
            delivery.order?.status === 'READY_FOR_PICKUP'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {delivery.order?.status === 'READY_FOR_PICKUP' ? '✅' : '🍳'}
              </span>
              <div>
                <p className="font-extrabold text-sm text-slate-900">
                  {delivery.order?.status === 'READY_FOR_PICKUP'
                    ? 'Food is PREPARED by Store!'
                    : 'Kitchen is currently PREPARING food'}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {delivery.order?.status === 'READY_FOR_PICKUP'
                    ? 'Store has completed preparation. Pick up package directly from counter.'
                    : 'Order is being cooked/packed. Head to store for pickup.'}
                </p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 border ${
              delivery.order?.status === 'READY_FOR_PICKUP'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
            }`}>
              {delivery.order?.status === 'READY_FOR_PICKUP' ? 'Ready for Pickup' : 'Cooking in Kitchen'}
            </span>
          </div>
        )}

        {/* Navigation Direction Banner */}
        <div className={`bg-white rounded-3xl p-5 border shadow-sm transition-all ${
          isHeadingToVendor ? 'border-amber-300/80 ring-2 ring-amber-100' :
          isHeadingToCustomer ? 'border-purple-300/80 ring-2 ring-purple-100' :
          isAtCustomer ? 'border-emerald-300/80 ring-2 ring-emerald-100' :
          'border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                isHeadingToVendor ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                isHeadingToCustomer ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {isHeadingToVendor ? '🏪' : isHeadingToCustomer ? '🛵' : '📍'}
              </div>
              <div className="min-w-0">
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  isHeadingToVendor ? 'text-amber-700' :
                  isHeadingToCustomer ? 'text-purple-700' :
                  'text-emerald-700'
                }`}>
                  {isHeadingToVendor ? 'NAVIGATE TO STORE' :
                   isHeadingToCustomer ? 'DELIVERING TO CUSTOMER' :
                   isAtCustomer ? 'ARRIVED — VERIFY PIN' :
                   'TRIP IN PROGRESS'}
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-0.5 truncate">
                  {isHeadingToVendor ? vendorName :
                   isHeadingToCustomer ? customerName :
                   isAtCustomer ? `Deliver to ${customerName}` :
                   'Active Trip'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
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
              className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-md transition active:scale-95 shrink-0 ${
                isHeadingToVendor
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>Google Maps Navigate</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Estimated time */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 font-bold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Order placed: {formatOrderTiming(delivery.vendorReceivedAt || delivery.placedAt).time} ({formatOrderTiming(delivery.vendorReceivedAt || delivery.placedAt).elapsed})
            </span>
            <span className="flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-slate-400" />
              ~{delivery.tripDistanceKm || delivery.distanceKm || '2.4'} km total trip
            </span>
            <span className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-slate-400" />
              ETA: ~{delivery.estimatedMinutes || 20} mins
            </span>
          </div>
        </div>

        {/* Real Turn-by-Turn Rider Road Navigation Cockpit Header & Frame */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-3 px-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                Live Turn-by-Turn Rider Road Navigation
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsFullScreenMap(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition active:scale-95"
              title="Extend map to full screen navigation"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Extend Fullscreen Map</span>
            </button>
          </div>

          <div className="rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-white">
            <RiderNavigationMap
              orderId={delivery.orderId || delivery.id}
              stage={isHeadingToVendor ? 'TO_PICKUP' : 'TO_CUSTOMER'}
              vendor={delivery.restaurant || delivery.restaurantId}
              customerAddress={delivery.customerAddress || delivery.address}
              riderCoords={riderCoords || { lat: delivery.pickupLat, lng: delivery.pickupLng }}
              isFullScreen={isFullScreenMap}
              onToggleFullScreen={setIsFullScreenMap}
              onClose={() => setIsFullScreenMap(false)}
            />
          </div>
        </div>

        {/* Vendor & Customer Cards Side-by-Side */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Vendor Card */}
          <div className={`rounded-3xl p-5 border transition-all ${
            isHeadingToVendor
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-100 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Store className={`w-4 h-4 ${isHeadingToVendor ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isHeadingToVendor ? 'text-amber-800' : 'text-slate-500'}`}>
                  Pickup Store
                </span>
              </div>
              {isHeadingToVendor && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                  HEADING HERE
                </span>
              )}
            </div>
            <h4 className="text-sm font-black text-slate-900">{vendorName}</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {delivery.restaurant?.address || delivery.restaurantId?.address?.street || 'Store Address'}, {delivery.restaurant?.city || 'City'}
            </p>
            <div className="flex items-center gap-2 mt-3.5">
              <a
                href={vendorNavUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-black transition"
              >
                <Navigation className="w-3.5 h-3.5 text-amber-700" />
                Navigate
              </a>
              {(delivery.restaurant?.phone || delivery.restaurantId?.phone) && (
                <a
                  href={`tel:${delivery.restaurant?.phone || delivery.restaurantId?.phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-black transition"
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
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-100 shadow-sm'
              : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${isHeadingToCustomer || isAtCustomer ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isHeadingToCustomer || isAtCustomer ? 'text-emerald-800' : 'text-slate-500'}`}>
                  Customer Dropoff
                </span>
              </div>
              {(isHeadingToCustomer || isAtCustomer) && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                  {isAtCustomer ? 'ARRIVED' : 'NEXT STOP'}
                </span>
              )}
            </div>
            <h4 className="text-sm font-black text-slate-900">{customerName}</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {delivery.customerAddress?.addressLine || delivery.address?.street || 'Customer Address'}, {delivery.customerAddress?.city || 'City'}
            </p>
            <div className="flex items-center gap-2 mt-3.5">
              <a
                href={customerNavUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 border border-emerald-200 rounded-xl text-[11px] font-black transition"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                Navigate
              </a>
              {(delivery.customer?.phone || delivery.customerId?.phone) && (
                <a
                  href={`tel:${delivery.customer?.phone || delivery.customerId?.phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-black transition"
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
          <details className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <summary className="p-4 cursor-pointer flex items-center justify-between text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition">
              <span className="flex items-center gap-2 text-slate-800">
                <Package className="w-4 h-4 text-emerald-600" />
                Order Items ({delivery.items.length})
              </span>
              <ChevronRight className="w-4 h-4 transition-transform text-slate-400" />
            </summary>
            <div className="px-4 pb-4 space-y-2">
              {delivery.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <span className="text-sm font-bold text-slate-800">{item.name}</span>
                    {item.selectedWeight && (
                      <span className="text-[10px] text-slate-400 ml-2">({item.selectedWeight})</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500">x{item.quantity}</span>
                    <span className="text-xs font-bold text-emerald-600 ml-3">₹{item.price}</span>
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
            <div className={`bg-white border-2 rounded-3xl p-6 space-y-4 shadow-sm transition-all ${
              isWithin350m
                ? 'border-emerald-300 ring-2 ring-emerald-50'
                : 'border-amber-300 ring-2 ring-amber-50'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Customer Delivery PIN</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Ask customer for their 4-digit secret PIN upon handing over the order.
                    </p>
                  </div>
                </div>

                {distMeters !== null && (
                  <div className={`px-3.5 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${
                    isWithin350m
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {isWithin350m ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>📍 Within 350m ({distMeters}m away) — UNLOCKED</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>🔒 Geofence Locked ({distMeters}m away)</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Photo Verification Banner / Shutter Trigger */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {dropoffPhoto ? (
                    <img
                      src={dropoffPhoto}
                      alt="Delivery dropoff proof"
                      className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
                      <Camera className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      {dropoffPhoto ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Delivery Photo Captured</span>
                        </>
                      ) : (
                        <span>Step 1: Take Photo of Delivered Food</span>
                      )}
                    </h5>
                    <p className="text-[11px] text-slate-500 truncate">
                      {dropoffPhoto ? 'Photo verified for delivery history' : 'Camera-only live photo required before completing'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDropoffCameraModalOpen(true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                    dropoffPhoto
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{dropoffPhoto ? 'Retake' : 'Open Camera'}</span>
                </button>
              </div>

              {/* GPS Coordinates Telemetry Box */}
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                    🛵 Rider GPS: {riderCoords?.lat ? Number(riderCoords.lat).toFixed(5) : '...'}°, {riderCoords?.lng ? Number(riderCoords.lng).toFixed(5) : '...'}°
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold">
                    👤 Dropoff GPS: {dropLat ? Number(dropLat).toFixed(5) : '...'}°, {dropLng ? Number(dropLng).toFixed(5) : '...'}°
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg font-bold border ${
                    isWithin350m
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    📏 Distance: {distMeters !== null ? `${distMeters}m` : 'Detecting...'}
                  </span>
                  {!isWithin350m && dropLat && dropLng && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetPos = { lat: Number(dropLat), lng: Number(dropLng), accuracy: 10, timestamp: Date.now() };
                        setRiderCoords(targetPos);
                        socket.emit('driver:update_location', {
                          orderId: delivery.orderId || delivery.id,
                          lat: Number(dropLat),
                          lng: Number(dropLng)
                        });
                        API.post('/deliveries/location', { latitude: Number(dropLat), longitude: Number(dropLng) }).catch(() => {});
                        toast.success('📍 Rider GPS matched with customer delivery doorstep!');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] transition shadow-xs"
                    >
                      Sync GPS to Doorstep
                    </button>
                  )}
                </div>
              </div>

              {/* Form with Inputs and Arrow Submit Buttons */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyPinAndComplete();
                }}
                className="space-y-3"
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* 4-Digit Input with Inline Arrow Submit Button */}
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="• • • •"
                      disabled={pinSubmitting}
                      value={deliveryPinInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setDeliveryPinInput(val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyPinAndComplete();
                        }
                      }}
                      onKeyUp={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyPinAndComplete();
                        }
                      }}
                      className="w-full text-center tracking-[0.45em] text-3xl font-mono font-black py-3.5 px-4 pr-14 bg-white border-2 border-emerald-400 focus:border-emerald-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-100 text-slate-900 placeholder:text-slate-300 shadow-inner"
                      autoFocus
                    />
                    {/* Inline Arrow button inside the input on the right */}
                    <button
                      type="submit"
                      disabled={deliveryPinInput.length !== 4 || pinSubmitting}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        deliveryPinInput.length === 4
                          ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md shadow-emerald-500/30 cursor-pointer animate-pulse'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                      }`}
                      title="Press Enter or Click Arrow to Submit PIN & Complete Order"
                    >
                      {pinSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ArrowRight className="w-5 h-5 stroke-[3]" />
                      )}
                    </button>
                  </div>

                  {/* Submit Order Arrow Button */}
                  <button
                    type="submit"
                    disabled={deliveryPinInput.length !== 4 || pinSubmitting}
                    className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-md ${
                      deliveryPinInput.length === 4
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 cursor-pointer active:scale-98 ring-2 ring-emerald-300'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                    title="Press Enter or Click to Submit PIN and Complete Order"
                  >
                    {pinSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Order...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Submit PIN & Complete Order (or press Enter ↵)</span>
                        <ArrowRight className="w-5 h-5 stroke-[3] text-white" />
                      </>
                    )}
                  </button>
                </div>

                {/* Instant Big Submit Bar when 4 digits are typed */}
                {deliveryPinInput.length === 4 && (
                  <button
                    type="submit"
                    disabled={pinSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 active:scale-[0.98] transition animate-pulse cursor-pointer border border-emerald-400"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Click Arrow or Press Enter ↵ to Complete Delivery (PIN: {deliveryPinInput})</span>
                    <ArrowRight className="w-6 h-6 stroke-[3]" />
                  </button>
                )}
              </form>
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
                className={`w-full py-5 bg-gradient-to-r ${nextAction.primary.color} text-white font-black text-base uppercase tracking-wider rounded-3xl shadow-xl transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
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
                className={`w-full py-3.5 ${nextAction.secondary.color} text-white font-bold text-xs rounded-2xl transition disabled:opacity-50 shadow-sm`}
              >
                {nextAction.secondary.label}
              </button>
            )}
          </div>
        )}

        {/* Rider Location Footer */}
        {riderCoords && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 font-medium">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              GPS Live: {riderAddressName || `${riderCoords.lat.toFixed(4)}°, ${riderCoords.lng.toFixed(4)}°`}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secure Yenz Trip
            </span>
          </div>
        )}

      <FreshCartFooter />
      </main>

      {/* Live Camera Modal for Rider Dropoff Verification */}
      <CameraCaptureModal
        isOpen={dropoffCameraModalOpen}
        onClose={() => setDropoffCameraModalOpen(false)}
        onCapture={(photo) => {
          setDropoffPhoto(photo);
          toast.success('📸 Dropoff proof photo captured successfully!');
        }}
        title="Capture Delivery Dropoff Photo"
        subtitle="Point camera at the food / package at the customer location"
      />
    </div>
  );
}
