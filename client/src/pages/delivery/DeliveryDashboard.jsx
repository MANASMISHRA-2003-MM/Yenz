import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../services/api';
import { socket } from '../../services/socket';
import Navbar from '../../components/Navbar';
import FreshCartFooter from '../../components/FreshCartFooter';
import MapSimulator from '../../components/MapSimulator';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import DeliveryTimeline from '../../components/DeliveryTimeline';
import {
  Bike, MapPin, Navigation, ToggleLeft, ToggleRight,
  BellRing, CheckCircle2, AlertTriangle, Phone, KeyRound,
  Compass, ArrowRight, ShieldCheck, RefreshCw, Clock, Timer, History, Store,
  User, CreditCard, FileText, Lock, Eye, EyeOff, Edit3, Save, CheckCircle, Smartphone, Award, X
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModal = searchParams.get('modal'); // 'credentials' | 'history' | null

  const [data, setData] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [newJobAlert, setNewJobAlert] = useState(null);
  const [offerCountdown, setOfferCountdown] = useState(15);
  const [acceptingOffer, setAcceptingOffer] = useState(false);

  // Rider Profile state
  const [riderProfile, setRiderProfile] = useState(null);
  const [showMaskedBank, setShowMaskedBank] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    vehicleType: 'Bike',
    vehicleNumber: '',
    dlNumber: '',
    aadharNumber: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Rider Geolocation
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [riderCoords, setRiderCoords] = useState(null);
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

  useEffect(() => {
    activeDeliveryRef.current = data?.activeDelivery;
  }, [data?.activeDelivery]);

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

  useEffect(() => {
    if (data?.riderProfile) {
      setRiderProfile(data.riderProfile);
      setProfileForm({
        fullName: data.riderProfile.fullName || '',
        phone: data.riderProfile.phone || '',
        address: data.riderProfile.address || '',
        vehicleType: data.riderProfile.vehicleType || 'Bike',
        vehicleNumber: data.riderProfile.vehicleNumber || 'DL 01 EX 1234',
        dlNumber: data.riderProfile.dlNumber || 'DL-98203918239',
        aadharNumber: data.riderProfile.documents?.aadharNumber || '4821 9812 0192',
        bankName: data.riderProfile.bankDetails?.bankName || 'HDFC Bank',
        accountNumber: data.riderProfile.bankDetails?.accountNumber || '918273645012',
        ifscCode: data.riderProfile.bankDetails?.ifscCode || 'HDFC0001234',
        accountHolderName: data.riderProfile.bankDetails?.accountHolderName || data.riderProfile.fullName || 'Rider Partner'
      });
    }
  }, [data?.riderProfile]);

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

    socket.emit('join_drivers_room', riderCoords || null);

    const handleNewJob = (job) => {
      const targetId = String(job.orderId || job.id || '');
      const offerId = String(job.offerId || '');
      const orderNum = String(job.orderNumber || '');

      if (
        rejectedJobsRef.current.has(targetId) ||
        (offerId && rejectedJobsRef.current.has(offerId)) ||
        (orderNum && rejectedJobsRef.current.has(orderNum))
      ) {
        return;
      }

      if (offerId && seenOfferIdsRef.current.has(offerId)) return;
      if (offerId) seenOfferIdsRef.current.add(offerId);

      const rem = job.expiresAt
        ? Math.max(1, Math.round((new Date(job.expiresAt).getTime() - Date.now()) / 1000))
        : 15;
      setOfferCountdown(rem);
      setNewJobAlert(job);

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

  const startWatchingLocation = () => {
    if (!('geolocation' in navigator)) {
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
        setRiderCoords({ lat, lng });

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
        });

        socket.emit('driver:online_location', { lat, lng });
        API.post('/deliveries/location', { latitude: lat, longitude: lng }).catch(() => { });

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
        console.warn('Geolocation watch error:', err);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 3000 }
    );
  };

  const stopWatchingLocation = () => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationEnabled(false);
  };

  useEffect(() => {
    if (isOnline) startWatchingLocation();
    else stopWatchingLocation();
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
        navigate('/delivery/active-trip');
      }
    } catch (err) {
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

  const handleVerifyPinAndComplete = async (activeDelivery) => {
    if (deliveryPinInput.length !== 4) {
      toast.error('Please enter the 4-digit PIN provided by the customer');
      return;
    }

    setPinSubmitting(true);
    try {
      const deliveryId = activeDelivery._id || activeDelivery.id;

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
          toast.error(err2.response?.data?.message || 'Invalid 4-digit PIN.');
          return;
        }
      }
      toast.error(err.response?.data?.message || 'Invalid 4-digit PIN. Please re-check with customer.');
    } finally {
      setPinSubmitting(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await API.put('/deliveries/profile', {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        address: profileForm.address,
        vehicleType: profileForm.vehicleType,
        vehicleNumber: profileForm.vehicleNumber,
        dlNumber: profileForm.dlNumber,
        aadharNumber: profileForm.aadharNumber,
        bankDetails: {
          bankName: profileForm.bankName,
          accountNumber: profileForm.accountNumber,
          ifscCode: profileForm.ifscCode,
          accountHolderName: profileForm.accountHolderName
        }
      });
      if (res.data.success) {
        toast.success('✅ Rider Profile & Credentials updated successfully!');
        setRiderProfile(res.data.riderProfile);
        setIsEditingProfile(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update rider credentials');
    } finally {
      setSavingProfile(false);
    }
  };

  const closeModal = () => {
    setSearchParams({});
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Navbar />
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin my-auto" />
      </div>
    );
  }

  const activeDelivery = data?.activeDelivery || null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Clean Standard Header Bar */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl shrink-0">
              <Bike className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black tracking-wider uppercase text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  Rider Dispatch Portal
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {isOnline ? 'ONLINE & READY FOR JOBS' : 'OFFLINE'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                {riderProfile?.fullName || 'Delivery Partner Portal'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                📍 Live Zone: <strong className="text-slate-800">{riderAddressName || 'GPS Active'}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-extrabold text-xs transition active:scale-95 ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {isOnline ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
              <span>{isOnline ? 'Go Offline' : 'Go Online'}</span>
            </button>
            <button
              onClick={fetchDashboard}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200"
              title="Refresh Dashboard"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Summary Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Today's Earnings</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5">₹{data?.totalEarnings || 413}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Completed Trips</p>
            <p className="text-xl font-extrabold text-cyan-600 mt-0.5">{data?.completedCount || 6}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm col-span-2 sm:col-span-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Payout Rate</p>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">Base ₹35 + ₹20 / km</p>
          </div>
        </div>

        {/* Sound & Vibration Alarm Banner */}
        <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <BellRing className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>🔔 Sound Alarms & Mobile Vibration active for incoming orders</span>
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

        {/* GPS Mandatory Status Bar */}
        {!locationEnabled && (
          <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-300 flex-shrink-0 animate-bounce" />
              <div>
                <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-md">GPS LOCATION MANDATORY</span>
                <h3 className="text-sm font-extrabold mt-0.5">Live Rider GPS Tracking is Currently Inactive</h3>
                <p className="text-xs text-rose-100 font-medium">Turn on live GPS to receive real-time nearby delivery orders and calculate trip earnings.</p>
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

        {/* Real-time 15-Second Expiring Delivery Offer Card */}
        {newJobAlert && !rejectedJobs.includes(newJobAlert.orderId) && (
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 shadow-xl border-2 border-emerald-500">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${offerCountdown <= 5 ? 'bg-rose-500' : offerCountdown <= 10 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.max(0, (offerCountdown / 15) * 100)}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pt-1">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    NEW DELIVERY OFFER
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    ⏱️ Expires in {offerCountdown}s
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <span>{newJobAlert.restaurantName || newJobAlert.vendorName || 'Pickup Store'}</span>
                    <span className="text-xs font-mono font-semibold text-slate-400">#{newJobAlert.orderNumber || newJobAlert.orderId}</span>
                  </h3>
                  <p className="text-xs text-slate-300 font-medium mt-1">
                    📍 Pickup: {newJobAlert.pickupDistanceKm ? `${newJobAlert.pickupDistanceKm} km` : '1.2 km'} • Customer: ~{newJobAlert.distanceKm || newJobAlert.deliveryDistanceKm || '2.4'} km away
                  </p>
                </div>

                <div className="pt-1 flex items-center gap-3">
                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold text-base">
                    ₹{newJobAlert.payout || 85} Payout
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    ~{newJobAlert.estimatedPickupMinutes || 4} min pickup
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={acceptingOffer}
                  onClick={() => handleAcceptJob(newJobAlert.orderId, newJobAlert.offerId)}
                  className="flex-1 sm:flex-none w-full px-7 py-3.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-green-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                >
                  {acceptingOffer ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>ACCEPT ₹{newJobAlert.payout || 85}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleRejectJob(newJobAlert.orderId, newJobAlert.offerId)}
                  className="flex-1 sm:flex-none w-full px-5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs rounded-xl transition text-center"
                >
                  SKIP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clean Main Active Delivery Order Card */}
        <div className="space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-600" />
            <span>My Active Delivery Job</span>
          </h2>

          {activeDelivery ? (
            <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-sm space-y-6">

              <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 border border-emerald-300 rounded-xl flex items-center justify-center text-lg">🛵</div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Active Trip Navigation View</h4>
                    <p className="text-[11px] text-slate-600 font-medium">Turn-by-turn routing, customer phone, store pickup & PIN verification</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/delivery/active-trip')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-2 active:scale-95"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Open Full Trip Navigation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono font-bold">Order #{activeDelivery.orderNumber || activeDelivery.orderId}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${activeDelivery.orderType === 'FRESH' || activeDelivery.order?.orderType === 'FRESH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      {activeDelivery.orderType === 'FRESH' || activeDelivery.order?.orderType === 'FRESH' ? '🥬 FRESH SABZI MANDI' : '🍔 RESTAURANT MEAL'}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                    Trip Payout: <span className="text-emerald-600">₹{activeDelivery.predictedPayout || activeDelivery.earnings || 85}</span> (~{activeDelivery.tripDistanceKm || activeDelivery.distanceKm || 2.4} km)
                  </h3>
                </div>
                <OrderStatusBadge status={activeDelivery.status} />
              </div>

              <div className="pt-1">
                <DeliveryTimeline status={activeDelivery.status} compact={true} />
              </div>

              {/* Live Map Simulator */}
              <MapSimulator
                orderId={activeDelivery.orderId || activeDelivery.id}
                orderType={activeDelivery.orderType || activeDelivery.order?.orderType}
                vendor={activeDelivery.restaurant || activeDelivery.restaurantId}
                customerAddress={activeDelivery.customerAddress || activeDelivery.address}
                initialCourierLocation={riderCoords || { lat: activeDelivery.pickupLat, lng: activeDelivery.pickupLng }}
              />

              {/* Pickup Store vs Dropoff Customer Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-900 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-amber-700" /> 1. Pickup Store Location
                    </span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.pickupLat || activeDelivery.restaurant?.latitude || 28.5700},${activeDelivery.pickupLng || activeDelivery.restaurant?.longitude || 77.3200}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-extrabold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-3 py-1 rounded-xl transition flex items-center gap-1"
                    >
                      <span>🗺️ Navigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900">{activeDelivery.restaurant?.name || activeDelivery.restaurantId?.name || 'Local Store'}</h4>
                  <p className="text-xs text-slate-600 font-medium">{activeDelivery.restaurant?.address || activeDelivery.restaurantId?.address?.street || 'Store Address'}, {activeDelivery.restaurant?.city || 'City'}</p>
                  {(activeDelivery.restaurant?.phone || activeDelivery.restaurantId?.phone) && (
                    <a
                      href={`tel:${activeDelivery.restaurant?.phone || activeDelivery.restaurantId?.phone}`}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-800 hover:underline pt-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Store: {activeDelivery.restaurant?.phone || activeDelivery.restaurantId?.phone}</span>
                    </a>
                  )}
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-900 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" /> 2. Customer Dropoff Destination
                    </span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.dropLat || activeDelivery.customerAddress?.latitude || activeDelivery.address?.latitude || activeDelivery.pickupLat},${activeDelivery.dropLng || activeDelivery.customerAddress?.longitude || activeDelivery.address?.longitude || activeDelivery.pickupLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-extrabold text-emerald-900 bg-emerald-200/80 hover:bg-emerald-300 px-3 py-1 rounded-xl transition flex items-center gap-1"
                    >
                      <span>🗺️ Navigate</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900">{activeDelivery.customer?.name || activeDelivery.customerId?.name || 'Customer'}</h4>
                  <p className="text-xs text-slate-600 font-medium">{activeDelivery.customerAddress?.addressLine || activeDelivery.address?.street || 'Customer Address'}, {activeDelivery.customerAddress?.city || 'City'}</p>
                  {(activeDelivery.customer?.phone || activeDelivery.customerId?.phone) && (
                    <a
                      href={`tel:${activeDelivery.customer?.phone || activeDelivery.customerId?.phone}`}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800 hover:underline pt-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Customer: {activeDelivery.customer?.phone || activeDelivery.customerId?.phone}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* 4-Digit Delivery PIN Verification Box */}
              {['OUT_FOR_DELIVERY', 'PICKED_UP', 'ARRIVED_AT_CUSTOMER'].includes(activeDelivery.status) && (() => {
                const dropLat = activeDelivery.dropLat || activeDelivery.customerAddress?.latitude || activeDelivery.address?.latitude;
                const dropLng = activeDelivery.dropLng || activeDelivery.customerAddress?.longitude || activeDelivery.address?.longitude;
                const distMeters = (riderCoords?.lat && riderCoords?.lng && dropLat && dropLng)
                  ? calculateDistanceMeters(riderCoords.lat, riderCoords.lng, dropLat, dropLng)
                  : null;
                const isWithin350m = distMeters !== null ? distMeters <= 350 : true;

                return (
                  <div className={`p-5 rounded-3xl space-y-3 border transition-all ${
                    isWithin350m
                      ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-emerald-300'
                      : 'bg-amber-50/90 border-amber-300'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
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
                              <span>📍 Within 350m Geofence ({distMeters}m away) — UNLOCKED</span>
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

                    {!isWithin350m && (
                      <div className="p-3 bg-amber-100/80 border border-amber-300 rounded-2xl text-xs text-amber-950 font-bold">
                        <p className="flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>📍 Move closer to customer dropoff location ({distMeters}m away, max 350m allowed)</span>
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder={isWithin350m ? "e.g. 4821" : "Locked"}
                        disabled={!isWithin350m || pinSubmitting}
                        value={deliveryPinInput}
                        onChange={(e) => setDeliveryPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full sm:w-44 text-center tracking-widest text-2xl font-mono font-black py-2.5 px-4 bg-white border-2 border-emerald-400 text-slate-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner disabled:bg-slate-100 disabled:border-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={() => handleVerifyPinAndComplete(activeDelivery)}
                        disabled={!isWithin350m || deliveryPinInput.length !== 4 || pinSubmitting}
                        className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {pinSubmitting ? 'Verifying PIN...' : 'Verify PIN & Complete Delivery'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Rider 2-Step Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                {['ASSIGNED', 'PREPARING', 'READY_FOR_PICKUP', 'ARRIVED_AT_PICKUP'].includes(activeDelivery.status) && (
                  <button
                    onClick={() => handleUpdateStatus(activeDelivery._id || activeDelivery.id, 'PICKED_UP', activeDelivery.orderId)}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Mark Order Received from Vendor</span>
                  </button>
                )}

                {activeDelivery.status === 'OUT_FOR_DELIVERY' && (
                  <button
                    onClick={() => handleUpdateStatus(activeDelivery._id || activeDelivery.id, 'ARRIVED_AT_CUSTOMER', activeDelivery.orderId)}
                    className="flex-1 py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Arrived at Customer Location</span>
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <Bike className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-slate-800">No Active Delivery Job</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium max-w-md mx-auto">
                When stores accept orders within your 3 km live GPS zone, real-time trip notifications will ring directly here.
              </p>
            </div>
          )}
        </div>

      </main>

      {/* MODAL 1: MY DETAILS & CREDENTIALS */}
      {activeModal === 'credentials' && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">My Details & Credentials</h3>
                  <p className="text-xs text-slate-500 font-medium">Rider identity, vehicle registration & bank account</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                    <input type="text" value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-600" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                    <input type="text" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-600" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Vehicle Plate Number</label>
                    <input type="text" value={profileForm.vehicleNumber} onChange={(e) => setProfileForm({ ...profileForm, vehicleNumber: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-600" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Driving License (DL) Number</label>
                    <input type="text" value={profileForm.dlNumber} onChange={(e) => setProfileForm({ ...profileForm, dlNumber: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-600" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Aadhar Card Number</label>
                    <input type="text" value={profileForm.aadharNumber} onChange={(e) => setProfileForm({ ...profileForm, aadharNumber: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-600" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Bank Name</label>
                    <input type="text" value={profileForm.bankName} onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-cyan-600" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Bank Account Number</label>
                    <input type="text" value={profileForm.accountNumber} onChange={(e) => setProfileForm({ ...profileForm, accountNumber: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-cyan-600" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">IFSC Code</label>
                    <input type="text" value={profileForm.ifscCode} onChange={(e) => setProfileForm({ ...profileForm, ifscCode: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-cyan-600" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">Cancel</button>
                  <button type="submit" disabled={savingProfile} className="px-6 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow">{savingProfile ? 'Saving...' : 'Save Credentials'}</button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">VERIFIED RIDER</span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">{riderProfile?.fullName || 'Rider'}</h4>
                    <p className="text-xs text-slate-500">{riderProfile?.phone} • {riderProfile?.email}</p>
                  </div>
                  <button onClick={() => setIsEditingProfile(true)} className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                    <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5"><FileText className="w-4 h-4 text-emerald-600" /> Government ID Credentials</h5>
                    <p className="text-slate-600">Aadhar: <strong className="font-mono text-slate-900">{riderProfile?.documents?.aadharNumber || '4821 9812 0192'}</strong></p>
                    <p className="text-slate-600">Driving License: <strong className="font-mono text-slate-900">{riderProfile?.dlNumber || 'DL-98203918239'}</strong></p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                    <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5"><Bike className="w-4 h-4 text-amber-600" /> Vehicle Registration</h5>
                    <p className="text-slate-600">Vehicle Type: <strong className="text-slate-900">{riderProfile?.vehicleType || 'Bike'}</strong></p>
                    <p className="text-slate-600">Plate Number: <strong className="font-mono text-slate-900">{riderProfile?.vehicleNumber || 'DL 01 EX 1234'}</strong></p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-cyan-600" /> Payout Bank Account</h5>
                      <button onClick={() => setShowMaskedBank(!showMaskedBank)} className="text-[11px] font-bold text-cyan-700 hover:underline">
                        {showMaskedBank ? 'Show Full' : 'Hide'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                      <p>Bank: <strong className="text-slate-900">{riderProfile?.bankDetails?.bankName || 'HDFC Bank'}</strong></p>
                      <p>IFSC: <strong className="font-mono text-slate-900">{riderProfile?.bankDetails?.ifscCode || 'HDFC0001234'}</strong></p>
                      <p className="col-span-2">Account: <strong className="font-mono text-slate-900">{showMaskedBank ? `XXXX-XXXX-${(riderProfile?.bankDetails?.accountNumber || '8921').slice(-4)}` : (riderProfile?.bankDetails?.accountNumber || '918273645012')}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: EARNINGS & HISTORY */}
      {activeModal === 'history' && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Earnings & Delivery History</h3>
                  <p className="text-xs text-slate-500 font-medium">Completed trip payouts & date breakdown</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">Total Earnings</p>
                <p className="text-xl font-extrabold text-emerald-600 mt-0.5">₹{data?.totalEarnings || 413}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase">Completed Trips</p>
                <p className="text-xl font-extrabold text-cyan-600 mt-0.5">{data?.completedCount || 6}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Completed Trips List</h4>
              {data?.pastDeliveries && data.pastDeliveries.length > 0 ? (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {data.pastDeliveries.map((trip, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">Order #{trip.orderNumber || trip.orderId}</span>
                          <span className="px-2 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800">DELIVERED</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">Store: {trip.restaurant?.name || 'Local Store'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-emerald-600 text-sm">₹{trip.earnings || 65}</p>
                        <p className="text-[10px] text-slate-400">{trip.deliveredAt ? new Date(trip.deliveredAt).toLocaleDateString() : 'Completed'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-medium text-center py-6">No past trips recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <FreshCartFooter />
    </div>
  );
}
