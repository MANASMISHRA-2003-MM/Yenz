import React from 'react';
import { SlidersHorizontal, Zap, Star, Leaf, DollarSign } from 'lucide-react';
import { useMode } from '../context/ModeContext';

export default function FilterRail({
  fastDelivery = false,
  ratingFourPlus = false,
  pureVeg = false,
  under250 = false,
  onToggleFilter,
  onResetFilters
}) {
  const { isFresh } = useMode();

  const activeCount = [fastDelivery, ratingFourPlus, pureVeg, under250].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 snap-x">
      {/* Filters Dropdown / Clear Button */}
      <button
        onClick={onResetFilters}
        className={`snap-start flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition border flex-shrink-0 ${
          activeCount > 0
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-white text-slate-900 text-[10px] font-black flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      {/* Near & Fast */}
      <button
        onClick={() => onToggleFilter('fastDelivery')}
        className={`snap-start flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition whitespace-nowrap flex-shrink-0 border ${
          fastDelivery
            ? isFresh
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-rose-600 text-white border-rose-600 shadow-sm'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span>⚡ Near & Fast</span>
      </button>

      {/* Rating 4+ */}
      <button
        onClick={() => onToggleFilter('ratingFourPlus')}
        className={`snap-start flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition whitespace-nowrap flex-shrink-0 border ${
          ratingFourPlus
            ? isFresh
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-rose-600 text-white border-rose-600 shadow-sm'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span>Rating 4.0+</span>
      </button>

      {/* Pure Veg */}
      <button
        onClick={() => onToggleFilter('pureVeg')}
        className={`snap-start flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition whitespace-nowrap flex-shrink-0 border ${
          pureVeg
            ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <Leaf className={`w-3.5 h-3.5 ${pureVeg ? 'text-white fill-white' : 'text-emerald-600'}`} />
        <span>Pure Veg</span>
      </button>

      {/* Under ₹250 */}
      <button
        onClick={() => onToggleFilter('under250')}
        className={`snap-start flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition whitespace-nowrap flex-shrink-0 border ${
          under250
            ? isFresh
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-rose-600 text-white border-rose-600 shadow-sm'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
        <span>Under ₹250</span>
      </button>
    </div>
  );
}
