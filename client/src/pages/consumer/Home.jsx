import React, { useState, useEffect } from 'react';
import { useMode } from '../../context/ModeContext';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import PromotionCarousel from '../../components/PromotionCarousel';
import CategoryRail from '../../components/CategoryRail';
import FilterRail from '../../components/FilterRail';
import RestaurantCard from '../../components/RestaurantCard';
import FoodCard from '../../components/FoodCard';
import FreshProductCard from '../../components/FreshProductCard';
import BuildBasketWidget from '../../components/BuildBasketWidget';
import StickyBasketBar from '../../components/StickyBasketBar';
import MobileBottomNavigation from '../../components/MobileBottomNavigation';
import { Flame, Leaf, Sparkles, ArrowRight, ShieldCheck, Zap, MapPin, Store, Utensils, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const { mode, switchMode, isFresh } = useMode();
  const [restaurants, setRestaurants] = useState([]);
  const [featuredFoods, setFeaturedFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Discovery Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [fastDelivery, setFastDelivery] = useState(false);
  const [ratingFourPlus, setRatingFourPlus] = useState(false);
  const [pureVeg, setPureVeg] = useState(() => {
    return localStorage.getItem('krawing_veg_only') === 'true';
  });
  const [under250, setUnder250] = useState(false);

  useEffect(() => {
    fetchHomeData();

    const handleLocationChange = () => fetchHomeData();
    const handleVegEvent = (e) => {
      if (e.detail && typeof e.detail.isVegOnly === 'boolean') {
        setPureVeg(e.detail.isVegOnly);
      }
    };

    window.addEventListener('krawing_location_changed', handleLocationChange);
    window.addEventListener('krawing_veg_toggled', handleVegEvent);

    return () => {
      window.removeEventListener('krawing_location_changed', handleLocationChange);
      window.removeEventListener('krawing_veg_toggled', handleVegEvent);
    };
  }, [mode]);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const vendorType = isFresh ? 'FRESH_MARKET' : 'FOOD_RESTAURANT';
      const productType = isFresh ? 'VEGETABLE,FRUIT' : 'FOOD';

      let locationParams = '&radius=5';
      const savedCoords = localStorage.getItem('krawing_user_coords');
      if (savedCoords) {
        try {
          const { lat, lng } = JSON.parse(savedCoords);
          if (lat && lng) {
            locationParams = `&lat=${lat}&lng=${lng}&radius=5`;
          }
        } catch (e) {}
      }

      const [resStores, resFoods] = await Promise.all([
        API.get(`/restaurants?vendorType=${vendorType}${locationParams}`),
        API.get(`/foods?productType=${productType}`)
      ]);

      if (resStores.data.success) setRestaurants(resStores.data.restaurants);
      if (resFoods.data.success) setFeaturedFoods(resFoods.data.foods);
    } catch (err) {
      console.error('Error loading homepage data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFilter = (filterKey) => {
    if (filterKey === 'fastDelivery') setFastDelivery(!fastDelivery);
    if (filterKey === 'ratingFourPlus') setRatingFourPlus(!ratingFourPlus);
    if (filterKey === 'pureVeg') {
      const nextVeg = !pureVeg;
      setPureVeg(nextVeg);
      localStorage.setItem('krawing_veg_only', String(nextVeg));
      window.dispatchEvent(new CustomEvent('krawing_veg_toggled', { detail: { isVegOnly: nextVeg } }));
    }
    if (filterKey === 'under250') setUnder250(!under250);
  };

  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setFastDelivery(false);
    setRatingFourPlus(false);
    setPureVeg(false);
    setUnder250(false);
    localStorage.setItem('krawing_veg_only', 'false');
  };

  // Filter Logic Applied to Restaurants
  const filteredRestaurants = restaurants.filter(rest => {
    if (pureVeg && !rest.isVeg && rest.cuisine && !rest.cuisine.some(c => c.toLowerCase().includes('veg'))) return false;
    if (ratingFourPlus && (rest.rating || 0) < 4.0) return false;
    if (fastDelivery && !(rest.deliveryTime?.includes('15') || rest.deliveryTime?.includes('20') || rest.deliveryTime?.includes('25'))) return false;
    if (under250 && rest.priceRange && rest.priceRange.includes('500')) return false;
    if (selectedCategory !== 'ALL' && selectedCategory !== 'UNDER_250') {
      const matchCuisine = rest.cuisine && rest.cuisine.some(c => c.toLowerCase().includes(selectedCategory.toLowerCase()));
      const matchName = rest.name.toLowerCase().includes(selectedCategory.toLowerCase());
      if (!matchCuisine && !matchName) return false;
    }
    return true;
  });

  // Filter Logic Applied to Featured Foods / Products
  const filteredFoods = featuredFoods.filter(food => {
    if (pureVeg && !food.isVeg) return false;
    if (ratingFourPlus && (food.rating || 0) < 4.0) return false;
    if (under250 && food.price > 250) return false;
    if (selectedCategory === 'UNDER_250' && food.price > 250) return false;
    if (selectedCategory !== 'ALL' && selectedCategory !== 'UNDER_250') {
      const matchCategory = food.category && food.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchName = food.name.toLowerCase().includes(selectedCategory.toLowerCase());
      if (!matchCategory && !matchName) return false;
    }
    return true;
  });

  // High rated local gems
  const localGems = filteredRestaurants.filter(r => (r.rating || 0) >= 4.5);
  // Deals section
  const recommendedDeals = filteredRestaurants.filter(r => r.offers && r.offers.length > 0);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#17181C] pb-32">
      {/* 1. Header (Navbar) */}
      <Navbar onVegToggle={(val) => setPureVeg(val)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-7">

        {/* 2. Mode Switcher Banner Pill (Mobile & Desktop) */}
        <div className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-2xl border border-[#E8E9ED] shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
              isFresh ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {isFresh ? '🥬' : '🍔'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.2 rounded-md ${
                  isFresh ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  Active Channel
                </span>
                {pureVeg && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.2 rounded-md bg-emerald-700 text-white">
                    🌱 Pure Veg On
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-[#17181C] leading-tight mt-0.5">
                {isFresh ? 'Sabzi Mandi & Grocery' : 'Cravings Food & Meals'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => switchMode('cravings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                !isFresh
                  ? 'bg-[#E51B4B] text-white shadow-sm'
                  : 'bg-[#F5F6F7] text-[#686D78] hover:bg-[#E8E9ED]'
              }`}
            >
              🍔 Cravings
            </button>
            <button
              onClick={() => switchMode('fresh')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                isFresh
                  ? 'bg-[#168A5B] text-white shadow-sm'
                  : 'bg-[#F5F6F7] text-[#686D78] hover:bg-[#E8E9ED]'
              }`}
            >
              🥬 Fresh Mandi
            </button>
          </div>
        </div>

        {/* 3. Promotional Carousel Area */}
        <PromotionCarousel />

        {/* 4. Food Category Discovery Rail */}
        <CategoryRail
          selectedCategory={selectedCategory}
          onCategorySelect={(cat) => setSelectedCategory(cat)}
        />

        {/* 5. Quick Filter Rail */}
        <FilterRail
          fastDelivery={fastDelivery}
          ratingFourPlus={ratingFourPlus}
          pureVeg={pureVeg}
          under250={under250}
          onToggleFilter={handleToggleFilter}
          onResetFilters={handleResetFilters}
        />

        {/* Build My Basket Widget (Fresh Mode Only) */}
        {isFresh && <BuildBasketWidget />}

        {/* 6. RECOMMENDED WITH DEALS (Horizontal Mobile Rail / Responsive Grid) */}
        {!isFresh && recommendedDeals.length > 0 && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#17181C] tracking-tight">
                  Recommended with deals
                </h2>
                <p className="text-xs text-[#686D78] font-medium">Great food at pocket-friendly prices</p>
              </div>
            </div>

            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto scrollbar-none pb-2 snap-x">
              {recommendedDeals.map(rest => (
                <div key={rest._id} className="min-w-[280px] sm:min-w-0 snap-start flex-shrink-0">
                  <RestaurantCard restaurant={rest} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. TOP PICKS NEAR YOU */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#17181C] tracking-tight">
                {isFresh ? 'Top Fresh Mandi Stores' : 'Top picks near you'}
              </h2>
              <p className="text-xs text-[#686D78] font-medium">
                {isFresh ? 'Wholesale vendors around Lakkarpur, Faridabad' : 'Popular outlets near Lakkarpur, Faridabad'}
              </p>
            </div>
            <Link to="/search" className="text-xs font-extrabold text-[#E51B4B] hover:underline flex items-center gap-1">
              <span>See all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-64 rounded-2xl bg-slate-200/60 skeleton-loading-pulse" />
              ))}
            </div>
          ) : filteredRestaurants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRestaurants.map(rest => (
                <RestaurantCard key={rest._id} restaurant={rest} />
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl text-center border border-slate-200 space-y-3">
              <Compass className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-800">No restaurants match active filters</h3>
              <p className="text-xs text-slate-500 font-medium">Try removing pure veg or rating filters to view more local spots.</p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-rose-50 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* 8. POPULAR DISHES / PRODUCE GRID */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#17181C] tracking-tight">
                {isFresh ? '🌱 Fresh Mandi Produce & Essentials' : '🔥 Popular dishes & meals'}
              </h2>
              <p className="text-xs text-[#686D78] font-medium">Order items loved by your neighbors</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-64 rounded-2xl bg-slate-200/60 skeleton-loading-pulse" />
              ))}
            </div>
          ) : filteredFoods.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredFoods.map(item => (
                isFresh ? (
                  <FreshProductCard key={item._id} product={item} />
                ) : (
                  <FoodCard key={item._id} food={item} />
                )
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl text-center border border-slate-200 space-y-2">
              <Utensils className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-800">No food items found</h3>
              <p className="text-xs text-slate-500">Try changing your category choice or filter criteria.</p>
            </div>
          )}
        </div>

        {/* 9. LOCAL GEMS SECTION */}
        {!isFresh && localGems.length > 0 && (
          <div className="bg-gradient-to-r from-rose-50/80 via-white to-amber-50/60 p-6 rounded-3xl border border-[#E8E9ED] space-y-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📍</span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#17181C]">Local gems</h2>
              </div>
              <p className="text-xs text-[#686D78] font-medium">Small places. Good food. Rated 4.5+ near home.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {localGems.slice(0, 3).map(rest => (
                <RestaurantCard key={rest._id} restaurant={rest} />
              ))}
            </div>
          </div>
        )}

        {/* 10. CROSSOVER BANNER */}
        <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isFresh
            ? 'bg-[#FFF0F3] border-[#E51B4B]/20 text-[#17181C]'
            : 'bg-[#ECF8F1] border-[#168A5B]/20 text-[#17181C]'
        }`}>
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-heading font-extrabold text-base text-[#17181C]">
              {isFresh ? '🍔 Craving hot food instead?' : '🥬 Need fresh sabzi & fruits?'}
            </h3>
            <p className="text-xs text-[#686D78] font-medium">
              {isFresh
                ? 'Order momos, biryani, pizzas and thalis from nearby top-rated outlets.'
                : 'Direct morning harvest vegetables & staples at wholesale prices.'}
            </p>
          </div>

          <button
            onClick={() => switchMode(isFresh ? 'cravings' : 'fresh')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-sm transition whitespace-nowrap active:scale-95 ${
              isFresh ? 'bg-[#E51B4B] hover:bg-[#B90F38]' : 'bg-[#168A5B] hover:bg-[#0F6945]'
            }`}
          >
            {isFresh ? 'Explore Cravings Food →' : 'Explore Fresh Mandi →'}
          </button>
        </div>

      </main>

      {/* 11. Mobile Sticky Basket Bar (Appears when cart has items on mobile) */}
      <StickyBasketBar />

      {/* 12. Persistent Mobile Bottom Navigation */}
      <MobileBottomNavigation />
    </div>
  );
}
