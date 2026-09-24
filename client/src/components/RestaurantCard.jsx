import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Tag, Leaf } from 'lucide-react';

export default function RestaurantCard({ restaurant }) {
  const isFresh = restaurant.vendorType === 'FRESH_MARKET';

  return (
    <Link
      to={`/restaurant/${restaurant._id}`}
      className="krawing-card krawing-card-hover rounded-2xl overflow-hidden flex flex-col justify-between p-4 group bg-white border border-[#E8E9ED]"
    >
      <div>
        {/* Cover Image & Badges */}
        <div className="relative h-44 w-full rounded-xl overflow-hidden mb-3 bg-[#F5F6F7]">
          <img
            src={restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600'}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Mode Tag */}
          <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 shadow-sm ${
            isFresh ? 'bg-[#168A5B] text-white' : 'bg-[#E51B4B] text-white'
          }`}>
            {isFresh ? <Leaf className="w-3 h-3 fill-white" /> : '🍔'}
            <span>{isFresh ? 'SABZI MANDI' : 'RESTAURANT'}</span>
          </div>

          {/* Rating Pill (⭐ 4.8 · 39) */}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl text-xs font-extrabold text-[#17181C] shadow-sm flex items-center gap-1 border border-[#E8E9ED]">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{restaurant.rating || 4.8}</span>
            <span className="text-[10px] text-[#9095A1] font-normal">· {restaurant.numRatings || 10}</span>
          </div>

          {/* Verified Offer Banner */}
          {restaurant.offers && restaurant.offers.length > 0 && (
            <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-900/90 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1.5 shadow-md">
              <Tag className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span className="truncate">{restaurant.offers[0]}</span>
            </div>
          )}
        </div>

        {/* Info Content */}
        <div className="space-y-1">
          <h3 className={`font-heading font-extrabold text-base text-[#17181C] line-clamp-1 transition-colors ${
            isFresh ? 'group-hover:text-[#168A5B]' : 'group-hover:text-[#E51B4B]'
          }`}>
            {restaurant.name}
          </h3>

          <p className="text-xs text-[#686D78] font-medium truncate">
            {restaurant.cuisine ? restaurant.cuisine.join(' • ') : 'Hyperlocal'}
          </p>

          {restaurant.priceRange && (
            <p className="text-[11px] text-[#9095A1] font-semibold">
              {restaurant.priceRange}
            </p>
          )}
        </div>
      </div>

      {/* Footer ETA, 5km Distance & Delivery Fee */}
      <div className="pt-3 mt-3 border-t border-[#E8E9ED] flex items-center justify-between text-xs text-[#686D78] font-medium">
        <span className="flex items-center gap-1 font-bold text-[#17181C]">
          <Clock className="w-3.5 h-3.5 text-[#9095A1]" />
          <span>⚡ {restaurant.deliveryTime || '20-30 min'}</span>
        </span>

        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          📍 {restaurant.distanceKm ? `${restaurant.distanceKm} km` : '< 5 km'}
        </span>

        <span>₹{restaurant.deliveryFee || 30} delivery</span>
      </div>
    </Link>
  );
}
