import React from 'react';
import { ShoppingBag, Flame, Bike, CheckCircle2, XCircle, Clock, PackageCheck } from 'lucide-react';

const STATUS_RANKS = {
  PENDING: 1,
  CONFIRMED: 1,
  PREPARING: 2,
  PACKING: 2,
  READY_FOR_PICKUP: 2,
  ASSIGNED: 3,
  PICKED_UP: 3,
  OUT_FOR_DELIVERY: 3,
  ARRIVED_AT_CUSTOMER: 3,
  DELIVERED: 4,
  CANCELLED: -1
};

export function getOrderStatusRank(status) {
  if (!status) return 0;
  const upper = String(status).toUpperCase();
  return STATUS_RANKS[upper] !== undefined ? STATUS_RANKS[upper] : 0;
}

export default function DeliveryTimeline({ status, isFresh = false, compact = false }) {
  const currentRank = getOrderStatusRank(status);
  const isCancelled = status === 'CANCELLED';

  const steps = [
    {
      rank: 1,
      key: 'RECEIVED',
      label: 'Order Placed',
      sublabel: 'Vendor received order',
      icon: ShoppingBag,
      emoji: '🛒'
    },
    {
      rank: 2,
      key: 'PREPARING',
      label: isFresh ? 'Packing Mandi Items' : 'Kitchen Preparing',
      sublabel: isFresh ? 'Fresh produce packed' : 'Meal being prepared',
      icon: Flame,
      emoji: isFresh ? '🥬' : '🍳'
    },
    {
      rank: 3,
      key: 'DISPATCHED',
      label: 'Out for Delivery',
      sublabel: 'Rider dispatched on way',
      icon: Bike,
      emoji: '🛵'
    },
    {
      rank: 4,
      key: 'DELIVERED',
      label: 'Order Delivered',
      sublabel: 'Verified & completed',
      icon: CheckCircle2,
      emoji: '🎉'
    }
  ];

  if (isCancelled) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-3 text-rose-800">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
          <XCircle className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-rose-900">Order Rejected / Cancelled</h4>
          <p className="text-xs text-rose-600 font-medium">This order was cancelled by the store or customer.</p>
        </div>
      </div>
    );
  }

  // Calculate percentage completion for the progress line
  const activeStepIdx = Math.max(0, currentRank - 1);
  const progressPercent = currentRank >= 4 ? 100 : (activeStepIdx / (steps.length - 1)) * 100;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Timeline Progress</span>
          </span>
          <span className="text-emerald-700 font-extrabold">
            {currentRank >= 4 ? '100% Delivered' : `Step ${Math.min(4, Math.max(1, currentRank))} of 4`}
          </span>
        </div>
        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
          <div
            className={`h-full transition-all duration-700 ease-out ${
              currentRank >= 4 ? 'bg-emerald-500' : isFresh ? 'bg-emerald-600' : 'bg-brand-500'
            }`}
            style={{ width: `${Math.max(10, progressPercent)}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold">
          {steps.map(step => {
            const isCompleted = currentRank >= step.rank;
            const isCurrent = currentRank === step.rank;
            return (
              <span
                key={step.key}
                className={`truncate px-1 py-0.5 rounded-md ${
                  isCompleted
                    ? 'text-emerald-700 bg-emerald-50 font-extrabold'
                    : isCurrent
                    ? 'text-blue-700 bg-blue-50 font-extrabold animate-pulse'
                    : 'text-slate-400'
                }`}
              >
                {step.emoji} {step.label}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">LIVE TIMELINE TRACKER</span>
          <h3 className="text-base font-extrabold text-slate-900 mt-0.5">Order Delivery Timeline</h3>
        </div>
        <div className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
          {currentRank >= 4 ? '✅ Completed' : `In Progress • Stage ${Math.min(4, Math.max(1, currentRank))}/4`}
        </div>
      </div>

      {/* Main Horizontal Progress Line */}
      <div className="relative pt-2 pb-4 px-2">
        <div className="absolute left-6 right-6 top-7 h-1.5 bg-slate-100 -z-0 rounded-full" />
        <div
          className={`absolute left-6 top-7 h-1.5 transition-all duration-700 ease-out -z-0 rounded-full ${
            currentRank >= 4 ? 'bg-emerald-500' : isFresh ? 'bg-emerald-600' : 'bg-brand-500'
          }`}
          style={{ width: `calc(${progressPercent}% * 0.88)` }}
        />

        <div className="relative z-10 flex items-start justify-between">
          {steps.map((step) => {
            const isCompleted = currentRank >= step.rank; // Fallback rule: any prior step auto-completes
            const isCurrent = currentRank === step.rank && currentRank < 4;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center text-center max-w-[100px] sm:max-w-[120px]">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105'
                      : isCurrent
                      ? isFresh
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg ring-4 ring-emerald-100 scale-110 animate-pulse'
                        : 'bg-brand-500 border-brand-500 text-white shadow-lg ring-4 ring-brand-100 scale-110 animate-pulse'
                      : 'bg-white border-slate-200 text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className={`text-xs font-extrabold mt-2 leading-tight ${isCompleted ? 'text-slate-900' : isCurrent ? 'text-brand-600' : 'text-slate-400'}`}>
                  {step.label}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 hidden sm:block leading-tight">
                  {step.sublabel}
                </p>
                {isCompleted && (
                  <span className="mt-1 inline-flex items-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Done
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
