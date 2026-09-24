import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../../services/api';
import { useMode } from '../../context/ModeContext';
import Navbar from '../../components/Navbar';
import FoodCard from '../../components/FoodCard';
import FreshProductCard from '../../components/FreshProductCard';
import RestaurantCard from '../../components/RestaurantCard';
import { Search, Filter, Leaf, Utensils, X, Sparkles } from 'lucide-react';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const { mode, switchMode, isFresh } = useMode();

  const [vegOnly, setVegOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [foods, setFoods] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qFromUrl = searchParams.get('q') || '';
    setSearchTerm(qFromUrl);
  }, [searchParams]);

  useEffect(() => {
    fetchSearchResults();
  }, [searchTerm, mode, vegOnly, selectedCategory]);

  const handleInputChange = (val) => {
    setSearchTerm(val);
    if (val.trim()) {
      setSearchParams({ q: val }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const fetchSearchResults = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (vegOnly) params.isVeg = true;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      params.productType = isFresh ? 'VEGETABLE,FRUIT' : 'FOOD';

      const [resFoods, resRestaurants] = await Promise.all([
        API.get('/foods', { params }),
        API.get('/restaurants', { params: { vendorType: isFresh ? 'FRESH_MARKET' : 'FOOD_RESTAURANT', search: searchTerm } })
      ]);

      if (resFoods.data.success) setFoods(resFoods.data.foods);
      if (resRestaurants.data.success) setRestaurants(resRestaurants.data.restaurants);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = isFresh
    ? ['ALL', 'Daily Vegetables', 'Fresh Fruits', 'Leafy Greens & Herbs']
    : ['ALL', 'North Indian', 'Italian & Pizza', 'Asian & Chinese'];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Search Header Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                isFresh ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                UNIVERSAL SEARCH ENGINE
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                {isFresh ? 'Search Fresh Produce & Mandis' : 'Find Your Favorite Dishes & Restaurants'}
              </h1>
            </div>

            {/* Mode Toggle Button */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => switchMode('CRAVINGS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                  !isFresh ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🍔 Cravings Food
              </button>
              <button
                onClick={() => switchMode('FRESH')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                  isFresh ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🥬 Fresh Mandi
              </button>
            </div>
          </div>

          {/* Search Input Field */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isFresh ? "Type 'Tamatar', 'Shimla Apple', 'Spinach', 'Onion'..." : "Type 'Paneer', 'Butter Chicken', 'Biryani', 'Pizza'..."}
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 shadow-inner transition"
            />
            {searchTerm && (
              <button
                onClick={() => handleInputChange('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters Bar: Veg Only & Category Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition border ${
                    selectedCategory === cat
                      ? isFresh ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Veg-Only Filter Toggle */}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                vegOnly
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Leaf className={`w-4 h-4 ${vegOnly ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'}`} />
              <span>🌱 Veg Only</span>
            </button>
          </div>
        </div>

        {/* Search Results Display */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="h-64 rounded-3xl bg-slate-200/60 animate-skeleton" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Stores / Mandis Section */}
            {restaurants.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {isFresh ? 'Matching Fresh Mandi Stores' : 'Matching Restaurants'} ({restaurants.length})
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {restaurants.map(rest => (
                    <RestaurantCard key={rest._id} restaurant={rest} />
                  ))}
                </div>
              </div>
            )}

            {/* Products & Dishes Section */}
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                {isFresh ? 'Fresh Vegetables & Produce' : 'Prepared Dishes & Meals'} ({foods.length})
              </h2>

              {foods.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {foods.map(item => (
                    isFresh ? (
                      <FreshProductCard key={item._id} product={item} />
                    ) : (
                      <FoodCard key={item._id} food={item} />
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-soft">
                  <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-extrabold text-slate-800">No items found</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Try searching for 'Paneer', 'Tamatar', 'Apple', or clear filters.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
