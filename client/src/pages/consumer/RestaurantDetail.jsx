import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import FoodCard from '../../components/FoodCard';
import FreshProductCard from '../../components/FreshProductCard';
import { Star, Clock, MapPin, Tag, Leaf, Utensils } from 'lucide-react';

import StickyBasketBar from '../../components/StickyBasketBar';
import MobileBottomNavigation from '../../components/MobileBottomNavigation';

export default function RestaurantDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('cat') || searchParams.get('category') || 'ALL';

  const [restaurant, setRestaurant] = useState(null);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vegFilter, setVegFilter] = useState(false);
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  useEffect(() => {
    fetchRestaurantData();
  }, [id]);

  useEffect(() => {
    const qCat = searchParams.get('cat') || searchParams.get('category');
    if (qCat) setActiveCategory(qCat);
  }, [searchParams]);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/restaurants/${id}`);
      if (res.data.success) {
        setRestaurant(res.data.restaurant);
        setFoods(res.data.menu || res.data.foods || []);
      }
    } catch (err) {
      console.error('Error loading restaurant detail:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !restaurant) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isFresh = restaurant.vendorType === 'FRESH_MARKET' || restaurant.vendorType === 'FRESH';

  // Category Pills
  const categoryOptions = isFresh
    ? [
        { id: 'ALL', label: 'All Items' },
        { id: 'FRESH_PRODUCE', label: '🌱 Fresh Produce' },
        { id: 'GROCERY_ESSENTIALS', label: '🛒 Grocery Essentials' },
        ...Array.from(new Set(foods.map(f => f.category).filter(Boolean))).map(c => ({ id: c, label: c }))
      ]
    : [
        { id: 'ALL', label: 'All Dishes' },
        ...Array.from(new Set(foods.map(f => f.category).filter(Boolean))).map(c => ({ id: c, label: c }))
      ];

  const filteredFoods = foods.filter(food => {
    if (vegFilter && !food.isVeg) return false;
    if (activeCategory === 'FRESH_PRODUCE') {
      return food.productType === 'VEGETABLE' || food.productType === 'FRUIT' ||
        food.categoryId === 'cat-veg-04' || food.categoryId === 'cat-fruits-05' ||
        ['Vegetable', 'Fruit', 'Greens', 'Onion', 'Herb', 'Seasonal', 'Mandi', 'Sabzi'].some(k => 
          (food.category || '').toLowerCase().includes(k.toLowerCase()) || (food.name || '').toLowerCase().includes(k.toLowerCase())
        );
    }
    if (activeCategory === 'GROCERY_ESSENTIALS') {
      return food.productType === 'GROCERY' ||
        ['Rice', 'Pulse', 'Dal', 'Flour', 'Atta', 'Oil', 'Ghee', 'Spice', 'Salt', 'Sugar', 'Dry Fruit', 'Nut', 'Snack', 'Biscuit', 'Packaged', 'Breakfast', 'Cereal', 'Beverage', 'Essential'].some(k => 
          (food.category || '').toLowerCase().includes(k.toLowerCase()) || (food.name || '').toLowerCase().includes(k.toLowerCase())
        );
    }
    if (activeCategory !== 'ALL' && food.category !== activeCategory && food.categoryId !== activeCategory) return false;
    return true;
  });

  const isGroceryView = isFresh && activeCategory === 'GROCERY_ESSENTIALS';
  const displayBannerImage = isGroceryView
    ? 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=600'
    : (isFresh ? (restaurant.bannerImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600') : (restaurant.bannerImage || restaurant.image));

  const displayName = isGroceryView
    ? 'Groceries Near You'
    : (isFresh ? 'Fresh Sabzi near you' : restaurant.name);

  const displayBadge = isGroceryView
    ? '🛒 GROCERY STORE'
    : (isFresh ? '🥬 SABZI MANDI STORE' : '🍔 GOURMET RESTAURANT');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Cover & Banner Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft overflow-hidden space-y-6">
          <div className="relative h-64 w-full bg-slate-900">
            <img
              src={displayBannerImage}
              alt={displayName}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  isGroceryView ? 'bg-teal-600 text-white border-teal-500' : isFresh ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'
                }`}>
                  {displayBadge}
                </span>
                <h1 className="text-3xl font-extrabold text-white mt-1">{displayName}</h1>
                <p className="text-xs text-slate-300 font-medium">
                  {restaurant.cuisine ? restaurant.cuisine.join(' • ') : 'Hyperlocal'} • {restaurant.address?.street}, {restaurant.address?.city}
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs font-extrabold">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{restaurant.rating || 4.8}</span>
                </span>
                <span className="text-white/40">|</span>
                <span className="flex items-center gap-1 text-white">
                  <Clock className="w-4 h-4 text-slate-300" />
                  <span>{restaurant.deliveryTime || '20-30 min'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Tagline / Offers bar */}
          {restaurant.freshTagline && (
            <div className="px-6 pb-4">
              <p className="text-xs text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl">
                ✨ {restaurant.freshTagline}
              </p>
            </div>
          )}
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-soft flex flex-wrap items-center justify-between gap-3">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {categoryOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveCategory(opt.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition border ${
                  activeCategory === opt.id
                    ? isFresh ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Veg Only Switch */}
          <button
            onClick={() => setVegFilter(!vegFilter)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold border transition ${
              vegFilter
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Leaf className={`w-4 h-4 ${vegFilter ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'}`} />
            <span>🌱 Veg Only</span>
          </button>
        </div>

        {/* Product Items Grid */}
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">
            {isFresh ? 'Fresh Vegetables & Produce Available' : 'Menu & Prepared Dishes'} ({filteredFoods.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredFoods.map(food => (
              isFresh ? (
                <FreshProductCard key={food._id} product={food} />
              ) : (
                <FoodCard key={food._id} food={food} />
              )
            ))}
          </div>
        </div>

      </main>

      <StickyBasketBar />
      <MobileBottomNavigation />
    </div>
  );
}
