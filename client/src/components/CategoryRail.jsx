import React from 'react';
import { useMode } from '../context/ModeContext';

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
    { id: 'ALL', label: 'All Fresh Mandi', icon: '🧺' },
    
    // Section Headers / Direct Filters
    { id: 'FRESH_PRODUCE', label: '🌱 All Fresh Produce', icon: '🥦', isHeader: true },
    { id: 'Vegetable', label: 'Daily Vegetables', icon: '🥔' },
    { id: 'Fruit', label: 'Fresh Fruits', icon: '🍎' },
    { id: 'Greens', label: 'Leafy Greens', icon: '🥬' },
    { id: 'Onion', label: 'Onion & Potato', icon: '🧅' },
    { id: 'Herb', label: 'Herbs & Seasoning', icon: '🌿' },
    { id: 'Seasonal', label: 'Seasonal Produce', icon: '🌽' },
    { id: 'Mandi', label: 'Wholesale Mandi', icon: '📦' },

    { id: 'GROCERY_ESSENTIALS', label: '🛒 All Grocery Essentials', icon: '🛍️', isHeader: true },
    { id: 'Rice', label: 'Grains & Rice', icon: '🌾' },
    { id: 'Pulse', label: 'Pulses & Dals', icon: '🫘' },
    { id: 'Flour', label: 'Flour / Atta', icon: '🍞' },
    { id: 'Oil', label: 'Oil & Ghee', icon: '🫗' },
    { id: 'Spice', label: 'Spices & Masala', icon: '🌶️' },
    { id: 'Salt', label: 'Sugar & Salt', icon: '🧂' },
    { id: 'Dry Fruit', label: 'Dry Fruits & Nuts', icon: '🥜' },
    { id: 'Snack', label: 'Snacks', icon: '🍿' },
    { id: 'Biscuit', label: 'Biscuits', icon: '🍪' },
    { id: 'Packaged', label: 'Packaged Foods', icon: '📦' },
    { id: 'Breakfast', label: 'Breakfast / Cereals', icon: '🥣' },
    { id: 'Beverage', label: 'Beverages', icon: '🥤' },
    { id: 'Essential', label: 'Daily Essentials', icon: '🛒' }
  ];

  const categories = isFresh ? freshCategories : cravingsCategories;

  return (
    <div className="space-y-2.5 min-w-0 max-w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-extrabold text-[#17181C] tracking-tight">
          {isFresh ? 'Explore Fresh Mandi Categories' : 'What are you in the mood for?'}
        </h2>
        {selectedCategory !== 'ALL' && (
          <button
            onClick={() => onCategorySelect('ALL')}
            className="text-xs font-bold text-[#E51B4B] hover:underline flex-shrink-0"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1.5 snap-x max-w-full">
        {/* Promotional Under ₹250 / Mandi Rates Shortcut */}
        <button
          onClick={() => onCategorySelect('UNDER_250')}
          className={`snap-start flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all shadow-sm flex-shrink-0 border ${
            selectedCategory === 'UNDER_250'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-105'
              : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 border-amber-200/80 hover:border-amber-400'
          }`}
        >
          <span className="text-base">🏷️</span>
          <div className="text-left leading-tight">
            <span className="block text-[10px] text-amber-700 font-extrabold uppercase">DEALS UNDER</span>
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
              className={`snap-start flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex-shrink-0 border ${
                isSelected
                  ? isFresh
                    ? 'bg-[#168A5B] text-white border-[#168A5B] shadow-md scale-105'
                    : 'bg-[#E51B4B] text-white border-[#E51B4B] shadow-md scale-105'
                  : cat.isHeader
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-sm font-black'
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

