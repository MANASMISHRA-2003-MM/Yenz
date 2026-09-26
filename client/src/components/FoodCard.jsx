import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Star, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function FoodCard({ food }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const [adding, setAdding] = useState(false);

  // Product ID
  const targetId = food.id || food._id;

  // Find item in cart
  const cartItem = cart?.items
    ? cart.items.find(i => (
        i.foodId === targetId ||
        i.productId === targetId ||
        i.foodId?._id === targetId ||
        i.id === targetId ||
        i._id === targetId
      ))
    : null;

  const quantity = cartItem ? cartItem.quantity : 0;

  // Add to cart
  const handleAdd = async (e) => {
    e.stopPropagation();

    setAdding(true);

    const res = await addToCart(targetId, 1);

    setAdding(false);

    if (res?.success) {
      toast.success(`Added ${food.name} to cart!`);
    }
  };

  // Increase quantity
  const handleIncrement = async (e) => {
    e.stopPropagation();
    await updateQuantity(targetId, quantity + 1);
  };

  // Decrease quantity
  const handleDecrement = async (e) => {
    e.stopPropagation();
    await updateQuantity(targetId, quantity - 1);
  };

  /*
   * IMPORTANT:
   * Directly use image coming from PostgreSQL Product.image
   */
  const imageUrl =
    food.image ||
    food.imageUrl ||
    food.photo ||
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';

  return (
    <article className="restaurant-food-card restaurant-food-card-hover rounded-3xl overflow-hidden flex flex-col justify-between p-4 group bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition">

      <div>

        {/* =========================
            PRODUCT IMAGE
        ========================== */}
        <div className="relative h-44 w-full rounded-2xl overflow-hidden mb-3.5 bg-slate-100">

          <img
            src={imageUrl}
            alt={food.name || 'Food'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              // If database image fails, show fallback image
              if (
                e.currentTarget.src !==
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80'
              ) {
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80';
              }
            }}
          />

          {/* Veg / Non-Veg Badge */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-sm flex items-center gap-1 border border-slate-200">

            <span
              className={`w-2.5 h-2.5 rounded-full ${
                food.isVeg
                  ? 'bg-emerald-600'
                  : 'bg-rose-600'
              }`}
            />

            <span className="text-[10px] font-extrabold uppercase text-slate-800 tracking-wider">
              {food.isVeg ? 'VEG' : 'NON-VEG'}
            </span>

          </div>

          {/* Rating Badge */}
          {food.rating && (
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl shadow-sm flex items-center gap-1 text-[11px] font-extrabold text-slate-900 border border-slate-200">

              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />

              <span>
                {food.rating}
              </span>

            </div>
          )}

        </div>


        {/* =========================
            PRODUCT CONTENT
        ========================== */}
        <div className="space-y-1">

          <div className="flex items-center justify-between gap-2">

            <h3 className="font-heading font-extrabold text-sm text-slate-900 line-clamp-1 group-hover:text-rose-600 transition-colors">
              {food.name}
            </h3>

          </div>

          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
            {food.description ||
              'Freshly prepared with authentic ingredients'}
          </p>

        </div>

      </div>


      {/* =========================
          FOOTER
      ========================== */}
      <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">

        {/* Price */}
        <div>

          <span className="text-base font-extrabold text-slate-900">
            ₹{food.price}
          </span>

          {food.prepTime && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">

              <Clock className="w-3 h-3 text-slate-400" />

              <span>
                {food.prepTime}
              </span>

            </span>
          )}

        </div>


        {/* =========================
            CART BUTTON
        ========================== */}

        {quantity > 0 ? (

          <div className="flex items-center bg-rose-600 text-white rounded-xl shadow-sm border border-rose-600">

            {/* Minus */}
            <button
              onClick={handleDecrement}
              className="p-1.5 hover:bg-rose-700 rounded-l-xl transition"
              aria-label="Decrease quantity"
            >

              <Minus className="w-3.5 h-3.5" />

            </button>


            {/* Quantity */}
            <span className="px-2 text-xs font-extrabold min-w-[20px] text-center">
              {quantity}
            </span>


            {/* Plus */}
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
            className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1 active:scale-95 disabled:opacity-50"
          >

            <Plus className="w-3.5 h-3.5" />

            <span>
              {adding ? 'ADDING...' : 'ADD'}
            </span>

          </button>

        )}

      </div>

    </article>
  );
}
