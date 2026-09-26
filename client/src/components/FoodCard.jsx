import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Star, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function FoodCard({ food }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const [adding, setAdding] = useState(false);

  // Product ID
  const targetId = food?.id || food?._id;

  // Find current product in cart
  const cartItem = cart?.items
    ? cart.items.find((item) => (
        item.foodId === targetId ||
        item.productId === targetId ||
        item.foodId?._id === targetId ||
        item.id === targetId ||
        item._id === targetId
      ))
    : null;

  const quantity = cartItem ? cartItem.quantity : 0;

  // =========================
  // ADD TO CART
  // =========================
  const handleAdd = async (e) => {
    e.stopPropagation();

    if (!targetId) {
      toast.error('Product ID not found');
      return;
    }

    setAdding(true);

    try {
      const res = await addToCart(targetId, 1);

      if (res?.success) {
        toast.success(`Added ${food?.name || 'item'} to cart!`);
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Unable to add item');
    } finally {
      setAdding(false);
    }
  };

  // =========================
  // INCREASE QUANTITY
  // =========================
  const handleIncrement = async (e) => {
    e.stopPropagation();

    if (!targetId) return;

    try {
      await updateQuantity(targetId, quantity + 1);
    } catch (error) {
      console.error('Increase quantity error:', error);
    }
  };

  // =========================
  // DECREASE QUANTITY
  // =========================
  const handleDecrement = async (e) => {
    e.stopPropagation();

    if (!targetId) return;

    try {
      await updateQuantity(targetId, quantity - 1);
    } catch (error) {
      console.error('Decrease quantity error:', error);
    }
  };

  // =====================================================
  // IMPORTANT:
  // USE IMAGE DIRECTLY FROM POSTGRESQL
  //
  // PostgreSQL:
  // Product.image
  //
  // API:
  // food.image
  // =====================================================

  const imageUrl = food?.image;

  return (
    <article
      className="
        restaurant-food-card
        restaurant-food-card-hover
        rounded-3xl
        overflow-hidden
        flex
        flex-col
        justify-between
        p-4
        group
        bg-white
        border
        border-slate-200/80
        shadow-sm
        hover:shadow-md
        transition
      "
    >

      {/* =====================================================
          PRODUCT SECTION
      ===================================================== */}
      <div>

        {/* =================================================
            IMAGE CONTAINER
        ================================================== */}
        <div
          className="
            relative
            h-44
            w-full
            rounded-2xl
            overflow-hidden
            mb-3.5
            bg-slate-100
          "
        >

          {/* =================================================
              PRODUCT IMAGE
              DIRECTLY FROM DATABASE
          ================================================= */}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={food?.name || 'Food'}
              className="
                w-full
                h-full
                object-cover
                group-hover:scale-105
                transition-transform
                duration-300
              "
              loading="lazy"
            />
          ) : (
            <div
              className="
                w-full
                h-full
                flex
                items-center
                justify-center
                bg-slate-100
                text-slate-400
                text-sm
                font-semibold
              "
            >
              No Image
            </div>
          )}

          {/* =================================================
              VEG / NON-VEG BADGE
          ================================================== */}
          <div
            className="
              absolute
              top-3
              left-3
              bg-white/95
              backdrop-blur-md
              px-2
              py-1
              rounded-xl
              shadow-sm
              flex
              items-center
              gap-1
              border
              border-slate-200
            "
          >

            <span
              className={`
                w-2.5
                h-2.5
                rounded-full
                ${
                  food?.isVeg
                    ? 'bg-emerald-600'
                    : 'bg-rose-600'
                }
              `}
            />

            <span
              className="
                text-[10px]
                font-extrabold
                uppercase
                text-slate-800
                tracking-wider
              "
            >
              {food?.isVeg ? 'VEG' : 'NON-VEG'}
            </span>

          </div>

          {/* =================================================
              RATING BADGE
          ================================================== */}
          {food?.rating && (
            <div
              className="
                absolute
                top-3
                right-3
                bg-white/95
                backdrop-blur-md
                px-2
                py-1
                rounded-xl
                shadow-sm
                flex
                items-center
                gap-1
                text-[11px]
                font-extrabold
                text-slate-900
                border
                border-slate-200
              "
            >

              <Star
                className="
                  w-3
                  h-3
                  text-amber-500
                  fill-amber-500
                "
              />

              <span>
                {food.rating}
              </span>

            </div>
          )}

        </div>

        {/* =================================================
            PRODUCT INFORMATION
        ================================================== */}
        <div className="space-y-1">

          <div
            className="
              flex
              items-center
              justify-between
              gap-2
            "
          >

            <h3
              className="
                font-heading
                font-extrabold
                text-sm
                text-slate-900
                line-clamp-1
                group-hover:text-rose-600
                transition-colors
              "
            >
              {food?.name || 'Unnamed Product'}
            </h3>

          </div>

          <p
            className="
              text-[11px]
              text-slate-500
              line-clamp-2
              leading-relaxed
              font-medium
            "
          >
            {food?.description ||
              'Freshly prepared with authentic ingredients'}
          </p>

        </div>

      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <div
        className="
          pt-3.5
          mt-3
          border-t
          border-slate-100
          flex
          items-center
          justify-between
          gap-2
        "
      >

        {/* =================================================
            PRICE
        ================================================== */}
        <div>

          <span
            className="
              text-base
              font-extrabold
              text-slate-900
            "
          >
            ₹{food?.price ?? 0}
          </span>

          {/* Preparation Time */}
          {food?.prepTime && (
            <span
              className="
                flex
                items-center
                gap-1
                text-[10px]
                text-slate-400
                font-medium
                mt-0.5
              "
            >

              <Clock
                className="
                  w-3
                  h-3
                  text-slate-400
                "
              />

              <span>
                {food.prepTime}
              </span>

            </span>
          )}

        </div>

        {/* =================================================
            CART BUTTON / QUANTITY STEPPER
        ================================================== */}

        {quantity > 0 ? (

          <div
            className="
              flex
              items-center
              bg-rose-600
              text-white
              rounded-xl
              shadow-sm
              border
              border-rose-600
            "
          >

            {/* MINUS */}
            <button
              onClick={handleDecrement}
              className="
                p-1.5
                hover:bg-rose-700
                rounded-l-xl
                transition
              "
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* QUANTITY */}
            <span
              className="
                px-2
                text-xs
                font-extrabold
                min-w-[20px]
                text-center
              "
            >
              {quantity}
            </span>

            {/* PLUS */}
            <button
              onClick={handleIncrement}
              className="
                p-1.5
                hover:bg-rose-700
                rounded-r-xl
                transition
              "
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

          </div>

        ) : (

          <button
            onClick={handleAdd}
            disabled={adding}
            className="
              px-4
              py-1.5
              bg-rose-50
              hover:bg-rose-100
              text-rose-700
              border
              border-rose-200
              rounded-xl
              text-xs
              font-extrabold
              shadow-sm
              transition
              flex
              items-center
              gap-1
              active:scale-95
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
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
