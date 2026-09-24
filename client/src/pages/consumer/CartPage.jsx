import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useMode } from '../../context/ModeContext';
import Navbar from '../../components/Navbar';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Tag } from 'lucide-react';

export default function CartPage() {
  const { cart, itemCount, subtotal, updateQuantity, clearCart, applyCoupon } = useCart();
  const { user } = useAuth();
  const { isFresh } = useMode();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState('');

  const deliveryFee = cart.restaurantId?.deliveryFee || 35;
  const tax = Math.round(subtotal * 0.05);
  const discount = cart.discount || 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee + tax - discount);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput) return;
    const res = await applyCoupon(couponInput);
    setCouponMsg(res.message);
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/checkout');
    }
  };

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
        <Navbar />

        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Your Shopping Basket is Empty</h2>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              Explore gourmet dishes or fresh mandi produce to fill your basket.
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-extrabold text-white shadow-md transition ${
                  isFresh ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <span>Browse Products</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft">
          <div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
              cart.restaurantId?.vendorType === 'FRESH_MARKET'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {cart.restaurantId?.vendorType === 'FRESH_MARKET' ? '🥬 FRESH SABZI BASKET' : '🍔 GOURMET MEAL CART'}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              Order from {cart.restaurantId?.name || 'Local Store'}
            </h1>
          </div>

          <button
            onClick={clearCart}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-extrabold border border-rose-200 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Cart</span>
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Cart Items List */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
              Items Selected ({itemCount})
            </h2>

            <div className="divide-y divide-slate-100">
              {cart.items.map((item, idx) => (
                <div key={idx} className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-extrabold text-slate-900">{item.name}</h4>
                    {item.selectedWeight && (
                      <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                        Weight: {item.selectedWeight}
                      </span>
                    )}
                    <p className="text-xs text-slate-500 font-medium">₹{item.price} each</p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 text-slate-800 rounded-xl border border-slate-200">
                      <button
                        onClick={() => updateQuantity(item.foodId._id || item.foodId, item.quantity - 1, item.selectedWeight)}
                        className="p-1.5 hover:bg-slate-200 rounded-l-xl transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 text-xs font-extrabold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.foodId._id || item.foodId, item.quantity + 1, item.selectedWeight)}
                        className="p-1.5 hover:bg-slate-200 rounded-r-xl transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-sm font-extrabold text-slate-900 min-w-[50px] text-right">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill Summary & Checkout CTA */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Coupon Code Box */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-soft space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                <Tag className="w-4 h-4 text-amber-500" />
                <span>Apply Promo Coupon</span>
              </div>

              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter KRAW50 or SABZI10"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 uppercase focus:outline-none focus:bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition"
                >
                  Apply
                </button>
              </form>

              {couponMsg && (
                <p className="text-[11px] font-bold text-emerald-700">{couponMsg}</p>
              )}
            </div>

            {/* Price Calculation Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                Bill Summary
              </h3>

              <div className="space-y-2 text-xs font-medium text-slate-600">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-extrabold text-slate-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Partner Fee</span>
                  <span className="font-extrabold text-slate-900">₹{deliveryFee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Govt. Taxes & Packing (5%)</span>
                  <span className="font-extrabold text-slate-900">₹{tax}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-extrabold">
                    <span>Coupon Discount</span>
                    <span>-₹{discount}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Grand Total</span>
                  <span className="text-2xl font-extrabold text-slate-900">₹{grandTotal}</span>
                </div>

                <button
                  onClick={handleProceedToCheckout}
                  className={`px-6 py-3.5 rounded-2xl text-xs font-extrabold text-white shadow-md transition flex items-center gap-2 ${
                    isFresh ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <span>Proceed to Address</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium justify-center pt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Encrypted 256-bit Secure Checkout</span>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
