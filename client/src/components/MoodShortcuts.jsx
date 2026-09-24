import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '../context/ModeContext';

export default function MoodShortcuts() {
  const { isFresh } = useMode();
  const navigate = useNavigate();

  const cravingsCategories = [
    { label: 'Momos', icon: '🥟', query: 'Momos' },
    { label: 'Biryani', icon: '🥘', query: 'Biryani' },
    { label: 'Pizza', icon: '🍕', query: 'Pizza' },
    { label: 'Burgers', icon: '🍔', query: 'Burger' },
    { label: 'North Indian', icon: '🍛', query: 'North Indian' },
    { label: 'Healthy', icon: '🥗', query: 'Healthy' },
    { label: 'Sweets', icon: '🪔', query: 'Sweets' },
    { label: 'Soya Chaap', icon: '🍢', query: 'Soya Chaap' }
  ];

  const freshCategories = [
    { label: 'Daily Vegetables', icon: '🥔', query: 'Vegetable' },
    { label: 'Fresh Fruits', icon: '🍎', query: 'Fruit' },
    { label: 'Leafy Greens', icon: '🥬', query: 'Greens' },
    { label: 'Tomatoes & Onion', icon: '🧅', query: 'Onion' },
    { label: 'Wholesale Mandi', icon: '🧺', query: 'Mandi' }
  ];

  const categories = isFresh ? freshCategories : cravingsCategories;

  const handleCategoryClick = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-[#17181C]">
          {isFresh ? 'Explore Fresh Mandi Categories' : 'What are you in the mood for?'}
        </h2>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1">
        {categories.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => handleCategoryClick(cat.query)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-[#E8E9ED] hover:border-[#CBD5E1] shadow-sm hover:shadow-md transition text-xs font-extrabold text-[#17181C] whitespace-nowrap flex-shrink-0 group"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
