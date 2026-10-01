import React from 'react';
import { Clock, CheckCircle2, Flame, Bike, PackageCheck, XCircle, Store, MapPin } from 'lucide-react';

const TIMELINE_STEPS = [
  { key: 'PENDING', label: 'Order placed', sublabel: 'We received your order', icon: Clock },
  { key: 'CONFIRMED', label: 'Store accepted', sublabel: 'Store accepted & preparing', icon: Store },
  { key: 'ASSIGNED', label: 'Rider assigned', sublabel: 'Rider accepted & at store', icon: Bike },
  { key: 'OUT_FOR_DELIVERY', label: 'Rider on the way', sublabel: 'Rider picked up order', icon: PackageCheck },
  { key: 'DELIVERED', label: 'Delivered', sublabel: 'PIN verified & delivered', icon: CheckCircle2 }
];

export default function DeliveryTimeline({ status, isFresh = false, compact = false }) {
  if (status === 'CANCELLED') {
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
  const getStepIndex = (st) => {
    switch (st) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
      case 'PREPARING':
      case 'PACKING':
        return 1;
      case 'READY_FOR_PICKUP':
      case 'ASSIGNED':
      case 'WAITING_PICKUP':
      case 'ARRIVED_AT_PICKUP':
        return 2;
      case 'PICKED_UP':
      case 'OUT_FOR_DELIVERY':
      case 'ARRIVED_AT_CUSTOMER':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return 0;
    }
  };

  const safeCurrent = getStepIndex(status);

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
    </div>
  );
}
