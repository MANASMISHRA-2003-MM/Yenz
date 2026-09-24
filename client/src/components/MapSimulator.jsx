import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { MapPin, Navigation, Bike, Compass, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function MapSimulator({ orderId, orderType = 'FOOD', initialCourierLocation }) {
  const [courierPos, setCourierPos] = useState(
    initialCourierLocation || { lat: 28.5500, lng: 77.3500 }
  );
  const [distanceText, setDistanceText] = useState('1.8 km away');
  const [etaText, setEtaText] = useState('7 mins');

  useEffect(() => {
    if (!orderId) return;

    // Join Socket room for live GPS updates
    socket.emit('join_order', orderId);

    socket.on('courier:location_update', (data) => {
      if (data.lat && data.lng) {
        setCourierPos({ lat: data.lat, lng: data.lng });
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

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-soft space-y-4">
      {/* Map Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Live GPS Courier Tracking</h4>
            <p className="text-[11px] text-slate-500 font-medium">Real-time driver updates connected via Socket.IO</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Estimated Arrival</span>
          <span className="text-sm font-extrabold text-brand-600">{etaText} ({distanceText})</span>
        </div>
      </div>

      {/* Interactive Visual Map Box */}
      <div className="relative h-64 w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
        
        {/* Subtle Map Grid Background */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* SVG Route Path Line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-brand-500/60 stroke-[3] stroke-dasharray-[6]" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 20 70 Q 50 30 80 30" fill="none" />
        </svg>

        {/* 1. Store / Mandi Vendor Marker */}
        <div className="absolute top-[25%] left-[18%] text-center z-10">
          <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg mx-auto border-2 border-white">
            <Navigation className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-extrabold text-white bg-slate-900/90 px-2 py-0.5 rounded-md mt-1 block border border-slate-700 shadow-sm">
            {orderType === 'FRESH' ? '🥬 Sabzi Mandi' : '🏬 Kitchen Store'}
          </span>
        </div>

        {/* 2. Driver Live GPS Marker */}
        <div className="absolute top-[35%] left-[48%] text-center z-20 animate-pulse">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/50 mx-auto border-2 border-white">
            <Bike className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-extrabold text-cyan-200 bg-slate-900/95 px-2 py-0.5 rounded-md mt-1 block border border-cyan-500/50 shadow-sm">
            🛵 Driver ({distanceText})
          </span>
        </div>

        {/* 3. Customer Dropoff Address Marker */}
        <div className="absolute top-[25%] left-[78%] text-center z-10">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg mx-auto border-2 border-white">
            <MapPin className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-extrabold text-white bg-slate-900/90 px-2 py-0.5 rounded-md mt-1 block border border-slate-700 shadow-sm">
            🏠 Your Address
          </span>
        </div>

      </div>

      {/* Safety & Contact Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-medium">
        <span className="flex items-center gap-1 text-emerald-700 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Contactless Delivery Verified
        </span>
        <span className="text-[11px] text-slate-400">Rate: ₹20 / km fare calculated</span>
      </div>

    </div>
  );
}
