import React from 'react';
import { Clock, CheckCircle2, Flame, Bike, PackageCheck, XCircle, Store, MapPin } from 'lucide-react';

const TIMELINE_STEPS = [
  { key: 'PENDING', label: 'Order placed', sublabel: 'We received your order', icon: Clock },
  { key: 'CONFIRMED', label: 'Store accepted', sublabel: 'Kitchen accepted & preparing', icon: Store },
  { key: 'READY_FOR_PICKUP', label: 'Food prepared', sublabel: 'Food prepared & packed', icon: Flame },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', sublabel: 'Rider picked up & on the way', icon: Bike },
  { key: 'DELIVERED', label: 'Delivered', sublabel: 'PIN verified & delivered', icon: CheckCircle2 }
];

export default function DeliveryTimeline({
  status,
  orderStatus,
  deliveryStatus,
  deliveryPartner,
  isFresh = false,
  compact = false
}) {
  const currentOrderStatus = orderStatus || status;
  const currentDeliveryStatus = deliveryStatus || (['WAITING_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_CUSTOMER'].includes(status) ? status : null);

  if (currentOrderStatus === 'CANCELLED' || status === 'CANCELLED') {
    return (
      <div className="rounded-2xl border p-4 flex items-center gap-3 bg-rose-50 border-rose-200 text-rose-800">
        <XCircle className="w-5 h-5 shrink-0 text-rose-600" />
        <div>
          <div className="text-xs font-bold">Order rejected / cancelled</div>
          <div className="text-[11px] mt-0.5 opacity-90">This order is no longer being processed.</div>
        </div>
      </div>
    );
  }

  // Get index matching the exact order progression flow
  const getStepIndex = (st, dSt) => {
    if (st === 'DELIVERED' || dSt === 'DELIVERED') return 4;
    if (
      st === 'OUT_FOR_DELIVERY' ||
      st === 'PICKED_UP' ||
      dSt === 'OUT_FOR_DELIVERY' ||
      dSt === 'PICKED_UP' ||
      dSt === 'ARRIVED_AT_CUSTOMER'
    ) {
      return 3;
    }
    if (
      st === 'READY_FOR_PICKUP' ||
      st === 'PREPARING' ||
      st === 'PACKING' ||
      dSt === 'WAITING_PICKUP' ||
      dSt === 'ARRIVED_AT_PICKUP'
    ) {
      return 2;
    }
    if (st === 'CONFIRMED' || st === 'ASSIGNED' || dSt === 'ASSIGNED') {
      return 1;
    }
    return 0;
  };

  const safeCurrent = getStepIndex(currentOrderStatus, currentDeliveryStatus);

  // Dynamic context note for clarity
  const getLiveContextBadge = () => {
    if (safeCurrent === 1) {
      if (deliveryPartner?.name) {
        return `🚴 Rider assigned: ${deliveryPartner.name} • Heading to store`;
      }
      return '📡 Store accepted order • Assigning nearby rider...';
    }
    if (safeCurrent === 2) {
      if (currentDeliveryStatus === 'WAITING_PICKUP' || currentDeliveryStatus === 'ARRIVED_AT_PICKUP') {
        return `🏪 Rider ${deliveryPartner?.name ? `(${deliveryPartner.name}) ` : ''}arrived at store for pickup`;
      }
      return '🍳 Food prepared by store • Ready for pickup';
    }
    if (safeCurrent === 3) {
      if (currentDeliveryStatus === 'ARRIVED_AT_CUSTOMER' || status === 'ARRIVED_AT_CUSTOMER') {
        return '📍 Rider arrived at your address • Share PIN to receive order';
      }
      return `🛵 Rider ${deliveryPartner?.name ? `(${deliveryPartner.name}) ` : ''}is out for delivery to customer`;
    }
    if (safeCurrent === 4) {
      return '🎉 Order delivered successfully! Verified with 4-digit PIN.';
    }
    return '⏱️ Awaiting store confirmation...';
  };

  return (
    <div className={compact ? '' : 'rounded-3xl border border-gray-200 p-5 bg-white shadow-xs'}>
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-black text-gray-400">Live order timeline</div>
            <div className="text-sm font-black text-gray-900 mt-0.5">{TIMELINE_STEPS[safeCurrent]?.label}</div>
          </div>
          <span className="text-xs font-mono font-bold text-gray-400">
            {safeCurrent + 1}/{TIMELINE_STEPS.length}
          </span>
        </div>
      )}

      <div className="grid grid-cols-5 gap-1 relative">
        <div className="absolute top-4 left-[10%] right-[10%] h-0.5 bg-gray-200" />
        <div
          className="absolute top-4 left-[10%] h-0.5 transition-all duration-500 ease-out"
          style={{
            width: `${(safeCurrent / (TIMELINE_STEPS.length - 1)) * 80}%`,
            background: isFresh ? 'var(--fc-fresh)' : '#10B981'
          }}
        />

        {TIMELINE_STEPS.map((step, i) => {
          const done = i <= safeCurrent;
          const isCurrent = i === safeCurrent;
          const Icon = step.icon;

          return (
            <div key={step.key} className="relative text-center min-w-0">
              <div
                className={`relative mx-auto w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  done
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-gray-300 text-gray-400'
                } ${isCurrent ? 'ring-4 ring-emerald-100 scale-105' : ''}`}
                style={done ? { background: isFresh ? 'var(--fc-fresh)' : '#10B981', borderColor: isFresh ? 'var(--fc-fresh)' : '#10B981' } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className={`mt-2 text-[10px] leading-tight font-extrabold ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                {step.label}
              </div>
              {!compact && (
                <div className="hidden sm:block mt-0.5 text-[9px] text-gray-400 leading-tight truncate">
                  {step.sublabel}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-emerald-800 bg-emerald-50/70 px-3 py-1.5 rounded-xl border border-emerald-100">
          <span>{getLiveContextBadge()}</span>
        </div>
      )}
    </div>
  );
}
