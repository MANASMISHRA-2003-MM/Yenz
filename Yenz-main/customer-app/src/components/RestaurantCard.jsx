import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Tag, Leaf, MapPin } from 'lucide-react';
import { getAccurateRestaurantImage } from '../utils/imageUtils';

export default function RestaurantCard({ restaurant }) {
  const isFresh = restaurant.vendorType === 'FRESH_MARKET' || restaurant.vendorType === 'FRESH';
  const restaurantId = restaurant.id || restaurant._id;
  const imageUrl = restaurant.image || restaurant.bannerImage || getAccurateRestaurantImage(restaurant.name, restaurant.image, isFresh);
  const targetUrl = restaurant.linkUrl || `/restaurant/${restaurantId}`;
  const accent = isFresh ? 'rgb(22,138,91)' : 'rgb(229,27,75)';
  return (
    <Link to={targetUrl} className="fc-card fc-card-hover overflow-hidden block group">
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        <img src={imageUrl} alt={restaurant.name} loading="lazy" className={`w-full h-full object-cover transition duration-300 group-hover:scale-105 ${restaurant.status !== 'open' ? 'grayscale opacity-70' : ''}`} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/favicon.png'; }} />
        <span className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-bold text-white" style={{ background: accent }}>{isFresh ? 'FRESH MANDI' : 'RESTAURANT'}</span>
        {restaurant.status !== 'open' && <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-white text-red-600 text-[10px] font-bold border border-red-200">CLOSED</span>}
        {restaurant.offers?.length > 0 && <span className="absolute left-3 bottom-3 flex items-center gap-1 px-2 py-1 rounded-md bg-white/95 text-gray-800 text-[10px] font-bold shadow-sm"><Tag className="w-3 h-3 text-amber-500" /> Deals available</span>}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="text-base font-bold text-gray-900 truncate group-hover:text-green-600">{restaurant.name}</h3><p className="mt-1 text-xs text-gray-500 truncate">{restaurant.cuisine?.join(' · ') || 'Hyperlocal'} </p></div>
          <div className="flex items-center gap-1 text-xs font-bold text-gray-800"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{restaurant.rating || '4.8'}</div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{restaurant.deliveryTime || '20–30 min'}</span>
          <span className="flex items-center gap-1 truncate max-w-[55%]"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{restaurant.address?.city || restaurant.city || 'Nearby'}</span>
        </div>
      </div>
    </Link>
  );
}
