import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { socket } from '../services/socket';
import API from '../services/api';
import { Compass, ShieldCheck, MapPin, Navigation, Clock, AlertTriangle, Radio, Maximize2, Minimize2, X } from 'lucide-react';
import { splitRouteProgress, calculateDistanceMeters } from '../utils/gpsFilter';

// Custom HTML DivIcon generator
const createCustomIcon = (emoji, label, bgColor, heading = null) => {
  const rotationHtml = heading !== null
    ? `<div style="transform: rotate(${heading}deg); transition: transform 0.4s ease; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">
         ${emoji}
       </div>`
    : emoji;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%); pointer-events:auto;">
        <div style="background-color:${bgColor}; color:white; width:40px; height:40px; display:flex; align-items:center; justify-content:center; border:2.5px solid white; border-radius:14px; box-shadow: 0 8px 24px rgba(0,0,0,0.32); font-size:18px;">
          ${rotationHtml}
        </div>
        <span style="background:rgba(15,23,42,0.92); color:white; font-size:10px; font-weight:800; padding:3px 8px; border-radius:8px; margin-top:4px; border:1px solid rgba(255,255,255,0.25); white-space:nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
          ${label}
        </span>
      </div>
    `,
    iconSize: [40, 58],
    iconAnchor: [20, 58]
  });
};

function MapAutoBounds({ bounds, isFullScreen }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 150);
    const timer2 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 350);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [map, isFullScreen]);

  useEffect(() => {
    if (!bounds || bounds.length === 0) return;
    try {
      // Only fit bounds on first load or when route bounds significantly expand
      if (!hasFittedRef.current) {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
        hasFittedRef.current = true;
      }
    } catch (e) {}
  }, [bounds, map]);

  return null;
}

export default function CustomerTrackingMap({
  orderId,
  orderType = 'FOOD',
  vendor,
  customerAddress,
  initialCourierLocation
}) {
  const vendorLat = vendor?.latitude ? Number(vendor.latitude) : (vendor?.lat ? Number(vendor.lat) : null);
  const vendorLng = vendor?.longitude ? Number(vendor.longitude) : (vendor?.lng ? Number(vendor.lng) : null);

  const customerLat = customerAddress?.latitude ? Number(customerAddress.latitude) : (customerAddress?.lat ? Number(customerAddress.lat) : vendorLat);
  const customerLng = customerAddress?.longitude ? Number(customerAddress.longitude) : (customerAddress?.lng ? Number(customerAddress.lng) : vendorLng);

  // Raw & animated courier coordinates for smooth interpolation
  const [courierPos, setCourierPos] = useState(
    initialCourierLocation || ((vendorLat && customerLat) ? { lat: (vendorLat + customerLat) / 2, lng: (vendorLng + customerLng) / 2 } : null)
  );
  const [animatedPos, setAnimatedPos] = useState(courierPos);
  const [courierHeading, setCourierHeading] = useState(0);

  // Road geometry & navigation steps from routing engine
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [routeStage, setRouteStage] = useState('TO_CUSTOMER'); // 'TO_PICKUP' | 'TO_CUSTOMER'
  const [distanceText, setDistanceText] = useState('1.8 km');
  const [etaText, setEtaText] = useState('7 mins');
  const [currentRoad, setCurrentRoad] = useState('');
  const [nextManeuver, setNextManeuver] = useState('');

  // GPS health & staleness tracking
  const [lastGpsTimestamp, setLastGpsTimestamp] = useState(Date.now());
  const [gpsStatus, setGpsStatus] = useState('LIVE'); // 'LIVE' | 'STALE' | 'UNAVAILABLE'
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Ref to cancel animation frames on unmount
  const animFrameRef = useRef(null);
  const targetPosRef = useRef(courierPos);
  const startPosRef = useRef(courierPos);
  const animStartTimeRef = useRef(null);

  // Smooth interpolation over 1200ms
  const animateMarkerTo = (target) => {
    if (!animatedPos) {
      setAnimatedPos(target);
      return;
    }
    startPosRef.current = { ...animatedPos };
    targetPosRef.current = { ...target };
    animStartTimeRef.current = performance.now();

    const DURATION = 1200; // ms

    const step = (timestamp) => {
      const elapsed = timestamp - animStartTimeRef.current;
      const progress = Math.min(1, elapsed / DURATION);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      const lat = startPosRef.current.lat + (targetPosRef.current.lat - startPosRef.current.lat) * ease;
      const lng = startPosRef.current.lng + (targetPosRef.current.lng - startPosRef.current.lng) * ease;

      setAnimatedPos({ lat, lng });

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(step);
  };

  // Check GPS staleness every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - lastGpsTimestamp;
      if (elapsed > 45000) {
        setGpsStatus('UNAVAILABLE');
      } else if (elapsed > 15000) {
        setGpsStatus('STALE');
      } else {
        setGpsStatus('LIVE');
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [lastGpsTimestamp]);

  // Fetch initial stage-aware road route from Routing API
  useEffect(() => {
    if (!orderId) return;

    API.get(`/routing/order-route/${orderId}`)
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.geometry) && res.data.geometry.length > 0) {
          setRouteGeometry(res.data.geometry);
          setRouteStage(res.data.stage || 'TO_CUSTOMER');
          if (res.data.distanceKm) setDistanceText(`${res.data.distanceKm} km`);
          if (res.data.durationMinutes) setEtaText(`${res.data.durationMinutes} mins`);
        }
      })
      .catch((err) => {
        console.warn('Initial road route fetch note:', err.message);
      });
  }, [orderId]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!orderId) return;

    socket.emit('join_order', orderId);

    // 1. Live location updates from driver
    const handleLocationUpdate = (data) => {
      setLastGpsTimestamp(Date.now());
      setGpsStatus('LIVE');

      const targetLat = Number(data.lat ?? data.snappedLat);
      const targetLng = Number(data.lng ?? data.snappedLng);

      if (targetLat && targetLng && !isNaN(targetLat) && !isNaN(targetLng)) {
        const newPos = { lat: targetLat, lng: targetLng };
        setCourierPos(newPos);
        animateMarkerTo(newPos);
      }

      if (data.heading) setCourierHeading(data.heading);
      if (data.stage) setRouteStage(data.stage);
      if (data.currentRoad) setCurrentRoad(data.currentRoad);
      if (data.nextManeuver) setNextManeuver(data.nextManeuver);

      if (data.distanceToCustomer !== undefined || data.distanceToTarget !== undefined) {
        const dist = data.distanceToCustomer !== undefined ? data.distanceToCustomer : data.distanceToTarget;
        setDistanceText(`${dist} km`);
      }
      if (data.etaMinutes !== undefined) {
        setEtaText(`${data.etaMinutes} mins`);
      }
    };

    // 2. Real road route geometry updates (initial or dynamic rerouting)
    const handleRouteUpdate = (data) => {
      if (Array.isArray(data.geometry) && data.geometry.length > 0) {
        setRouteGeometry(data.geometry);
      }
      if (data.stage) setRouteStage(data.stage);
      if (data.distanceKm) setDistanceText(`${data.distanceKm} km`);
      if (data.etaMinutes) setEtaText(`${data.etaMinutes} mins`);
    };

    // 3. Socket reconnect handling: re-join and recover
    const handleReconnect = () => {
      socket.emit('join_order', orderId);
    };

    socket.on('courier:location_update', handleLocationUpdate);
    socket.on('courier:route_update', handleRouteUpdate);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('courier:location_update', handleLocationUpdate);
      socket.off('courier:route_update', handleRouteUpdate);
      socket.off('connect', handleReconnect);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [orderId]);

  const isFresh = orderType === 'FRESH' || orderType === 'FRESH_MANDI';
  const vendorLabel = isFresh ? (vendor?.name || 'Sabzi Mandi Store') : (vendor?.name || 'Restaurant Kitchen');
  const vendorEmoji = isFresh ? '🥬' : '🏬';

  const vendorPos = (vendorLat && vendorLng) ? [vendorLat, vendorLng] : null;
  const driverPos = animatedPos?.lat && animatedPos?.lng
    ? [animatedPos.lat, animatedPos.lng]
    : ((vendorLat && customerLat) ? [(vendorLat + customerLat) / 2, (vendorLng + customerLng) / 2] : [28.57, 77.32]);
  const customerPos = (customerLat && customerLng) ? [customerLat, customerLng] : null;

  // Split route progress into completed vs remaining paths
  const routeSplit = splitRouteProgress(driverPos, routeGeometry);
  const remainingPolyline = routeSplit.remainingPath.length > 1
    ? routeSplit.remainingPath
    : (routeGeometry.length > 1 ? routeGeometry : [vendorPos || driverPos, customerPos || driverPos]);
  const completedPolyline = routeSplit.completedPath.length > 1 ? routeSplit.completedPath : [];

  const bounds = [
    ...(vendorPos ? [vendorPos] : []),
    driverPos,
    ...(customerPos ? [customerPos] : [])
  ];

  return (
    <div className="fc-card p-4 sm:p-5 space-y-4">
      {/* Header with Live Status & ETA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-sm">
            <Radio className="w-4 h-4 animate-pulse text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-slate-900">Live Road Delivery Tracker</h4>
              {gpsStatus === 'LIVE' ? (
                <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE GPS
                </span>
              ) : gpsStatus === 'STALE' ? (
                <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  LOCATION UPDATING...
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  SIGNAL PAUSED
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {routeStage === 'TO_PICKUP'
                ? 'Rider is on the way to collect your order from the store'
                : 'Rider is on the road heading to your delivery address'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Estimated Arrival</span>
            <span className="text-sm font-black text-emerald-600">{etaText} ({distanceText})</span>
          </div>
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 hover:border-cyan-500 rounded-xl text-xs font-bold transition active:scale-95 shadow-sm"
            title={isFullScreen ? 'Exit Full Screen' : 'Extend Map to Full Screen for Navigation'}
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Exit Full</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Extend Map</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Street & Navigation Context Bar for Customer */}
      {(currentRoad || nextManeuver) && (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2 truncate">
            <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Current Road:</span>
            <span className="text-white font-bold truncate">{currentRoad || 'Main Transit Road'}</span>
          </div>
          {nextManeuver && (
            <span className="text-[11px] text-cyan-300 font-extrabold shrink-0 ml-2 hidden md:inline">
              Next: {nextManeuver}
            </span>
          )}
        </div>
      )}

      {/* Real-time GPS Telemetry: Exact Driver & Customer Coordinates */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            🛵 Live Driver GPS: {driverPos[0].toFixed(5)}°, {driverPos[1].toFixed(5)}°
          </span>
          {customerPos && (
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold flex items-center gap-1.5">
              👤 Customer Dropoff GPS: {customerPos[0].toFixed(5)}°, {customerPos[1].toFixed(5)}°
            </span>
          )}
        </div>
        {customerPos && (
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-extrabold ml-auto">
            📏 Direct Distance: {Math.round(calculateDistanceMeters(driverPos[0], driverPos[1], customerPos[0], customerPos[1]))}m
          </span>
        )}
      </div>

      {/* Interactive Map Container */}
      <div
        className={
          isFullScreen
            ? 'fixed inset-0 z-[99999] w-screen h-screen bg-slate-950 flex flex-col m-0 p-0 overflow-hidden'
            : 'relative h-72 sm:h-96 w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center transition-all'
        }
      >
        {isFullScreen && (
          <button
            type="button"
            onClick={() => setIsFullScreen(false)}
            className="absolute top-4 right-4 z-50 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl shadow-2xl flex items-center gap-2 border-2 border-rose-400 font-black text-xs transition active:scale-95 cursor-pointer backdrop-blur-md group"
            title="Exit Full Screen & Return to Order Menu"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
            <span>Back to Order Menu</span>
          </button>
        )}

        <MapContainer
          center={driverPos}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%', borderRadius: isFullScreen ? '0px' : '1rem', zIndex: 10 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapAutoBounds bounds={bounds} isFullScreen={isFullScreen} />

          {/* 1. Store Origin Marker */}
          {vendorPos && (
            <Marker position={vendorPos} icon={createCustomIcon(vendorEmoji, vendorLabel, '#f59e0b')}>
              <Popup>
                <div className="text-xs font-bold text-slate-900 p-1">
                  <p className="font-extrabold text-amber-700">{vendorLabel}</p>
                  <p className="text-[10px] text-slate-500">Dispatch Origin Store</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* 2. Live Rider Marker (with rotation & smooth positioning) */}
          <Marker position={driverPos} icon={createCustomIcon('🛵', `Rider (${distanceText})`, '#06b6d4', courierHeading)}>
            <Popup>
              <div className="text-xs font-bold text-slate-900 p-1">
                <p className="font-extrabold text-cyan-700">Delivery Partner</p>
                <p className="text-[10px] text-slate-500">ETA: {etaText} • {distanceText} away</p>
                {currentRoad && <p className="text-[10px] text-slate-400 mt-0.5">{currentRoad}</p>}
              </div>
            </Popup>
          </Marker>

          {/* 3. Customer Delivery Location Marker */}
          {customerPos && (
            <Marker position={customerPos} icon={createCustomIcon('🏠', 'Your Address', '#10b981')}>
              <Popup>
                <div className="text-xs font-bold text-slate-900 p-1">
                  <p className="font-extrabold text-emerald-700">Your Delivery Location</p>
                  <p className="text-[10px] text-slate-500">{customerAddress?.street || customerAddress?.addressLine || 'Dropoff Destination'}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Completed Trail Polyline (subtle traveled path) */}
          {completedPolyline.length > 1 && (
            <Polyline
              positions={completedPolyline}
              color="#94a3b8"
              weight={4}
              opacity={0.7}
              dashArray="4, 6"
            />
          )}

          {/* Active Remaining Road Polyline (vibrant road geometry) */}
          {remainingPolyline.length > 1 && (
            <Polyline
              positions={remainingPolyline}
              color={isFresh ? '#059669' : '#e11d48'}
              weight={5}
              opacity={0.9}
            />
          )}
        </MapContainer>
      </div>

      {/* Safety & Realtime Verification Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-medium">
        <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Contactless Handover Verified
        </span>
        <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Road-calculated ETA
        </span>
      </div>
    </div>
  );
}
