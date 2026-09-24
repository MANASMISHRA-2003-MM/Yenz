import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Star, Clock } from 'lucide-react';

export default function FoodCard({ food }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const [adding, setAdding] = useState(false);

  const cartItem = cart.items ? cart.items.find(i => i.foodId?._id === food._id || i.foodId === food._id) : null;
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = async (e) => {
    e.stopPropagation();
    setAdding(true);
    await addToCart(food._id, 1);
    setAdding(false);
  };

  const handleIncrement = async (e) => {
    e.stopPropagation();
    await updateQuantity(food._id, quantity + 1);
  };

  const handleDecrement = async (e) => {
    e.stopPropagation();
    await updateQuantity(food._id, quantity - 1);
  };

  return (
    <div className="krawing-card krawing-card-hover rounded-3xl overflow-hidden flex flex-col justify-between p-4 group bg-white">
      <div>
        {/* Image Container with Badges */}
        <div className="relative h-44 w-full rounded-2xl overflow-hidden mb-3.5 bg-slate-100">
          <img
            src={food.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400'}
            alt={food.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Veg / Non-Veg Badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-sm flex items-center gap-1 border border-slate-200">
            <span className={`w-2.5 h-2.5 rounded-full ${food.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
            <span className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider">
              {food.isVeg ? 'VEG' : 'NON-VEG'}
            </span>
          </div>

          {/* Rating Badge */}
          {food.rating && (
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-sm flex items-center gap-1 text-[11px] font-extrabold text-slate-900 border border-slate-200">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{food.rating}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading font-extrabold text-sm text-slate-900 line-clamp-1 group-hover:text-rose-600 transition-colors">
              {food.name}
            </h3>
          </div>

          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
            {food.description}
          </p>
        </div>
      </div>

      {/* Footer Price & Add Button */}
      <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-base font-extrabold text-slate-900">₹{food.price}</span>
          {food.prepTime && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{food.prepTime}</span>
            </span>
          )}
        </div>

        {/* Add / Stepper Counter */}
        {quantity > 0 ? (
          <div className="flex items-center bg-rose-600 text-white rounded-xl shadow-sm border border-rose-600">
            <button
              onClick={handleDecrement}
              className="p-1.5 hover:bg-rose-700 rounded-l-xl transition"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-extrabold min-w-[20px] text-center">{quantity}</span>
            <button
              onClick={handleIncrement}
              className="p-1.5 hover:bg-rose-700 rounded-r-xl transition"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD</span>
          </button>
        )}
      </div>
    </div>
  );
}
