import React from 'react';
import { useMode } from '../context/ModeContext';
import { Sparkles, Utensils, Leaf } from 'lucide-react';

export default function CategoryRail({ selectedCategory = 'ALL', onCategorySelect }) {
  const { isFresh } = useMode();

  const cravingsCategories = [
    { id: 'ALL', label: 'All Dishes', icon: '🍽️' },
    { id: 'Momos', label: 'Momos', icon: '🥟' },
    { id: 'Biryani', label: 'Biryani', icon: '🥘' },
    { id: 'Pizza', label: 'Pizza', icon: '🍕' },
    { id: 'Burger', label: 'Burger', icon: '🍔' },
    { id: 'North Indian', label: 'North Indian', icon: '🍛' },
    { id: 'Healthy', label: 'Healthy', icon: '🥗' },
    { id: 'Sweets', label: 'Sweets', icon: '🪔' },
    { id: 'Soya Chaap', label: 'Soya Chaap', icon: '🍢' }
  ];

  const freshCategories = [
    { id: 'ALL', label: 'All Produce', icon: '🧺' },
    { id: 'Vegetable', label: 'Daily Vegetables', icon: '🥔' },
    { id: 'Fruit', label: 'Fresh Fruits', icon: '🍎' },
    { id: 'Greens', label: 'Leafy Greens', icon: '🥬' },
    { id: 'Onion', label: 'Onion & Potato', icon: '🧅' },
    { id: 'Mandi', label: 'Wholesale Mandi', icon: '🥦' }
  ];

  const categories = isFresh ? freshCategories : cravingsCategories;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-extrabold text-[#17181C] tracking-tight">
          {isFresh ? 'Explore Fresh Mandi Categories' : 'What are you in the mood for?'}
        </h2>
        {selectedCategory !== 'ALL' && (
          <button
            onClick={() => onCategorySelect('ALL')}
            className="text-xs font-bold text-[#E51B4B] hover:underline"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1.5 snap-x">
        {/* Promotional Under ₹250 / Mandi Rates Shortcut */}
        <button
          onClick={() => onCategorySelect('UNDER_250')}
          className={`snap-start flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all shadow-sm flex-shrink-0 border ${
            selectedCategory === 'UNDER_250'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-105'
              : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 border-amber-200/80 hover:border-amber-400'
          }`}
        >
          <span className="text-base">🏷️</span>
          <div className="text-left leading-tight">
            <span className="block text-[10px] text-amber-700 font-extrabold uppercase">MEALS UNDER</span>
            <span className="block text-xs font-black">₹250</span>
          </div>
        </button>

        {/* Category Pills */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onCategorySelect(cat.id)}
              className={`snap-start flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex-shrink-0 border ${
                isSelected
                  ? isFresh
                    ? 'bg-[#168A5B] text-white border-[#168A5B] shadow-md scale-105'
                    : 'bg-[#E51B4B] text-white border-[#E51B4B] shadow-md scale-105'
                  : 'bg-white text-[#17181C] border-[#E8E9ED] hover:border-[#CBD5E1] shadow-sm hover:shadow-md'
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
