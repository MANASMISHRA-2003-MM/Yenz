import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Leaf } from 'lucide-react';

export default function FreshProductCard({ product }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const [adding, setAdding] = useState(false);

  // Default weight options if not specified
  const weightOptions = product.weightOptions && product.weightOptions.length > 0
    ? product.weightOptions
    : [
        { weightLabel: '500g', price: Math.round(product.price * 0.5) || product.price },
        { weightLabel: '1kg', price: product.price || 40 }
      ];

  const [selectedWeight, setSelectedWeight] = useState(weightOptions[0]);

  const cartItem = cart.items ? cart.items.find(i => (i.foodId?._id === product._id || i.foodId === product._id) && i.selectedWeight === selectedWeight.weightLabel) : null;
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = async (e) => {
    e.stopPropagation();
    setAdding(true);
    await addToCart(product._id, 1, selectedWeight.weightLabel);
    setAdding(false);
  };

  const handleIncrement = async (e) => {
    e.stopPropagation();
    await updateQuantity(product._id, quantity + 1, selectedWeight.weightLabel);
  };

  const handleDecrement = async (e) => {
    e.stopPropagation();
    await updateQuantity(product._id, quantity - 1, selectedWeight.weightLabel);
  };

  return (
    <div className="krawing-card krawing-card-hover rounded-3xl overflow-hidden flex flex-col justify-between p-4 group bg-white border border-slate-200/90 shadow-soft">
      <div>
        {/* Fresh Image & Badges */}
        <div className="relative h-44 w-full rounded-2xl overflow-hidden mb-3.5 bg-slate-100">
          <img
            src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Freshness Badge */}
          <div className="absolute top-3 left-3 bg-emerald-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
            <Leaf className="w-3 h-3 fill-white" />
            <span>{product.freshnessBadge || 'Arrived 6 AM Today'}</span>
          </div>
        </div>

        {/* Title & Vendor Tag */}
        <div className="space-y-1">
          <h3 className="font-heading font-extrabold text-sm text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {product.name}
          </h3>

          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
            {product.description}
          </p>
        </div>

        {/* Weight Selector Pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {weightOptions.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedWeight(opt)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition border ${
                selectedWeight.weightLabel === opt.weightLabel
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {opt.weightLabel} - ₹{opt.price}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing & Add Counter */}
      <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-base font-extrabold text-slate-900">₹{selectedWeight.price}</span>
          <span className="text-[10px] text-slate-400 font-bold block">({selectedWeight.weightLabel})</span>
        </div>

        {quantity > 0 ? (
          <div className="flex items-center bg-emerald-600 text-white rounded-xl shadow-sm border border-emerald-600">
            <button
              onClick={handleDecrement}
              className="p-1.5 hover:bg-emerald-700 rounded-l-xl transition"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-extrabold min-w-[20px] text-center">{quantity}</span>
            <button
              onClick={handleIncrement}
              className="p-1.5 hover:bg-emerald-700 rounded-r-xl transition"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-4 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD</span>
          </button>
        )}
      </div>
    </div>
  );
}
