import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import MapSimulator from '../../components/MapSimulator';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import DeliveryTimeline from '../../components/DeliveryTimeline';
import {
  Bike, MapPin, Navigation, ToggleLeft, ToggleRight,
  BellRing, CheckCircle2, AlertTriangle, Phone, KeyRound,
  Compass, ArrowRight, ShieldCheck, RefreshCw, Clock, Timer, History, Store
} from 'lucide-react';
import { toast } from 'sonner';
import { startRepeatingAlert, stopAlertSound, playActionSound, unlockAudio, triggerHaptics, playCashRegisterSound } from '../../utils/alertSound';
import { requestNotificationPermission, showBrowserAlert } from '../../utils/browserNotification';
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

const getPredictedETA = (dateStr, deliveryMinutes = 20) => {
  const base = dateStr ? new Date(dateStr) : new Date();
  const etaDate = new Date(base.getTime() + deliveryMinutes * 60000);
  const etaTime = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  return { etaTime, durationMinutes: deliveryMinutes };
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

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [newJobAlert, setNewJobAlert] = useState(null);
  const [offerCountdown, setOfferCountdown] = useState(15);
  const [acceptingOffer, setAcceptingOffer] = useState(false);

  // Rider Continuous Geolocation & Tracking
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [riderCoords, setRiderCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [riderAddressName, setRiderAddressName] = useState(() => {
    try {
      return localStorage.getItem('milega_rider_address_name') || '';
    } catch {
      return '';
    }
  });

  const getStoredRejected = () => {
    try {
      const stored = localStorage.getItem('milega_rejected_jobs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };
  const [rejectedJobs, setRejectedJobs] = useState(getStoredRejected);
  const rejectedJobsRef = useRef(new Set(getStoredRejected().map(String)));
  const seenOfferIdsRef = useRef(new Set());
  const activeDeliveryRef = useRef(null);

  // 4-Digit Delivery Completion PIN
  const [deliveryPinInput, setDeliveryPinInput] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const watchIdRef = useRef(null);

  // Synchronize active delivery ref to prevent stale GPS closure
  useEffect(() => {
    activeDeliveryRef.current = data?.activeDelivery;
  }, [data?.activeDelivery]);

  // Handle active offer from dashboard response if available
  useEffect(() => {
    if (data?.activeOffer && !newJobAlert) {
      const off = data.activeOffer;
      const offKey = String(off.offerId || off.id || '');
      if (!rejectedJobsRef.current.has(offKey)) {
        setNewJobAlert(off);
        const rem = off.remainingSeconds !== undefined ? off.remainingSeconds : (
          off.expiresAt ? Math.max(1, Math.round((new Date(off.expiresAt).getTime() - Date.now()) / 1000)) : 15
        );
        setOfferCountdown(rem > 0 ? rem : 15);
      }
    }
  }, [data?.activeOffer]);

  // 15-second Offer Countdown Timer
  useEffect(() => {
    if (!newJobAlert) return;
    const timer = setInterval(() => {
      setOfferCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setNewJobAlert(null);
          stopAlertSound();
          toast.info('Delivery offer timed out.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [newJobAlert]);

  useEffect(() => {
    fetchDashboard();
    unlockAudio();
    requestNotificationPermission();

    // Join driver socket pool
    socket.emit('join_drivers_room', riderCoords || null);

    // Listen to real-time incoming delivery alerts (both targeted new_offer & new_job_available)
    const handleNewJob = (job) => {
      const targetId = String(job.orderId || job.id || '');
      const offerId = String(job.offerId || '');
      const orderNum = String(job.orderNumber || '');

      // Strictly ignore and never ring if this job/offer was previously rejected
      if (
        rejectedJobsRef.current.has(targetId) ||
        (offerId && rejectedJobsRef.current.has(offerId)) ||
        (orderNum && rejectedJobsRef.current.has(orderNum))
      ) {
        console.log(`[Rider] Silently skipping rejected job ${orderNum || targetId}`);
        return;
      }

      // Deduplicate seen offers
      if (offerId && seenOfferIdsRef.current.has(offerId)) {
        return;
      }
      if (offerId) seenOfferIdsRef.current.add(offerId);

      const rem = job.expiresAt
        ? Math.max(1, Math.round((new Date(job.expiresAt).getTime() - Date.now()) / 1000))
        : 15;
      setOfferCountdown(rem);
      setNewJobAlert(job);

      // Trigger native background browser alert with sound & vibration
      showBrowserAlert({
        title: `🚨 NEW DELIVERY OFFER: #${job.orderNumber || job.orderId}`,
        body: `Store: ${job.restaurantName || job.vendorName || 'Pickup Store'} • Payout: ₹${job.payout || 85}. Tap to open rider app and accept.`,
        tag: `job-${job.offerId || job.orderId || Date.now()}`,
        url: '/delivery/dashboard'
      });

      startRepeatingAlert(() => {
        toast.warning(`🚨 NEW DELIVERY OFFER: #${job.orderNumber || job.orderId} (₹${job.payout || 85})`);
      });
      triggerHaptics();
    };

    const handleOfferCancelled = (payload) => {
      const cancelledOfferId = String(payload?.offerId || '');
      const cancelledOrderId = String(payload?.orderId || '');

      setNewJobAlert((current) => {
        if (
          current &&
          (String(current.offerId) === cancelledOfferId ||
            String(current.orderId) === cancelledOrderId ||
            String(current.id) === cancelledOrderId)
        ) {
          stopAlertSound();
          toast.info(payload.message || 'Delivery offer was taken by another rider or expired.');
          return null;
        }
        return current;
      });
    };

    const handleOrderAssigned = () => {
      fetchDashboard();
      stopAlertSound();
    };

    const handleConnect = () => {
      socket.emit('join_drivers_room', riderCoords || null);
      fetchDashboard();
    };

    socket.on('connect', handleConnect);
    socket.on('delivery:new_offer', handleNewJob);
    socket.on('delivery:new_job_available', handleNewJob);
    socket.on('delivery:offer_cancelled', handleOfferCancelled);
    socket.on('order:assigned', handleOrderAssigned);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('delivery:new_offer', handleNewJob);
      socket.off('delivery:new_job_available', handleNewJob);
      socket.off('delivery:offer_cancelled', handleOfferCancelled);
      socket.off('order:assigned', handleOrderAssigned);
      stopAlertSound();
    };
  }, []);

  // Continuous watchPosition GPS tracking with stale-ref resolution
  const startWatchingLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationEnabled(false);
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocationEnabled(true);
        setLocationError(null);
        setRiderCoords({ lat, lng });

        // Reverse geocode live rider coordinates to get precise street, area, and city name
        reverseGeocode(lat, lng).then((geo) => {
          const addressName = geo?.street
            ? `${geo.street}${geo.city ? `, ${geo.city}` : ''}`
            : (geo?.city || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);

          setRiderAddressName(addressName);
          try {
            localStorage.setItem('milega_rider_coords', JSON.stringify({ lat, lng, time: Date.now() }));
            localStorage.setItem('milega_rider_address_name', addressName);
            window.dispatchEvent(new CustomEvent('milega_rider_location_changed', {
              detail: { lat, lng, addressName }
            }));
          } catch (e) {}
        }).catch(() => {
          const fallback = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
          setRiderAddressName(fallback);
          try {
            localStorage.setItem('milega_rider_coords', JSON.stringify({ lat, lng, time: Date.now() }));
            window.dispatchEvent(new CustomEvent('milega_rider_location_changed', {
              detail: { lat, lng, addressName: fallback }
            }));
          } catch (e) {}
        });

        // Update driver online location in socket pool and RiderLocation table
        socket.emit('driver:online_location', { lat, lng });
        API.post('/deliveries/location', { latitude: lat, longitude: lng }).catch(() => { });

        // If there is an active delivery, push live location using activeDeliveryRef
        const active = activeDeliveryRef.current;
        if (active && (active.id || active.orderId)) {
          socket.emit('driver:update_location', {
            orderId: active.orderId || active.id,
            lat,
            lng
          });
        }
      },
      (err) => {
        console.warn('Rider geolocation watch error:', err);
        setRiderCoords(prev => {
          if (!prev) {
            setLocationEnabled(false);
            setLocationError('Live GPS is required to view nearby deliveries and navigate.');
          }
          return prev;
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 3000
      }
    );
  };

  const stopWatchingLocation = () => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationEnabled(false);
  };

  // Manage GPS lifecycle according to online status
  useEffect(() => {
    if (isOnline) {
      startWatchingLocation();
    } else {
      stopWatchingLocation();
    }
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isOnline]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const resDash = await API.get('/deliveries/dashboard');
      if (resDash.data.success) {
        setData(resDash.data);
        if (resDash.data.isOnline !== undefined) {
          setIsOnline(resDash.data.isOnline);
        }
      }
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
        playActionSound();
        if (!res.data.isOnline) {
          stopWatchingLocation();
          setNewJobAlert(null);
          stopAlertSound();
        } else {
          startWatchingLocation();
        }
        toast.success(res.data.isOnline ? 'You are now ONLINE' : 'You are now OFFLINE');
      }
    } catch (err) {
      console.error('Toggle online error:', err);
    }
  };

  const handleAcceptJob = async (orderId, offerId) => {
    if (!locationEnabled) {
      toast.error('Live GPS required! Please enable GPS location before accepting jobs.');
      startWatchingLocation();
      return;
    }

    try {
      setAcceptingOffer(true);
      let res;
      if (offerId) {
        res = await API.post(`/deliveries/offers/${offerId}/accept`);
      } else {
        res = await API.put(`/orders/${orderId}/accept-job`);
      }

      if (res.data.success) {
        stopAlertSound();
        playActionSound();
        setNewJobAlert(null);
        toast.success('🎉 Delivery job accepted! Navigating to trip view...');
        await fetchDashboard();
        // Navigate to the dedicated active trip navigation page
        navigate('/delivery/active-trip');
      }
    } catch (err) {
      // If offer was taken by another rider (atomic conditional check)
      if (err.response?.status === 409) {
        stopAlertSound();
        setNewJobAlert(null);
        toast.error('Offer was already accepted by another nearby rider!');
        fetchDashboard();
      } else {
        toast.error(err.response?.data?.message || 'Error accepting delivery job');
      }
    } finally {
      setAcceptingOffer(false);
    }
  };

  const handleRejectJob = (orderId, offerId) => {
    stopAlertSound();
    const idStr = String(orderId || '');
    const offStr = String(offerId || '');
    if (idStr) rejectedJobsRef.current.add(idStr);
    if (offStr) rejectedJobsRef.current.add(offStr);
    if (newJobAlert?.orderNumber) {
      rejectedJobsRef.current.add(String(newJobAlert.orderNumber));
    }
    setRejectedJobs(prev => {
      const next = Array.from(new Set([...prev, idStr, offStr].filter(Boolean)));
      try {
        localStorage.setItem('milega_rejected_jobs', JSON.stringify(next));
      } catch (e) { }
      return next;
    });
    setNewJobAlert(null);
    toast.info('Delivery offer declined.');
    if (offerId) {
      API.post(`/deliveries/offers/${offerId}/reject`, { reason: 'Rider declined offer' }).catch(() => { });
    } else if (orderId) {
      API.put(`/orders/${orderId}/reject-job`).catch(() => { });
    }
  };

  const handleUpdateStatus = async (deliveryId, status, orderId) => {
    try {
      const targetId = deliveryId || orderId;
      const res = await API.put(`/deliveries/${targetId}/status`, { status });
      if (res.data.success) {
        playActionSound();
        toast.success(`Status updated: ${status.replace(/_/g, ' ')}`);
        fetchDashboard();
      }
    } catch (err) {
      // Fallback to order status endpoint if delivery record id mismatch
      if (orderId) {
        try {
          const res2 = await API.put(`/orders/${orderId}/status`, { status });
          if (res2.data.success) {
            playActionSound();
            toast.success(`Status updated: ${status.replace(/_/g, ' ')}`);
            fetchDashboard();
            return;
          }
        } catch (e2) { }
      }
      toast.error(err.response?.data?.message || 'Error updating status');
    }
  };

  // Complete delivery by verifying 4-digit customer PIN
  const handleVerifyPinAndComplete = async (activeDelivery) => {
    if (deliveryPinInput.length !== 4) {
      toast.error('Please enter the 4-digit PIN provided by the customer');
      return;
    }

    setPinSubmitting(true);
    try {
      const deliveryId = activeDelivery._id || activeDelivery.id;
      const orderId = activeDelivery.orderId || activeDelivery.order?._id || activeDelivery.order?.id;

      // Call delivery update with deliveryPin and live rider GPS coordinates for geofence validation
      const res = await API.put(`/deliveries/${deliveryId}/status`, {
        status: 'DELIVERED',
        deliveryPin: deliveryPinInput,
        currentLat: riderCoords?.lat,
        currentLng: riderCoords?.lng
      });

      if (res.data.success) {
        playActionSound();
        toast.success('🎉 Delivery successfully verified and marked DELIVERED! Earnings added.');
        setDeliveryPinInput('');
        fetchDashboard();
      }
    } catch (err) {
      // Try fallback to order status endpoint
      const orderId = activeDelivery.orderId || activeDelivery.order?._id || activeDelivery.order?.id;
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
            toast.success('🎉 Delivery successfully verified and marked DELIVERED! Earnings added.');
            setDeliveryPinInput('');
            fetchDashboard();
            return;
          }
        } catch (err2) {
          toast.error(err2.response?.data?.message || 'Invalid 4-digit PIN. Please re-check with customer.');
          return;
        }
      }
      toast.error(err.response?.data?.message || 'Invalid 4-digit PIN. Please re-check with customer.');
    } finally {
      setPinSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-3">
        <Navbar />
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin my-auto" />
      </div>
    );
  }

  // Active delivery: strictly bound to this authenticated driver's assigned delivery
  const activeDelivery = data?.activeDelivery || null;

  // Available nearby unassigned jobs
  const availableUnassignedJobs = (data?.availableJobs || []).filter(job => {
    const id = String(job._id || job.id || job.orderId || '');
    const num = String(job.orderNumber || '');
    return !rejectedJobsRef.current.has(id) && !rejectedJobsRef.current.has(num) && !rejectedJobs.includes(id);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Quick Audio & Haptic Vibration Test Bar */}
        <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-3xl flex flex-wrap items-center justify-between gap-3 text-amber-900 text-xs shadow-sm">
          <div className="flex items-center gap-2 font-extrabold">
            <BellRing className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>🔔 Sound Alarms & Mobile Vibration Alerts are ACTIVE for delivery offers</span>
          </div>
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              playCashRegisterSound();
              triggerHaptics();
              toast.success('🔔 Sound ring & mobile vibration tested successfully!');
            }}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] rounded-xl shadow-sm transition active:scale-95"
          >
            Test Sound & Vibration
          </button>
        </div>

        {/* GPS MANDATORY STATUS BAR */}
        {!locationEnabled && (
          <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white p-5 rounded-3xl shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-300 flex-shrink-0 animate-bounce" />
              <div>
                <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-md">GPS LOCATION MANDATORY</span>
                <h3 className="text-sm font-extrabold mt-0.5">Live Rider GPS Tracking is Currently Inactive</h3>
                <p className="text-xs text-rose-100 font-medium">Turn on live GPS to receive real-time nearby delivery orders, navigate turn-by-turn routes, and calculate trip earnings.</p>
              </div>
            </div>
            <button
              onClick={startWatchingLocation}
              className="px-5 py-2.5 bg-white text-rose-700 hover:bg-rose-50 font-extrabold text-xs rounded-xl shadow-sm transition whitespace-nowrap"
            >
              📍 Turn On Live GPS
            </button>
          </div>
        )}

        {/* Driver Header & Online Switch */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl shrink-0">
              <Bike className="w-8 h-8 text-blue-900" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-blue-900 font-black text-xs uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 flex items-center gap-1.5 shadow-2xs">
                  🛵 Delivery Fleet Portal
                </span>
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {isOnline ? 'ONLINE & READY FOR JOBS' : 'OFFLINE'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Delivery Driver Control Center</h1>

              {/* Live Location Address Card */}
              <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                <div className="px-3 py-1.5 bg-blue-50/90 border border-blue-200 rounded-2xl text-blue-950 font-black text-xs flex flex-wrap items-center gap-2 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <span>📍 RIDER CURRENT LOCATION: <strong className="text-blue-900 font-extrabold">{riderAddressName || (riderCoords ? `${riderCoords.lat.toFixed(4)}° N, ${riderCoords.lng.toFixed(4)}° E` : 'Live Location Tracking Active')}</strong></span>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-lg">(Live Duty Zone)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/orders"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-xl font-extrabold text-xs transition shadow-sm"
              title="View Completed Deliveries & Payout History"
            >
              <History className="w-4 h-4 text-cyan-600" />
              <span>Trip History</span>
            </Link>

            <button
              onClick={fetchDashboard}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              title="Refresh Dashboard"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-extrabold text-xs transition ${isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
            >
              {isOnline ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5" />}
              <span>{isOnline ? 'Go Offline' : 'Go Online'}</span>
            </button>
          </div>
        </div>

        {/* Modern Gen-Z 15-Second Expiring Delivery Offer Ring Card */}
        {newJobAlert && !rejectedJobs.includes(newJobAlert.orderId) && (
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 shadow-2xl border-2 border-emerald-500/40 backdrop-blur-xl animate-in zoom-in-95 duration-200">
            {/* 15-Second Animated Shrinking Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${offerCountdown <= 5 ? 'bg-rose-500' : offerCountdown <= 10 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                style={{ width: `${Math.max(0, (offerCountdown / 15) * 100)}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pt-1">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    NEW DELIVERY OFFER
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    ⏱️ Expires in {offerCountdown}s
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span>{newJobAlert.restaurantName || newJobAlert.vendorName || 'Pickup Store'}</span>
                    <span className="text-xs font-mono font-semibold text-slate-400">#{newJobAlert.orderNumber || newJobAlert.orderId}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
                    <span className="text-emerald-400 font-bold">
                      📍 {newJobAlert.pickupDistanceKm ? `${newJobAlert.pickupDistanceKm} km to pickup` : '1.2 km to pickup'}
                    </span>
                    <span>•</span>
                    <span className="text-slate-300">
                      Customer: ~{newJobAlert.distanceKm || newJobAlert.deliveryDistanceKm || '2.4'} km away
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-3">
                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-base">
                    ₹{newJobAlert.payout || 85} earning
                  </span>
                  <span className="text-xs text-slate-400">
                    {newJobAlert.estimatedPickupMinutes ? `~${newJobAlert.estimatedPickupMinutes} min pickup` : '~4 min to shop'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Accept & Skip */}
              <div className="flex sm:flex-col items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={acceptingOffer}
                  onClick={() => handleAcceptJob(newJobAlert.orderId, newJobAlert.offerId)}
                  className="flex-1 sm:flex-none w-full px-7 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                >
                  {acceptingOffer ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ACCEPT ₹{newJobAlert.payout || 85}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleRejectJob(newJobAlert.orderId, newJobAlert.offerId)}
                  className="flex-1 sm:flex-none w-full px-5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition text-center"
                >
                  SKIP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Today's Earnings</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">₹{data?.totalEarnings || 65}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Completed Trips</p>
            <p className="text-2xl font-extrabold text-cyan-600 mt-1">{data?.completedCount || (data?.pastDeliveries?.length || 0)}</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft col-span-2 md:col-span-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Estimated Revenue Rate</p>
            <p className="text-xl font-extrabold text-slate-900 mt-1">Base ₹35 + ₹20 / km</p>
          </div>
        </div>

        {/* Active Delivery Job Card with Live Navigation Map & Turn-by-Turn Routing */}
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-600" />
            <span>My Current Active Delivery</span>
          </h2>

          {activeDelivery ? (
            <div className="bg-white p-6 rounded-3xl border border-cyan-300 shadow-soft-lg space-y-6">

              {/* Quick Link to Full Trip Navigation Page */}
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 border border-cyan-300 rounded-xl flex items-center justify-center text-lg">🛵</div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Active Trip Navigation</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Full-screen navigation with Google Maps directions, trip progress & PIN verification</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/delivery/active-trip')}
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open Trip View</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Order Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono font-bold">Order #{activeDelivery.orderNumber || activeDelivery.orderId || activeDelivery.id}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${activeDelivery.orderType === 'FRESH' || activeDelivery.order?.orderType === 'FRESH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      {activeDelivery.orderType === 'FRESH' || activeDelivery.order?.orderType === 'FRESH' ? '🥬 FRESH SABZI MANDI' : '🍔 RESTAURANT MEAL'}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                    Trip Payout: <span className="text-emerald-600 font-extrabold">₹{activeDelivery.predictedPayout || activeDelivery.earnings || 85}</span> (~{activeDelivery.tripDistanceKm || activeDelivery.distanceKm || 2.4} km)
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium mt-1.5">
                    <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      Store received order: <strong className="text-slate-900">{formatOrderTiming(activeDelivery.vendorReceivedAt || activeDelivery.placedAt).time}</strong> ({formatOrderTiming(activeDelivery.vendorReceivedAt || activeDelivery.placedAt).elapsed})
                    </span>
                    <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
                      <Timer className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Predicted Delivery Time: ~{activeDelivery.estimatedMinutes || 20} mins (ETA ~{getPredictedETA(activeDelivery.vendorReceivedAt || activeDelivery.placedAt, activeDelivery.estimatedMinutes || 20).etaTime})
                    </span>
                  </div>
                </div>
                <OrderStatusBadge status={activeDelivery.status} />
              </div>

              {/* Compact Timeline Progress Tracker */}
              <div className="pt-2 border-t border-slate-100">
                <DeliveryTimeline status={activeDelivery.status} compact={true} />
              </div>

              {/* LIVE NAVIGATION MAP LAYOUT: Driver -> Vendor -> Customer */}
              <MapSimulator
                orderId={activeDelivery.orderId || activeDelivery.id}
                orderType={activeDelivery.orderType || activeDelivery.order?.orderType}
                vendor={activeDelivery.restaurant || activeDelivery.restaurantId}
                customerAddress={activeDelivery.customerAddress || activeDelivery.address}
                initialCourierLocation={riderCoords || { lat: activeDelivery.pickupLat, lng: activeDelivery.pickupLng }}
              />

              {/* Pickup Store vs Dropoff Customer Details & Direct Turn-by-Turn Navigation */}
              <div className="grid md:grid-cols-2 gap-4">

                {/* 1. Pickup Restaurant / Mandi Store */}
                <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-800 text-xs font-extrabold uppercase tracking-wider">
                      <Navigation className="w-4 h-4 text-amber-600" />
                      <span>1. Pickup Store Location</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.pickupLat || activeDelivery.restaurant?.latitude || 28.5700},${activeDelivery.pickupLng || activeDelivery.restaurant?.longitude || 77.3200}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-extrabold text-amber-800 bg-amber-200/70 hover:bg-amber-300 px-3 py-1 rounded-xl transition flex items-center gap-1 shadow-sm"
                    >
                      <span>🗺️ Navigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900">{activeDelivery.restaurant?.name || activeDelivery.restaurantId?.name || 'Local Store'}</h4>
                  <p className="text-xs text-slate-600 font-medium">{activeDelivery.restaurant?.address || activeDelivery.restaurantId?.address?.street || 'Store Address'}, {activeDelivery.restaurant?.city || 'Faridabad'}</p>
                  {(activeDelivery.restaurant?.phone || activeDelivery.restaurantId?.phone) && (
                    <a
                      href={`tel:${activeDelivery.restaurant?.phone || activeDelivery.restaurantId?.phone}`}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-700 hover:text-amber-800 pt-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Store: {activeDelivery.restaurant?.phone || activeDelivery.restaurantId?.phone}</span>
                    </a>
                  )}
                </div>

                {/* 2. Customer Dropoff Destination */}
                <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>2. Customer Dropoff</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.dropLat || activeDelivery.customerAddress?.latitude || activeDelivery.address?.latitude || activeDelivery.pickupLat},${activeDelivery.dropLng || activeDelivery.customerAddress?.longitude || activeDelivery.address?.longitude || activeDelivery.pickupLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-extrabold text-emerald-800 bg-emerald-200/70 hover:bg-emerald-300 px-3 py-1 rounded-xl transition flex items-center gap-1 shadow-sm"
                    >
                      <span>🗺️ Navigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900">{activeDelivery.customer?.name || activeDelivery.customerId?.name || 'Customer'}</h4>
                  <p className="text-xs text-slate-600 font-medium">{activeDelivery.customerAddress?.addressLine || activeDelivery.address?.street || 'Customer Address'}, {activeDelivery.customerAddress?.city || 'Faridabad'}</p>
                  {(activeDelivery.customer?.phone || activeDelivery.customerId?.phone) && (
                    <a
                      href={`tel:${activeDelivery.customer?.phone || activeDelivery.customerId?.phone}`}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 hover:text-emerald-800 pt-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Customer: {activeDelivery.customer?.phone || activeDelivery.customerId?.phone}</span>
                    </a>
                  )}
                </div>

              </div>

              {/* 4-DIGIT DELIVERY PIN VERIFICATION INTERFACE WITH 350M LIVE GEOFENCE LOCK */}
              {['OUT_FOR_DELIVERY', 'PICKED_UP', 'ARRIVED_AT_CUSTOMER'].includes(activeDelivery.status) && (() => {
                const dropLat = activeDelivery.dropLat || activeDelivery.customerAddress?.latitude || activeDelivery.address?.latitude;
                const dropLng = activeDelivery.dropLng || activeDelivery.customerAddress?.longitude || activeDelivery.address?.longitude;
                const distMeters = (riderCoords?.lat && riderCoords?.lng && dropLat && dropLng)
                  ? calculateDistanceMeters(riderCoords.lat, riderCoords.lng, dropLat, dropLng)
                  : null;
                const isWithin350m = distMeters !== null ? distMeters <= 350 : true;

                return (
                  <div className={`p-5 rounded-3xl space-y-3 shadow-sm border-2 transition-all ${
                    isWithin350m
                      ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-300'
                      : 'bg-amber-50/90 border-amber-300'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-emerald-700" />
                        <h4 className="text-sm font-extrabold text-slate-900">Enter Customer's 4-Digit Delivery PIN</h4>
                      </div>

                      {distMeters !== null && (
                        <div className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${
                          isWithin350m
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {isWithin350m ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>📍 Within 350m Dropoff Geofence ({distMeters}m away) — UNLOCKED</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span>🔒 Geofence Locked ({distMeters}m from Customer)</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {!isWithin350m && (
                      <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-2xl text-xs text-amber-950 font-bold space-y-1">
                        <p className="flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>📍 Live Device GPS Match Required:</span>
                          <span>Move closer to the customer's delivery location to unlock PIN entry.</span>
                        </p>
                        <p className="text-[11px] text-amber-800 font-medium pl-5">
                          Rider live location distance: <strong>{distMeters} meters (Max allowed: 350 meters)</strong>. Drive remaining {distMeters - 350}m to unlock.
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 font-medium">
                      The customer must provide their unique 4-digit PIN (shown on their order tracking screen) upon handing over the order.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder={isWithin350m ? "e.g. 4821" : `Locked (${distMeters || '350+'}m away)`}
                        disabled={!isWithin350m || pinSubmitting}
                        value={deliveryPinInput}
                        onChange={(e) => setDeliveryPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full sm:w-44 text-center tracking-widest text-2xl font-mono font-black py-2.5 px-4 bg-white border-2 border-emerald-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner disabled:bg-slate-100 disabled:border-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={() => handleVerifyPinAndComplete(activeDelivery)}
                        disabled={!isWithin350m || deliveryPinInput.length !== 4 || pinSubmitting}
                        className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {!isWithin350m
                            ? `Arrive within 350m of customer (${distMeters}m away) to unlock PIN`
                            : (pinSubmitting ? 'Verifying PIN with Server...' : 'Verify PIN & Complete Delivery')
                          }
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Progressive Driver Trip Lifecycle Actions */}
              <div className="pt-2 flex flex-wrap gap-3">
                {['ASSIGNED', 'PREPARING', 'READY_FOR_PICKUP'].includes(activeDelivery.status) && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(activeDelivery._id || activeDelivery.id, 'ARRIVED_AT_PICKUP', activeDelivery.orderId)}
                      className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Store className="w-4 h-4" />
                      <span>1. Arrived at Store</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(activeDelivery._id || activeDelivery.id, 'PICKED_UP', activeDelivery.orderId)}
                      className="flex-1 py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      <span>2. Confirm Order Picked Up</span>
                    </button>
                  </>
                )}

                {activeDelivery.status === 'ARRIVED_AT_PICKUP' && (
                  <button
                    onClick={() => handleUpdateStatus(activeDelivery._id || activeDelivery.id, 'PICKED_UP', activeDelivery.orderId)}
                    className="flex-1 py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Order Picked Up from Store</span>
                  </button>
                )}

                {activeDelivery.status === 'PICKED_UP' && (
                  <button
                    onClick={() => handleUpdateStatus(activeDelivery._id || activeDelivery.id, 'OUT_FOR_DELIVERY', activeDelivery.orderId)}
                    className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Start Delivery Trip (Out For Delivery)</span>
                  </button>
                )}

                {activeDelivery.status === 'OUT_FOR_DELIVERY' && (
                  <button
                    onClick={() => handleUpdateStatus(activeDelivery._id || activeDelivery.id, 'ARRIVED_AT_CUSTOMER', activeDelivery.orderId)}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Arrived at Customer Location</span>
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-soft">
              <Bike className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-slate-800">No Active Delivery Job</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">When vendors accept orders, real-time trip notifications and route navigation will appear here.</p>
            </div>
          )}
        </div>

        {/* 3 km Hyperlocal Dispatch Queue Monitor */}
        {!activeDelivery && !newJobAlert && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center mx-auto">
              <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {isOnline ? '3 KM HYPERLOCAL DISPATCH ACTIVE' : 'OFFLINE'}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">
                {isOnline ? 'Waiting for Nearby Dispatch Offers' : 'You are Currently Offline'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-0.5 font-medium leading-relaxed">
                {isOnline
                  ? 'When a store within 3 km of your current GPS location prepares an order, an exclusive 15-second delivery offer will ring directly on your screen with store details and payout.'
                  : 'Toggle your online switch above to start receiving exclusive delivery offers.'}
              </p>
            </div>

            {isOnline && locationEnabled && (
              <div className="pt-2 flex items-center justify-center gap-4 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  GPS Tracking Live
                </span>
                <span>•</span>
                <span className="text-slate-500">Max Dispatch Radius: 3.0 km</span>
                <span>•</span>
                <span className="text-slate-500">Offer Expiration: 15s</span>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
