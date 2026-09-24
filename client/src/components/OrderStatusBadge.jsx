import React from 'react';
import { Clock, CheckCircle2, Flame, Bike, PackageCheck, AlertCircle, XCircle } from 'lucide-react';

export default function OrderStatusBadge({ status }) {
  const configs = {
    PLACED: { label: 'Order Placed', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Clock },
    VENDOR_ACCEPTED: { label: 'Accepted by Kitchen', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', icon: CheckCircle2 },
    PREPARING: { label: 'Preparing Food', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Flame },
    READY_FOR_PICKUP: { label: 'Ready for Pickup', bg: 'bg-teal-500/10 text-teal-400 border-teal-500/30', icon: PackageCheck },
    COURIER_ASSIGNED: { label: 'Driver Assigned', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', icon: Bike },
    PICKED_UP: { label: 'Picked Up', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: Bike },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: 'bg-purple-500/10 text-purple-300 border-purple-500/30 animate-pulse', icon: Bike },
    DELIVERED: { label: 'Delivered', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: XCircle }
  };

  const config = configs[status] || { label: status, bg: 'bg-slate-800 text-slate-300 border-slate-700', icon: AlertCircle };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
