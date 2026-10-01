import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Star, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function FoodCard({ food, isStoreClosed = false }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const [adding, setAdding] = useState(false);
  const targetId = food?.id || food?._id;
  const cartItem = cart?.items?.find(item => (item.foodId === targetId || item.productId === targetId || item.foodId?._id === targetId || item.id === targetId || item._id === targetId));
  const quantity = cartItem?.quantity || 0;
  const handleAdd = async (e) => {
    e.stopPropagation();
    if (isStoreClosed) return toast.error('This restaurant is currently offline / closed and not accepting orders.');
    if (food?.isAvailable === false) return toast.error(`"${food?.name || 'This item'}" is currently out of stock`);
    if (!targetId) return toast.error('Product ID not found');
    setAdding(true);
    try { const res = await addToCart(targetId, 1); if (res?.success) toast.success(`Added ${food?.name || 'item'} to cart!`); } finally { setAdding(false); }
  };
  return (
    <article className="fc-card fc-card-hover overflow-hidden group">
      <div className="relative h-52 bg-gray-50 p-3">
        {food?.image ? <img src={food.image} alt={food?.name || 'Food'} className={`w-full h-full object-contain ${food?.isAvailable === false ? 'opacity-50 grayscale' : ''} group-hover:scale-[1.03] transition`} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/favicon.png'; }} /> : <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">No Image</div>}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200 text-[10px] font-bold text-gray-800"><span className={`w-2 h-2 rounded-full ${food?.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />{food?.isVeg ? 'VEG' : 'NON-VEG'}</span>
        {food?.rating && <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200 text-[10px] font-bold"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{food.rating}</span>}
        {food?.isAvailable === false && <div className="absolute inset-0 bg-black/45 flex items-center justify-center"><span className="px-3 py-1.5 bg-white text-red-600 rounded-md font-bold text-[10px] uppercase">Out of Stock</span></div>}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-[rgb(229,27,75)]">{food?.name || 'Unnamed Product'}</h3>
        <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 min-h-[2.25rem]">{food?.description || 'Freshly prepared with authentic ingredients'}</p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-gray-200 pt-3">
          <div><div className="text-base font-bold text-gray-900">₹{food?.price ?? 0}</div>{food?.prepTime && <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500"><Clock className="w-3 h-3" />{food.prepTime}</div>}</div>
          {isStoreClosed ? <button onClick={e => {e.stopPropagation(); toast.error('This restaurant is currently offline / closed');}} className="fc-btn py-1.5 px-3 text-[10px] bg-red-50 text-red-600 border-red-200">Closed</button> : food?.isAvailable === false ? <button disabled className="fc-btn py-1.5 px-3 text-[10px] bg-gray-100 text-gray-500 border-gray-200">Out of stock</button> : quantity > 0 ? <div className="inline-flex items-center rounded-md overflow-hidden border" style={{background:'rgb(229,27,75)', borderColor:'rgb(229,27,75)', color:'#fff'}}><button onClick={async e => {e.stopPropagation(); await updateQuantity(targetId, quantity - 1);}} className="p-1.5 hover:brightness-95"><Minus className="w-3.5 h-3.5" /></button><span className="px-2 text-xs font-bold">{quantity}</span><button onClick={async e => {e.stopPropagation(); await updateQuantity(targetId, quantity + 1);}} className="p-1.5 hover:brightness-95"><Plus className="w-3.5 h-3.5" /></button></div> : <button onClick={handleAdd} disabled={adding} className="fc-btn py-1.5 px-3 text-[10px] bg-[rgb(255,240,243)] text-[rgb(185,15,56)] border-[rgb(255,196,207)]"><Plus className="w-3.5 h-3.5" />{adding ? 'ADDING' : 'ADD'}</button>}
        </div>
      </div>
    </article>
  );
}
