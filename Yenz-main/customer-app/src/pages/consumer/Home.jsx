import React, { useState, useEffect, useMemo } from 'react';
import { useMode } from '../../context/ModeContext';
import API from '../../services/api';
import Navbar from '../../components/Navbar';
import FreshCartFooter from '../../components/FreshCartFooter';
import PromotionCarousel from '../../components/PromotionCarousel';
import CategoryRail from '../../components/CategoryRail';
import FilterRail from '../../components/FilterRail';
import RestaurantCard from '../../components/RestaurantCard';
import FoodCard from '../../components/FoodCard';
import FreshProductCard from '../../components/FreshProductCard';
import BuildBasketWidget from '../../components/BuildBasketWidget';
import StickyBasketBar from '../../components/StickyBasketBar';
import MobileBottomNavigation from '../../components/MobileBottomNavigation';
import { ArrowRight, Compass, Leaf, Utensils, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const { mode, switchMode, isFresh } = useMode();
  const [restaurants, setRestaurants] = useState([]);
  const [featuredFoods, setFeaturedFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [fastDelivery, setFastDelivery] = useState(false);
  const [ratingFourPlus, setRatingFourPlus] = useState(false);
  const [under250, setUnder250] = useState(false);
  const [pureVeg, setPureVeg] = useState(() => localStorage.getItem('krawing_veg_only') === 'true');

  useEffect(() => {
    fetchHomeData();
    const loc = () => fetchHomeData();
    const veg = e => {
      if (typeof e.detail?.isVegOnly === 'boolean') setPureVeg(e.detail.isVegOnly);
    };
    window.addEventListener('krawing_location_changed', loc);
    window.addEventListener('krawing_veg_toggled', veg);
    return () => {
      window.removeEventListener('krawing_location_changed', loc);
      window.removeEventListener('krawing_veg_toggled', veg);
    };
  }, [mode]);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const vendorTypeParam = isFresh ? 'FRESH' : 'CRAVINGS';
      const vendorStoreType = isFresh ? 'FRESH_MARKET' : 'FOOD_RESTAURANT';
      const productType = isFresh ? 'VEGETABLE,FRUIT,GROCERY' : 'FOOD';

      // Set radius=50 to fetch all shops/restaurants from database
      let locationParams = '&radius=50';
      const saved = localStorage.getItem('krawing_user_coords');
      if (saved) {
        try {
          const { lat, lng } = JSON.parse(saved);
          if (lat && lng) locationParams = `&lat=${lat}&lng=${lng}&radius=50`;
        } catch {}
      }

      const [stores, foods] = await Promise.all([
        API.get(`/restaurants?vendorType=${vendorStoreType}${locationParams}`),
        API.get(`/foods?vendorType=${vendorTypeParam}&productType=${productType}`)
      ]);

      if (stores.data.success) setRestaurants(stores.data.restaurants || []);
      if (foods.data.success) setFeaturedFoods(foods.data.foods || []);
    } catch (e) {
      console.error('Error loading homepage data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFilter = k => {
    if (k === 'fastDelivery') setFastDelivery(v => !v);
    if (k === 'ratingFourPlus') setRatingFourPlus(v => !v);
    if (k === 'under250') setUnder250(v => !v);
    if (k === 'pureVeg') {
      const n = !pureVeg;
      setPureVeg(n);
      localStorage.setItem('krawing_veg_only', String(n));
      window.dispatchEvent(new CustomEvent('krawing_veg_toggled', { detail: { isVegOnly: n } }));
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setFastDelivery(false);
    setRatingFourPlus(false);
    setPureVeg(false);
    setUnder250(false);
    localStorage.setItem('krawing_veg_only', 'false');
  };

  const filteredFoods = useMemo(() => {
    return featuredFoods.filter(food => {
      if (pureVeg && !food.isVeg) return false;
      if (ratingFourPlus && (food.rating || 0) < 4) return false;
      if (under250 && food.price > 250) return false;
      if (selectedCategory === 'UNDER_250' && food.price > 250) return false;

      if (selectedCategory === 'FRESH_PRODUCE') {
        const ok = ['VEGETABLE', 'FRUIT'].includes(food.productType) ||
          ['Vegetable', 'Fruit', 'Greens', 'Produce', 'Mandi'].some(k =>
            (food.category || '').toLowerCase().includes(k.toLowerCase()) ||
            (food.name || '').toLowerCase().includes(k.toLowerCase())
          );
        if (!ok) return false;
      } else if (selectedCategory === 'GROCERY_ESSENTIALS') {
        const ok = food.productType === 'GROCERY' ||
          ['Rice', 'Pulse', 'Dal', 'Flour', 'Atta', 'Oil', 'Ghee', 'Spice', 'Dairy', 'Snack', 'Grocery'].some(k =>
            (food.category || '').toLowerCase().includes(k.toLowerCase()) ||
            (food.name || '').toLowerCase().includes(k.toLowerCase())
          );
        if (!ok) return false;
      } else if (selectedCategory !== 'ALL') {
        const q = selectedCategory.toLowerCase();
        const matchCat = (food.category || '').toLowerCase().includes(q);
        const matchName = (food.name || '').toLowerCase().includes(q);
        const matchType = (food.productType || '').toLowerCase().includes(q);
        const matchDesc = (food.description || '').toLowerCase().includes(q);
        if (!matchCat && !matchName && !matchType && !matchDesc) return false;
      }
      return true;
    });
  }, [featuredFoods, selectedCategory, pureVeg, ratingFourPlus, under250]);

  const filteredRestaurants = useMemo(() => {
    const matchingVendorIds = new Set(
      selectedCategory !== 'ALL' ? filteredFoods.map(f => f.vendorId || f.restaurantId) : []
    );

    return restaurants.filter(rest => {
      if (pureVeg && !rest.isVegOnly && rest.cuisine && !rest.cuisine.some(c => c.toLowerCase().includes('veg'))) return false;
      if (ratingFourPlus && (rest.rating || 0) < 4) return false;
      if (fastDelivery && !(rest.deliveryTime?.includes('15') || rest.deliveryTime?.includes('20') || rest.deliveryTime?.includes('25'))) return false;
      if (under250 && rest.priceRange?.includes('500')) return false;

      if (selectedCategory !== 'ALL' && selectedCategory !== 'UNDER_250' && selectedCategory !== 'FRESH_PRODUCE' && selectedCategory !== 'GROCERY_ESSENTIALS') {
        const q = selectedCategory.toLowerCase();
        const matchCuisine = (rest.cuisine || []).some(c => c.toLowerCase().includes(q));
        const matchName = (rest.name || '').toLowerCase().includes(q);
        const matchTag = (rest.freshTagline || '').toLowerCase().includes(q);
        const matchVendorType = (rest.vendorType || '').toLowerCase().includes(q);
        const hasMatchingProduct = matchingVendorIds.has(rest.id || rest._id);

        if (!matchCuisine && !matchName && !matchTag && !matchVendorType && !hasMatchingProduct) {
          return false;
        }
      }
      return true;
    });
  }, [restaurants, filteredFoods, selectedCategory, pureVeg, ratingFourPlus, fastDelivery, under250]);

  const deals = useMemo(() => filteredRestaurants.filter(r => r.offers?.length), [filteredRestaurants]);
  const gems = useMemo(() => filteredRestaurants.filter(r => (r.rating || 0) >= 4.5), [filteredRestaurants]);

  return (
    <div className="fc-page pb-24">
      <Navbar onVegToggle={setPureVeg} />
      <main className="fc-container py-6 space-y-8">
        <div className="fc-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-md flex items-center justify-center ${isFresh ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-[rgb(229,27,75)]'}`}>
              {isFresh ? <Leaf className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
            </div>
            <div>
              <div className="fc-eyebrow">Shopping channel</div>
              <h2 className="text-lg font-bold text-gray-900">{isFresh ? 'Fresh Mandi' : 'Cravings'}</h2>
              <p className="text-xs text-gray-500">{isFresh ? 'Daily produce, fruits & grocery essentials' : 'Restaurants, dishes & meals around you'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => switchMode('cravings')} className={`fc-btn py-2 text-xs ${!isFresh ? 'fc-btn-cravings' : 'fc-btn-soft'}`}>
              Cravings
            </button>
            <button onClick={() => switchMode('fresh')} className={`fc-btn py-2 text-xs ${isFresh ? 'fc-btn-fresh' : 'fc-btn-soft'}`}>
              Fresh Mandi
            </button>
          </div>
        </div>

        <PromotionCarousel />
        <CategoryRail selectedCategory={selectedCategory} onCategorySelect={setSelectedCategory} />

        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Refine your selection</h2>
              <p className="text-xs text-gray-500 mt-1">Filter stores and products from the database.</p>
            </div>
          </div>
          <FilterRail
            fastDelivery={fastDelivery}
            ratingFourPlus={ratingFourPlus}
            pureVeg={pureVeg}
            under250={under250}
            onToggleFilter={handleToggleFilter}
            onResetFilters={handleResetFilters}
          />
        </section>

        {isFresh && <BuildBasketWidget />}

        {!isFresh && deals.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Popular stores with deals</h2>
                <p className="text-xs text-gray-500 mt-1">Offers from nearby restaurants.</p>
              </div>
              <Link to="/search" className="text-xs font-semibold text-green-600 flex items-center gap-1">
                See all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deals.slice(0, 6).map(r => (
                <RestaurantCard key={r._id || r.id} restaurant={r} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{isFresh ? 'Top fresh stores near you' : 'Top picks near you'}</h2>
              <p className="text-xs text-gray-500 mt-1">All verified database stores and mandi vendors.</p>
            </div>
            <Link to="/search" className="text-xs font-semibold text-green-600">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-72 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filteredRestaurants.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRestaurants.map(r => (
                <RestaurantCard key={r._id || r.id} restaurant={r} />
              ))}
            </div>
          ) : (
            <div className="fc-card p-10 text-center">
              <Compass className="w-10 h-10 mx-auto text-gray-400" />
              <h3 className="mt-3 text-base font-semibold text-gray-800">No stores match these filters</h3>
              <button className="mt-4 fc-btn fc-btn-soft text-xs" onClick={handleResetFilters}>
                Reset filters
              </button>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-xl font-semibold text-gray-800">{isFresh ? 'Fresh produce & everyday essentials' : 'Popular dishes & meals'}</h2>
            <p className="text-xs text-gray-500 mt-1">Products fetched directly from the Yenz database.</p>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-72 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filteredFoods.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredFoods.map(item =>
                isFresh ? <FreshProductCard key={item._id || item.id} product={item} /> : <FoodCard key={item._id || item.id} food={item} />
              )}
            </div>
          ) : (
            <div className="fc-card p-10 text-center">
              <p className="text-sm font-semibold text-gray-700">No items found</p>
              <p className="mt-1 text-xs text-gray-500">Try another category or filter.</p>
            </div>
          )}
        </section>

        {!isFresh && gems.length > 0 && (
          <section>
            <div className="mb-3">
              <h2 className="text-xl font-semibold text-gray-800">Local favourites</h2>
              <p className="text-xs text-gray-500 mt-1">Highly rated nearby places.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gems.slice(0, 3).map(r => (
                <RestaurantCard key={r._id || r.id} restaurant={r} />
              ))}
            </div>
          </section>
        )}

        <div className="fc-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">{isFresh ? 'Craving a hot meal?' : 'Need fresh vegetables or groceries?'}</h3>
            <p className="text-xs text-gray-500 mt-1">Switch between both Yenz shopping channels without changing the cart architecture.</p>
          </div>
          <button onClick={() => switchMode(isFresh ? 'cravings' : 'fresh')} className={`fc-btn ${isFresh ? 'fc-btn-cravings' : 'fc-btn-fresh'} text-xs`}>
            {isFresh ? 'Explore Cravings' : 'Explore Fresh Mandi'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <FreshCartFooter />
      </main>
      <StickyBasketBar />
      <MobileBottomNavigation />
    </div>
  );
}
