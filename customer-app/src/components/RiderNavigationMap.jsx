import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { socket } from '../services/socket';
import API from '../services/api';
import {
  Navigation, Compass, ArrowUp, ArrowLeft, ArrowRight, CornerUpLeft, CornerUpRight,
  MapPin, CheckCircle2, RotateCcw, AlertCircle, RefreshCw, Radio, Store, User,
  Maximize2, Minimize2, X
} from 'lucide-react';
import { splitRouteProgress, calculateDistanceMeters } from '../utils/gpsFilter';

// Custom Marker for Rider with Directional Heading Arrow
const createRiderIcon = (heading = 0) => {
  return L.divIcon({
    className: 'custom-leaflet-rider',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -50%); pointer-events:auto;">
        <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
          <!-- Heading Pulse Ring -->
          <div style="position:absolute; inset:-4px; border-radius:50%; background:rgba(16,185,129,0.25); animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <!-- Vehicle Disc -->
          <div style="width:38px; height:38px; border-radius:50%; background:#ffffff; border:3px solid #059669; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,0.18); z-index:2;">
            <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease; display:flex; align-items:center; justify-content:center; width:100%; height:100%; font-size:18px;">
              🛵
            </div>
          </div>
          <!-- Heading Pointer -->
          <div style="position:absolute; top:-6px; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-bottom:8px solid #059669; transform: rotate(${heading}deg) translateY(-14px); transform-origin:center 22px;"></div>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });
};

