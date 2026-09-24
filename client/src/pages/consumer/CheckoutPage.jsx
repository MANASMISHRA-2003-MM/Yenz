import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useMode } from '../../context/ModeContext';
import Navbar from '../../components/Navbar';
import { MapPin, CreditCard, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export default function CheckoutPage() {
  const { cart, subtotal, fetchCart } = useCart();
  const { isFresh } = useMode();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Address fields
  const [address, setAddress] = useState({
    title: 'Home',
    street: 'Flat 402, Lotus Greens, Sector 78',
    city: 'Noida',
    state: 'UP',
    pincode: '201305',
    phone: '+91 98765 43210'
  });

  const deliveryFee = cart.restaurantId?.deliveryFee || 35;
  const tax = Math.round(subtotal * 0.05);
  const discount = cart.discount || 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee + tax - discount);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await API.post('/orders', {
        address,
        paymentMethod,
        deliveryNotes
      });

      if (res.data.success) {
        await fetchCart(); // Refresh cart
        navigate(`/order-tracking/${res.data.order._id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
            isFresh ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            FINAL CHECKOUT STEP
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Delivery Address & Payment</h1>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Address & Payment Selection */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Address Selection Box */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                <MapPin className="w-5 h-5 text-brand-600" />
                <span>Confirm Delivery Location</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Street / House / Apartment</label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">City</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">Pincode</label>
                    <input
                      type="text"
                      value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Phone Number for Delivery Partner</label>
                  <input
                    type="text"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Special Delivery Instructions (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Leave at gate, ring bell twice..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Payment Method Selector */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>Select Payment Method</span>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'UPI', label: 'Instant Google Pay / PhonePe UPI', desc: 'Fast & 100% Instant Approval' },
                  { id: 'CARD', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
                  { id: 'COD', label: 'Cash on Delivery (COD)', desc: 'Pay cash to driver upon arrival' }
                ].map(pm => (
                  <label
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition ${
                      paymentMethod === pm.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === pm.id}
                      onChange={() => setPaymentMethod(pm.id)}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-xs font-extrabold block">{pm.label}</span>
                      <span className={`text-[11px] font-medium ${paymentMethod === pm.id ? 'text-slate-300' : 'text-slate-500'}`}>
                        {pm.desc}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Order Summary & Place Order CTA */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              Order Summary
            </h3>

            <div className="space-y-2 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Items ({cart.items?.length || 0})</span>
                <span className="font-extrabold text-slate-900">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-extrabold text-slate-900">₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Packing</span>
                <span className="font-extrabold text-slate-900">₹{tax}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-extrabold">
                  <span>Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Amount Payable</span>
                <span className="text-2xl font-extrabold text-slate-900">₹{grandTotal}</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-2xl text-xs font-extrabold text-white shadow-lg transition flex items-center justify-center gap-2 ${
                  isFresh ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm Order & Pay (₹{grandTotal})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-extrabold pt-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Instant Order Dispatch Guaranteed</span>
              </div>
            </div>

          </div>

        </form>

      </main>
    </div>
  );
}
