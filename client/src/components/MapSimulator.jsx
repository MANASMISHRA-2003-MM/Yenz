import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { socket } from '../services/socket';
import { Compass, ShieldCheck } from 'lucide-react';

// Helper to create clean custom HTML markers in Leaflet
const createCustomIcon = (emoji, label, bgColor) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%); pointer-events:auto;">
        <div style="background-color:${bgColor}; color:white; width:38px; height:38px; display:flex; align-items:center; justify-content:center; border:2.5px solid white; border-radius:14px; box-shadow: 0 8px 20px rgba(0,0,0,0.3); font-size:18px;">
          ${emoji}
        </div>
        <span style="background:rgba(15,23,42,0.92); color:white; font-size:10px; font-weight:800; padding:3px 8px; border-radius:8px; margin-top:4px; border:1px solid rgba(255,255,255,0.25); white-space:nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
          ${label}
        </span>
      </div>
    `,
    iconSize: [40, 55],
    iconAnchor: [20, 55]
  });
};

function MapAutoRecenter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [bounds, map]);
  return null;
}

export default function MapSimulator({ orderId, orderType = 'FOOD', vendor, customerAddress, initialCourierLocation }) {
  const vendorLat = vendor?.latitude ? Number(vendor.latitude) : (vendor?.lat ? Number(vendor.lat) : 28.5700);
  const vendorLng = vendor?.longitude ? Number(vendor.longitude) : (vendor?.lng ? Number(vendor.lng) : 77.3200);

  const customerLat = customerAddress?.lat ? Number(customerAddress.lat) : 28.5355;
  const customerLng = customerAddress?.lng ? Number(customerAddress.lng) : 77.3910;

  const [courierPos, setCourierPos] = useState(
    initialCourierLocation || { lat: (vendorLat + customerLat) / 2, lng: (vendorLng + customerLng) / 2 }
  );
  const [distanceText, setDistanceText] = useState('1.8 km away');
  const [etaText, setEtaText] = useState('7 mins');

  useEffect(() => {
    if (!orderId) return;

    socket.emit('join_order', orderId);

    socket.on('courier:location_update', (data) => {
      if (data.lat && data.lng) {
        setCourierPos({ lat: Number(data.lat), lng: Number(data.lng) });
      }
      if (data.statusText) {
        setDistanceText(`${data.distanceToCustomer || 1.8} km away`);
        setEtaText(`${data.etaMinutes || 7} mins`);
      }
    });

    return () => {
      socket.off('courier:location_update');
    };
  }, [orderId]);

  const isFresh = orderType === 'FRESH' || orderType === 'FRESH_MANDI';
  const vendorLabel = isFresh ? (vendor?.name || 'Sabzi Mandi Store') : (vendor?.name || 'Restaurant Kitchen');
  const vendorEmoji = isFresh ? '🥬' : '🏬';

  const vendorPos = [vendorLat, vendorLng];
  const driverPos = [courierPos.lat || (vendorLat + customerLat) / 2, courierPos.lng || (vendorLng + customerLng) / 2];
  const customerPos = [customerLat, customerLng];

  const bounds = [vendorPos, driverPos, customerPos];
  const polylinePath = [vendorPos, driverPos, customerPos];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-soft space-y-4">
      {/* Map Header - Clean & User-Friendly */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Live Delivery Route Tracker</h4>
            <p className="text-[11px] text-slate-500 font-medium">Real-time driver location & delivery path</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Estimated Arrival</span>
          <span className="text-sm font-extrabold text-brand-600">{etaText} ({distanceText})</span>
        </div>
      </div>

      {/* Real Interactive OpenStreetMap Container */}
      <div className="relative h-64 w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
        <MapContainer
          center={driverPos}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%', borderRadius: '1rem', zIndex: 10 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          <MapAutoRecenter bounds={bounds} />

          {/* 1. Store / Mandi Vendor Marker */}
          <Marker position={vendorPos} icon={createCustomIcon(vendorEmoji, vendorLabel, '#f59e0b')}>
            <Popup>
              <div className="text-xs font-bold text-slate-900 p-1">
                <p className="font-extrabold text-amber-700">{vendorLabel}</p>
                <p className="text-[10px] text-slate-500">Dispatch Origin Store</p>
              </div>
            </Popup>
          </Marker>

          {/* 2. Driver Live Marker */}
          <Marker position={driverPos} icon={createCustomIcon('🛵', `Driver (${distanceText})`, '#06b6d4')}>
            <Popup>
              <div className="text-xs font-bold text-slate-900 p-1">
                <p className="font-extrabold text-cyan-700">Delivery Partner</p>
                <p className="text-[10px] text-slate-500">Estimated Arrival: {etaText}</p>
              </div>
            </Popup>
          </Marker>

          {/* 3. Customer Marker */}
          <Marker position={customerPos} icon={createCustomIcon('🏠', 'Your Delivery Location', '#10b981')}>
            <Popup>
              <div className="text-xs font-bold text-slate-900 p-1">
                <p className="font-extrabold text-emerald-700">Your Address</p>
                <p className="text-[10px] text-slate-500">{customerAddress?.street || 'Delivery Destination'}</p>
              </div>
            </Popup>
          </Marker>

          {/* Connecting Delivery Path Polyline */}
          <Polyline
            positions={polylinePath}
            color={isFresh ? '#168a5b' : '#e51b4b'}
            weight={4}
            dashArray="6, 8"
          />
        </MapContainer>
      </div>

      {/* Safety & Status Footer - User Friendly */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-medium">
        <span className="flex items-center gap-1 text-emerald-700 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Contactless Delivery Verified
        </span>
        <span className="text-[11px] text-slate-400 font-semibold">Live GPS Dispatch Active</span>
      </div>
    </div>
  );
}
