import React from 'react';
import { Clock, CheckCircle2, Flame, Bike, PackageCheck, AlertCircle, XCircle } from 'lucide-react';

export default function OrderStatusBadge({ status }) {
  const configs = {
    PENDING: { label: 'Order Placed', icon: Clock },
    CONFIRMED: { label: 'Store Accepted', icon: CheckCircle2 },
    PREPARING: { label: 'Preparing Food', icon: Flame },
    PACKING: { label: 'Packing Order', icon: Flame },
    READY_FOR_PICKUP: { label: 'Food Prepared & Ready', icon: PackageCheck },
    ASSIGNED: { label: 'Rider Assigned', icon: Bike },
    WAITING_PICKUP: { label: 'Rider at Store', icon: PackageCheck },
    ARRIVED_AT_PICKUP: { label: 'Rider at Store', icon: PackageCheck },
    PICKED_UP: { label: 'Food Picked Up', icon: Bike },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', icon: Bike },
    ARRIVED_AT_CUSTOMER: { label: 'Rider at Customer', icon: CheckCircle2 },
    DELIVERED: { label: 'Delivered', icon: CheckCircle2 },
    CANCELLED: { label: 'Cancelled', icon: XCircle },
    PLACED: { label: 'Order Placed', icon: Clock },
    VENDOR_ACCEPTED: { label: 'Store Accepted', icon: CheckCircle2 }
  };
  const config = configs[status] || { label: (status || '').replace(/_/g, ' '), icon: AlertCircle };
  const Icon = config.icon;
  const isFreshTone = ['DELIVERED','CONFIRMED','READY_FOR_PICKUP'].includes(status);
  const isBlueTone = ['ASSIGNED','WAITING_PICKUP','ARRIVED_AT_PICKUP','PICKED_UP','OUT_FOR_DELIVERY','ARRIVED_AT_CUSTOMER'].includes(status);
  const isRedTone = status === 'CANCELLED';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border" style={
      isRedTone
        ? {color:'var(--fc-red)',borderColor:'rgba(229,27,75,.22)',background:'rgba(229,27,75,.06)'}
        : isFreshTone
        ? {color:'var(--fc-fresh)',borderColor:'rgba(22,138,91,.22)',background:'rgba(22,138,91,.06)'}
        : isBlueTone
        ? {color:'#0284c7',borderColor:'rgba(2,132,199,.25)',background:'rgba(2,132,199,.08)'}
        : {color:'var(--fc-gray-700)',borderColor:'var(--fc-gray-300)',background:'var(--fc-gray-50)'}
    }><Icon className="w-3.5 h-3.5" />{config.label}</span>
  );
}
