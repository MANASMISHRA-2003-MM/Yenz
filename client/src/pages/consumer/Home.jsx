import React, { useState, useEffect } from 'react';
import { useMode } from '../../context/ModeContext';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import MoodShortcuts from '../../components/MoodShortcuts';
import BuildBasketWidget from '../../components/BuildBasketWidget';
import RestaurantCard from '../../components/RestaurantCard';
import FoodCard from '../../components/FoodCard';
import FreshProductCard from '../../components/FreshProductCard';
import { Flame, Leaf, Sparkles, ArrowRight, ShieldCheck, Truck, Clock, MapPin, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const { mode, switchMode, isFresh } = useMode();
  const [restaurants, setRestaurants] = useState([]);
  const [featuredFoods, setFeaturedFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, [mode]);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const vendorType = isFresh ? 'FRESH_MARKET' : 'FOOD_RESTAURANT';
      const productType = isFresh ? 'VEGETABLE,FRUIT' : 'FOOD';

      const [resStores, resFoods] = await Promise.all([
        API.get(`/restaurants?vendorType=${vendorType}`),
        API.get(`/foods?productType=${productType}`)
      ]);

      if (resStores.data.success) setRestaurants(resStores.data.restaurants);
      if (resFoods.data.success) setFeaturedFoods(resFoods.data.foods);
    } catch (err) {
      console.error('Error loading homepage:', err);
    } finally {
      setLoading(false);
    }
  };

  // Local Gems filter (small high-rated local outlets)
  const localGems = restaurants.filter(r => r.rating >= 4.8);
  // Quick Bites filter (under 25 min)
  const quickBites = restaurants.filter(r => r.deliveryTime?.includes('15') || r.deliveryTime?.includes('20'));

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#17181C] pb-28">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-9">
        
        {/* HERO BANNER (~180-220px) */}
        <div className={`p-6 sm:p-8 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all duration-300 ${
          isFresh
            ? 'bg-gradient-to-r from-[#0F6945] via-[#168A5B] to-slate-900 text-white border-[#168A5B]/40'
            : 'bg-gradient-to-r from-[#B90F38] via-[#E51B4B] to-slate-900 text-white border-[#E51B4B]/40'
        }`}>
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/10 backdrop-blur-md border border-white/20">
              {isFresh ? <Leaf className="w-3.5 h-3.5 text-[#52B788] fill-[#52B788]" /> : <Flame className="w-3.5 h-3.5 text-[#FF6B35] fill-[#FF6B35]" />}
              <span>{isFresh ? 'DIRECT FROM LOCAL SABZI MANDI' : 'HYPERLOCAL FOOD & MEALS'}</span>
            </div>

            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
              {isFresh ? 'What does your kitchen need?' : "What's calling you today?"}
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
              {isFresh
                ? 'Fresh fruits, vegetables and everyday essentials from nearby sellers in Lakkarpur, Faridabad.'
                : 'Discover local favourites, new spots and dishes around you in Lakkarpur, Faridabad.'}
            </p>

            {/* Feature Indicators */}
            <div className="flex items-center gap-3 text-[11px] text-slate-200 font-bold pt-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ Fast delivery</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>⭐ Local favourites</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-300" />
                <span>📍 Around Lakkarpur</span>
              </span>
            </div>
          </div>

          {/* Quick Highlight Card */}
          <div className="hidden lg:block bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center min-w-[200px]">
            <span className="text-3xl block mb-1">{isFresh ? '🥦 🍅 🍎' : '🥟 🍕 🥘'}</span>
            <span className="text-xs font-extrabold text-white block">
              {isFresh ? 'Wholesale Mandi Rates' : 'Authentic Outlets'}
            </span>
            <span className="text-[10px] text-slate-300 font-medium block mt-0.5">
              {isFresh ? 'Fresh 5 AM Morning Harvest' : 'Prepared Fresh To Order'}
            </span>
          </div>
        </div>

        {/* MOOD / INTENT NAVIGATION */}
        <MoodShortcuts />

        {/* BUILD MY BASKET WIDGET (Fresh Mode Only) */}
        {isFresh && <BuildBasketWidget />}

        {/* TOP PICKS NEAR YOU */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#17181C]">Top picks near you</h2>
              <p className="text-xs text-[#686D78] font-medium">Popular with people around Lakkarpur, Faridabad</p>
            </div>
            <Link to="/search" className="text-xs font-extrabold text-[#E51B4B] hover:underline flex items-center gap-1">
              <span>See all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-64 rounded-2xl bg-slate-200/60 animate-skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map(rest => (
                <RestaurantCard key={rest._id} restaurant={rest} />
              ))}
            </div>
          )}
        </div>

        {/* MOST ORDERED DISHES / PRODUCE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#17181C]">
                {isFresh ? '🌱 Fresh Mandi Vegetables & Produce' : '🔥 Most ordered near you'}
              </h2>
              <p className="text-xs text-[#686D78] font-medium">Dishes and produce loved by local customers</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-64 rounded-2xl bg-slate-200/60 animate-skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredFoods.map(item => (
                isFresh ? (
                  <FreshProductCard key={item._id} product={item} />
                ) : (
                  <FoodCard key={item._id} food={item} />
                )
              ))}
            </div>
          )}
        </div>

        {/* LOCAL GEMS (Signature Krawing Section) */}
        {!isFresh && localGems.length > 0 && (
          <div className="bg-gradient-to-r from-rose-50/70 via-white to-amber-50/50 p-6 rounded-2xl border border-[#E8E9ED] space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <h2 className="text-xl font-extrabold text-[#17181C]">Local gems</h2>
              </div>
              <p className="text-xs text-[#686D78] font-medium">Small places. Good food. Close to home in Lakkarpur.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {localGems.slice(0, 3).map(rest => (
                <RestaurantCard key={rest._id} restaurant={rest} />
              ))}
            </div>
          </div>
        )}

        {/* FRESH CROSSOVER BANNER (Connecting Food & Fresh) */}
        <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isFresh
            ? 'bg-[#FFF0F3] border-[#E51B4B]/20 text-[#17181C]'
            : 'bg-[#ECF8F1] border-[#168A5B]/20 text-[#17181C]'
        }`}>
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-heading font-extrabold text-base text-[#17181C]">
              {isFresh ? '🍔 Craving hot food instead?' : '🥬 Need groceries too?'}
            </h3>
            <p className="text-xs text-[#686D78] font-medium">
              {isFresh
                ? 'Explore momos, biryani, pizzas and thalis from nearby top-rated restaurants.'
                : 'Fresh fruits, vegetables and essentials from nearby wholesale sellers.'}
            </p>
          </div>

          <button
            onClick={() => switchMode(isFresh ? 'cravings' : 'fresh')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-sm transition whitespace-nowrap ${
              isFresh ? 'bg-[#E51B4B] hover:bg-[#B90F38]' : 'bg-[#168A5B] hover:bg-[#0F6945]'
            }`}
          >
            {isFresh ? 'Explore Cravings Food →' : 'Explore Fresh Mandi →'}
          </button>
        </div>

      </main>
    </div>
  );
}