const createDestinationIcon = (emoji, label, color) => {
  return L.divIcon({
    className: 'custom-leaflet-dest',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
        <div style="background-color:${color}; color:white; width:38px; height:38px; display:flex; align-items:center; justify-content:center; border:2.5px solid white; border-radius:14px; box-shadow: 0 4px 14px rgba(0,0,0,0.16); font-size:18px;">
          ${emoji}
        </div>
        <span style="background:white; color:#0f172a; font-size:10px; font-weight:800; padding:3px 8px; border-radius:8px; margin-top:4px; border:1px solid #cbd5e1; white-space:nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.12);">
          ${label}
        </span>
      </div>
    `,
    iconSize: [40, 56],
    iconAnchor: [20, 56]
  });
};

// Map controller to follow rider position smoothly and invalidate size on resize/fullscreen
function NavigationCameraController({ riderPos, followMode, heading, headingUpMode, isFullScreen }) {
  const map = useMap();
  const lastCenterRef = useRef(null);

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
    if (!riderPos || !followMode) return;

    try {
      // Pan smoothly to rider position
      map.panTo([riderPos[0], riderPos[1]], {
        animate: true,
        duration: 0.8,
        easeLinearity: 0.25
      });
      lastCenterRef.current = riderPos;
    } catch (e) {}
  }, [riderPos, followMode, map]);

  return null;
}

// Helper to choose the best Lucide icon for a turn maneuver
function ManeuverIcon({ icon, className = 'w-6 h-6' }) {
  switch (icon) {
    case 'turn-left':
    case 'fork-left':
      return <CornerUpLeft className={className} />;
    case 'turn-right':
    case 'fork-right':
      return <CornerUpRight className={className} />;
    case 'depart':
    case 'straight':
      return <ArrowUp className={className} />;
    default:
      return <Navigation className={className} />;
  }
}

export default function RiderNavigationMap({
  orderId,
  stage = 'TO_CUSTOMER', // 'TO_PICKUP' | 'TO_CUSTOMER'
  vendor,
  customerAddress,
  riderCoords, // live from navigator.geolocation
  isFullScreen: externalFullScreen,
  onToggleFullScreen: externalToggleFullScreen,
  onClose: externalOnClose
}) {
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const isFullScreen = externalFullScreen !== undefined ? externalFullScreen : internalFullScreen;

  const handleToggleFullScreen = (val) => {
    const nextVal = typeof val === 'boolean' ? val : !isFullScreen;
    if (externalToggleFullScreen) {
      externalToggleFullScreen(nextVal);
    } else {
      setInternalFullScreen(nextVal);
    }
  };

  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    }
    if (externalToggleFullScreen) {
      externalToggleFullScreen(false);
    }
    setInternalFullScreen(false);
  };

  // Keyboard shortcut: Escape exits fullscreen map
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullScreen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);
  const vendorLat = vendor?.latitude ? Number(vendor.latitude) : (vendor?.lat ? Number(vendor.lat) : null);
  const vendorLng = vendor?.longitude ? Number(vendor.longitude) : (vendor?.lng ? Number(vendor.lng) : null);

  const customerLat = customerAddress?.latitude ? Number(customerAddress.latitude) : (customerAddress?.lat ? Number(customerAddress.lat) : null);
  const customerLng = customerAddress?.longitude ? Number(customerAddress.longitude) : (customerAddress?.lng ? Number(customerAddress.lng) : null);

  const targetLat = stage === 'TO_PICKUP' ? vendorLat : customerLat;
  const targetLng = stage === 'TO_PICKUP' ? vendorLng : customerLng;
  const targetName = stage === 'TO_PICKUP' ? (vendor?.name || 'Pickup Store') : (customerAddress?.street || 'Customer Address');

  // Rider position & orientation
  const [currentRiderPos, setCurrentRiderPos] = useState(
    riderCoords ? [riderCoords.lat, riderCoords.lng] : [vendorLat || 28.57, vendorLng || 77.32]
  );
  const [heading, setHeading] = useState(riderCoords?.heading || 0);

  // Road geometry & turn steps
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [routeSteps, setRouteSteps] = useState([]);
  const [remainingDistanceText, setRemainingDistanceText] = useState('2.4 km');
  const [etaText, setEtaText] = useState('8 mins');

  // Active step & turn countdown
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [distanceToTurn, setDistanceToTurn] = useState(120);
  const [currentRoadName, setCurrentRoadName] = useState('Transit Corridor');
  const [isRerouting, setIsRerouting] = useState(false);

  // Camera & view modes
  const [followMode, setFollowMode] = useState(true);
  const [headingUpMode, setHeadingUpMode] = useState(false);

  // Sync rider position from props
  useEffect(() => {
    if (riderCoords?.lat && riderCoords?.lng) {
      setCurrentRiderPos([riderCoords.lat, riderCoords.lng]);
      if (riderCoords.heading) setHeading(riderCoords.heading);
    }
  }, [riderCoords?.lat, riderCoords?.lng, riderCoords?.heading]);

  // Fetch initial stage-aware road route
  useEffect(() => {
    if (!orderId) return;

    API.get(`/routing/order-route/${orderId}`)
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.geometry) && res.data.geometry.length > 0) {
          setRouteGeometry(res.data.geometry);
          setRouteSteps(res.data.steps || []);
          if (res.data.distanceKm) setRemainingDistanceText(`${res.data.distanceKm} km`);
          if (res.data.durationMinutes) setEtaText(`${res.data.durationMinutes} mins`);
        }
      })
      .catch((err) => {
        console.warn('Initial rider navigation route fetch note:', err.message);
      });
  }, [orderId, stage]);

  // Socket.IO event listeners for rerouting and location sync
  useEffect(() => {
    if (!orderId) return;

    socket.emit('join_order', orderId);

    const handleRouteUpdate = (data) => {
      if (Array.isArray(data.geometry) && data.geometry.length > 0) {
        setRouteGeometry(data.geometry);
      }
      if (Array.isArray(data.steps)) {
        setRouteSteps(data.steps);
        setCurrentStepIdx(0);
      }
      if (data.distanceKm) setRemainingDistanceText(`${data.distanceKm} km`);
      if (data.etaMinutes) setEtaText(`${data.etaMinutes} mins`);
      setIsRerouting(false);
    };

    const handleLocationUpdate = (data) => {
      if (data.currentRoad) setCurrentRoadName(data.currentRoad);
      if (data.distanceToNextManeuver !== undefined && data.distanceToNextManeuver !== null) {
        setDistanceToTurn(data.distanceToNextManeuver);
      }
      if (data.distanceToTarget !== undefined || data.distanceToCustomer !== undefined) {
        const d = data.distanceToTarget !== undefined ? data.distanceToTarget : data.distanceToCustomer;
        setRemainingDistanceText(`${d} km`);
      }
      if (data.etaMinutes) setEtaText(`${data.etaMinutes} mins`);
    };

    socket.on('courier:route_update', handleRouteUpdate);
    socket.on('courier:location_update', handleLocationUpdate);

    return () => {
      socket.off('courier:route_update', handleRouteUpdate);
      socket.off('courier:location_update', handleLocationUpdate);
    };
  }, [orderId]);

  // Live continuous real-time distance and ETA calculation
  useEffect(() => {
    if (
      !currentRiderPos ||
      !Array.isArray(currentRiderPos) ||
      !isValidCoord(currentRiderPos[0]) ||
      !isValidCoord(currentRiderPos[1]) ||
      !isValidCoord(targetLat) ||
      !isValidCoord(targetLng)
    ) {
      return;
    }

    const rLat = currentRiderPos[0];
    const rLng = currentRiderPos[1];

    const R = 6371; // km
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(targetLat - rLat);
    const dLon = toRad(targetLng - rLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(rLat)) * Math.cos(toRad(targetLat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistKm = R * c;

    let realRemainingKm = straightDistKm * 1.25;

    // If polyline geometry exists, compute exact route path distance
    if (Array.isArray(routeGeometry) && routeGeometry.length > 1) {
      let closestIdx = 0;
      let minD = Infinity;
      for (let i = 0; i < routeGeometry.length; i++) {
        const pt = routeGeometry[i];
        const distToPt = Math.hypot(pt[0] - rLat, pt[1] - rLng);
        if (distToPt < minD) {
          minD = distToPt;
          closestIdx = i;
        }
      }

      let polyDistKm = 0;
      for (let i = closestIdx; i < routeGeometry.length - 1; i++) {
        const p1 = routeGeometry[i];
        const p2 = routeGeometry[i + 1];
        const segDLat = toRad(p2[0] - p1[0]);
        const segDLon = toRad(p2[1] - p1[1]);
        const segA =
          Math.sin(segDLat / 2) * Math.sin(segDLat / 2) +
          Math.cos(toRad(p1[0])) * Math.cos(toRad(p2[0])) *
          Math.sin(segDLon / 2) * Math.sin(segDLon / 2);
        const segC = 2 * Math.atan2(Math.sqrt(segA), Math.sqrt(1 - segA));
        polyDistKm += R * segC;
      }
      if (polyDistKm > 0.05) {
        realRemainingKm = polyDistKm;
      }
    }

    let distStr = '';
    if (realRemainingKm < 0.1) {
      distStr = `${Math.round(realRemainingKm * 1000)} m (Arriving)`;
    } else if (realRemainingKm < 1.0) {
      distStr = `${Math.round(realRemainingKm * 1000)} m`;
    } else {
      distStr = `${realRemainingKm.toFixed(1)} km`;
    }
    setRemainingDistanceText(distStr);

    const etaMins = Math.max(1, Math.round(realRemainingKm * 3.2));
    setEtaText(`${etaMins} mins`);
  }, [currentRiderPos, targetLat, targetLng, routeGeometry]);

  // Dynamic turn detection based on current rider location
  useEffect(() => {
    if (!currentRiderPos || !routeSteps || routeSteps.length === 0) return;

    let closestIdx = currentStepIdx;
    let minManeuverDist = Infinity;

    for (let i = currentStepIdx; i < routeSteps.length; i++) {
      const step = routeSteps[i];
      if (step.location) {
        const dist = calculateDistanceMeters(currentRiderPos[0], currentRiderPos[1], step.location[0], step.location[1]);
        if (dist > 25) {
          closestIdx = i;
          minManeuverDist = dist;
          break;
        }
      }
    }

    if (minManeuverDist < Infinity) {
      setCurrentStepIdx(closestIdx);
      setDistanceToTurn(minManeuverDist);
      const activeStep = routeSteps[closestIdx];
      if (activeStep?.road) setCurrentRoadName(activeStep.road);
    }
  }, [currentRiderPos, routeSteps]);

  // Current and next navigation steps
  const activeStep = routeSteps[currentStepIdx] || {
    instruction: `Head toward ${stage === 'TO_PICKUP' ? 'Store' : 'Customer'}`,
    icon: 'depart',
    road: currentRoadName,
    nextRoad: targetName
  };
  const nextStep = routeSteps[currentStepIdx + 1] || null;

  // Split route progress
  const routeSplit = splitRouteProgress(currentRiderPos, routeGeometry);
  const remainingPolyline = routeSplit.remainingPath.length > 1
    ? routeSplit.remainingPath
    : (routeGeometry.length > 1 ? routeGeometry : [currentRiderPos, [targetLat || 28.57, targetLng || 77.32]]);
  const completedPolyline = routeSplit.completedPath.length > 1 ? routeSplit.completedPath : [];

  const destPos = (targetLat && targetLng) ? [targetLat, targetLng] : null;

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-[99999] w-screen h-screen bg-[#F8FAFC] flex flex-col m-0 p-0 overflow-hidden'
          : 'relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-sm flex flex-col h-[80vh] min-h-[580px] w-full transition-all duration-300'
      }
    >

      {/* TOP TURN-BY-TURN GUIDANCE HUD */}
      <div className="absolute top-3 inset-x-3 z-30 pointer-events-none transition-all">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-md text-slate-900 pointer-events-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Big Maneuver Icon */}
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-700 flex items-center justify-center shrink-0 shadow-sm">
              <ManeuverIcon icon={activeStep.icon} className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                  {distanceToTurn < 1000 ? `${distanceToTurn} m` : `${(distanceToTurn / 1000).toFixed(1)} km`}
                </span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  NEXT TURN
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate mt-0.5">
                {activeStep.instruction}
              </h3>
              {nextStep && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                  Then {nextStep.instruction}
                </p>
              )}
            </div>
          </div>

          {/* Dynamic Rerouting Indicator */}
          {isRerouting && (
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-black animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Rerouting</span>
            </div>
          )}
        </div>
      </div>

      {/* LEAFLET MAP CANVAS */}
      <div className="flex-1 w-full relative z-10">
        <MapContainer
          center={currentRiderPos}
          zoom={16}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <NavigationCameraController
            riderPos={currentRiderPos}
            followMode={followMode}
            heading={heading}
            headingUpMode={headingUpMode}
            isFullScreen={isFullScreen}
          />

          {/* Rider Marker with Vehicle & Heading Arrow */}
          <Marker position={currentRiderPos} icon={createRiderIcon(heading)}>
            <Popup>
              <div className="text-xs font-bold p-1 text-slate-900">
                <p className="font-extrabold text-emerald-600">You (Delivery Partner)</p>
                <p className="text-[10px] text-slate-500">Speed: {riderCoords?.speed || 24} km/h</p>
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker */}
          {destPos && (
            <Marker
              position={destPos}
              icon={createDestinationIcon(
                stage === 'TO_PICKUP' ? '🏪' : '📍',
                targetName,
                stage === 'TO_PICKUP' ? '#f59e0b' : '#10b981'
              )}
            >
              <Popup>
                <div className="text-xs font-bold p-1 text-slate-900">
                  <p className="font-extrabold">{targetName}</p>
                  <p className="text-[10px] text-slate-500">{stage === 'TO_PICKUP' ? 'Pickup Store' : 'Customer Dropoff'}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Traveled / Completed Route Trail */}
          {completedPolyline.length > 1 && (
            <Polyline
              positions={completedPolyline}
              color="#94a3b8"
              weight={5}
              opacity={0.65}
              dashArray="4, 6"
            />
          )}

          {/* Vibrant Remaining Two-Wheeler Route */}
          {remainingPolyline.length > 1 && (
            <Polyline
              positions={remainingPolyline}
              color="#059669"
              weight={6}
              opacity={0.95}
            />
          )}
        </MapContainer>
      </div>

      {/* BOTTOM NAVIGATION HUD */}
      <div className="bg-white border-t border-slate-200/90 p-4 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            {stage === 'TO_PICKUP' ? <Store className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
              {stage === 'TO_PICKUP' ? 'TARGET STORE' : 'CUSTOMER DROPOFF'}
            </span>
            <h4 className="text-sm font-black text-slate-900 truncate">{targetName}</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                🛵 Driver GPS: {currentRiderPos[0].toFixed(5)}°, {currentRiderPos[1].toFixed(5)}°
              </span>
              {destPos && (
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                  🎯 Target: {destPos[0].toFixed(5)}°, {destPos[1].toFixed(5)}°
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-1 font-medium">
              Road: <span className="text-slate-800 font-semibold">{currentRoadName}</span>
            </p>
          </div>
        </div>

        {/* Actions & ETA */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none border sm:border-0 border-slate-200">
          <button
            type="button"
            onClick={() => {
              const nextState = !isFullScreen;
              handleToggleFullScreen(nextState);
              if (!nextState && onClose) onClose();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black transition active:scale-95"
            title={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-emerald-700" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-emerald-700" />
                <span>Enter Fullscreen</span>
              </>
            )}
          </button>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <div className="text-left sm:text-right">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Remaining</span>
            <span className="text-base font-black text-slate-900">{remainingDistanceText}</span>
          </div>

          <div className="h-8 w-px bg-slate-200" />

          <div className="text-right">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Estimated ETA</span>
            <span className="text-base font-black text-emerald-700">{etaText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
