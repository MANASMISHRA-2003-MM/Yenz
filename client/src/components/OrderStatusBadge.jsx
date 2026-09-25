import React from 'react';
import { Clock, CheckCircle2, Flame, Bike, PackageCheck, AlertCircle, XCircle } from 'lucide-react';

export default function OrderStatusBadge({ status }) {
  const configs = {
    PENDING: { label: 'Order Placed', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    CONFIRMED: { label: 'Accepted by Store', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: CheckCircle2 },
    PREPARING: { label: 'Preparing Order', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Flame },
    READY_FOR_PICKUP: { label: 'Ready for Pickup', bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: PackageCheck },
    ASSIGNED: { label: 'Driver Assigned', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: Bike },
    PICKED_UP: { label: 'Picked Up', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Bike },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse', icon: Bike },
    DELIVERED: { label: 'Delivered', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
    // Fallbacks for legacy status representations
    PLACED: { label: 'Order Placed', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    VENDOR_ACCEPTED: { label: 'Accepted by Store', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: CheckCircle2 }
  };

  const config = configs[status] || { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: AlertCircle };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
