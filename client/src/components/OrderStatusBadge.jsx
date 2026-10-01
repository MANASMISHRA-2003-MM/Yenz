import React from 'react';
import { Clock, CheckCircle2, Flame, Bike, PackageCheck, AlertCircle, XCircle } from 'lucide-react';

export default function OrderStatusBadge({ status }) {
  const configs = {
    PENDING: { label: 'Order Placed', icon: Clock },
    CONFIRMED: { label: 'Accepted by Store', icon: CheckCircle2 },
    PREPARING: { label: 'Preparing Order', icon: Flame },
    READY_FOR_PICKUP: { label: 'Ready for Pickup', icon: PackageCheck },
    ASSIGNED: { label: 'Driver Assigned', icon: Bike },
    PICKED_UP: { label: 'Picked Up', icon: Bike },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', icon: Bike },
    DELIVERED: { label: 'Delivered', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', icon: XCircle },
    PLACED: { label: 'Order Placed', icon: Clock },
    VENDOR_ACCEPTED: { label: 'Accepted by Store', icon: CheckCircle2 }
  };
  const config = configs[status] || { label: status, icon: AlertCircle };
  const Icon = config.icon;
  const isFreshTone = ['DELIVERED','CONFIRMED','READY_FOR_PICKUP'].includes(status);
  const isRedTone = status === 'CANCELLED';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border" style={
      isRedTone
        ? {color:'var(--fc-red)',borderColor:'rgba(229,27,75,.22)',background:'rgba(229,27,75,.06)'}
        : isFreshTone
        ? {color:'var(--fc-fresh)',borderColor:'rgba(22,138,91,.22)',background:'rgba(22,138,91,.06)'}
        : {color:'var(--fc-gray-700)',borderColor:'var(--fc-gray-300)',background:'var(--fc-gray-50)'}
    }><Icon className="w-3.5 h-3.5" />{config.label}</span>
  );
}
