import React from 'react';
import { useMode } from '../context/ModeContext';

export default function CategoryRail({ selectedCategory = 'ALL', onCategorySelect }) {
  const { isFresh } = useMode();

  const cravingCategories = [
    { id: 'ALL', label: 'All Dishes', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-1.jpg' },
    { id: 'Biryani', label: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-3.jpg' },
    { id: 'Pizza', label: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-4.jpg' },
    { id: 'Burger', label: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-5.jpg' },
    { id: 'Momos', label: 'Momos & Dimsum', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-2.jpg' },
    { id: 'North Indian', label: 'North Indian', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-snack-munchies.jpg' },
    { id: 'Sweets', label: 'Sweets & Desserts', image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-bakery-biscuits.jpg' },
    { id: 'Healthy', label: 'Salads & Healthy', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-fruits-vegetables.jpg' }
  ];

  const freshCategories = [
    { id: 'ALL', label: 'All Fresh Mandi', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-fruits-vegetables.jpg' },
    { id: 'Vegetable', label: 'Vegetables', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-fruits-vegetables.jpg' },
    { id: 'Fruit', label: 'Fresh Fruits', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-1.jpg' },
    { id: 'Atta', label: 'Atta, Rice & Dal', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-atta-rice-dal.jpg' },
    { id: 'Dairy', label: 'Dairy & Eggs', image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-dairy-bread-eggs.jpg' },
    { id: 'Oil', label: 'Oil, Ghee & Spices', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-atta-rice-dal.jpg' },
    { id: 'Snacks', label: 'Snacks & Munchies', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-snack-munchies.jpg' },
    { id: 'GROCERY_ESSENTIALS', label: 'Grocery Essentials', image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=300', fallback: '/freshcart/images/category/category-cleaning-essentials.jpg' }
  ];

  const categories = isFresh ? freshCategories : cravingCategories;
  const activeColor = isFresh ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/30' : 'border-rose-600 ring-2 ring-rose-600/20 bg-rose-50/30';

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Featured Categories</h2>
        <button
          onClick={() => onCategorySelect('ALL')}
          className={`text-xs font-bold transition ${isFresh ? 'text-emerald-700 hover:text-emerald-800' : 'text-rose-600 hover:text-rose-700'}`}
        >
          View all
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {categories.map(({ id, label, image, fallback }) => (
          <button
            key={id}
            onClick={() => onCategorySelect(id)}
            className={`fc-card fc-card-hover p-2.5 text-center transition group flex flex-col items-center ${
              selectedCategory === id ? activeColor : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="w-full h-20 sm:h-24 rounded-lg bg-gray-100 overflow-hidden mb-2 relative">
              <img
                src={image}
                alt={label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallback;
                }}
              />
            </div>
            <div className="text-xs font-semibold text-gray-800 leading-tight truncate w-full">
              {label}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
