import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useMode } from '../../context/ModeContext';
import Navbar from '../../components/Navbar';
import AddressModal, { getSavedAddresses } from '../../components/AddressModal';
import { MapPin, CreditCard, ShieldCheck, CheckCircle2, ArrowRight, Navigation, Plus, Bookmark, Store, Clock, Scale, Tag } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage({ modeOverride }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { carts, cravingsCart, freshCart, fetchCart } = useCart();
  const { isFresh: defaultIsFresh } = useMode();

  // Determine current mode from prop, pathname or active global mode
  let activeMode = modeOverride;
  if (!activeMode) {
    if (location.pathname.includes('/checkout/fresh-mandi')) {
      activeMode = 'FRESH_MANDI';
    } else if (location.pathname.includes('/checkout/cravings')) {
      activeMode = 'CRAVINGS';
    } else {
      activeMode = defaultIsFresh ? 'FRESH_MANDI' : 'CRAVINGS';
    }
  }

  const isFreshMode = activeMode === 'FRESH_MANDI';
  const cart = isFreshMode ? (freshCart || carts.FRESH_MANDI) : (cravingsCart || carts.CRAVINGS);

  const subtotal = cart.items
    ? cart.items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0)
    : 0;

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState(getSavedAddresses());
  const [locating, setLocating] = useState(false);

  // Address fields
  const [address, setAddress] = useState(() => {
    const saved = getSavedAddresses();
    const defaultAddr = saved.find(a => a.isDefault) || saved[0];
    if (defaultAddr) {
      return {
        title: defaultAddr.title || 'Home',
        street: defaultAddr.street || '',
        city: defaultAddr.city || '',
        state: defaultAddr.state || 'UP',
        pincode: defaultAddr.pincode || '',
        phone: defaultAddr.phone || '+91 98765 43210'
      };
    }
    return {
      title: 'Home',
      street: 'Flat 402, Lotus Greens, Sector 78',
      city: 'Noida',
      state: 'UP',
      pincode: '201305',
      phone: '+91 98765 43210'
    };
  });

  useEffect(() => {
    const handleUpdate = () => {
      setSavedAddresses(getSavedAddresses());
    };
    window.addEventListener('krawing_addresses_updated', handleUpdate);
    return () => window.removeEventListener('krawing_addresses_updated', handleUpdate);
  }, []);

  const selectSavedAddress = (savedItem) => {
    setAddress({
      title: savedItem.title || 'Saved Location',
      street: savedItem.street || '',
      city: savedItem.city || '',
      state: savedItem.state || 'UP',
      pincode: savedItem.pincode || '',
      phone: savedItem.phone || '+91 98765 43210'
    });
    toast.success(`Address updated to "${savedItem.title || 'Saved Location'}"`);
  };

  const handleFetchLiveGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          let street = '';
          let city = '';
          let pincode = '';

          if (data && data.address) {
            const a = data.address;
            const sub = a.suburb || a.neighbourhood || a.residential || a.road || a.subdistrict || '';
            const house = a.house_number || a.building || '';
            street = [house, sub, a.amenity].filter(Boolean).join(', ') || data.display_name.split(',')[0];
            city = a.city || a.town || a.district || a.county || 'Faridabad';
            pincode = a.postcode || '121009';
          } else {
            street = `GPS Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            city = 'Faridabad';
            pincode = '121009';
          }

          setAddress(prev => ({
            ...prev,
            title: 'Live GPS Location',
            street,
            city,
            pincode
          }));
          toast.success('Updated address with live GPS location!');
        } catch (err) {
          console.error('Error reverse geocoding location:', err);
          toast.error('Could not fetch address details for current GPS coordinates');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast.error(`Location permission error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const deliveryFee = cart.restaurant?.deliveryFee || 35;
  const tax = Math.round(subtotal * 0.05);
  const discount = cart.discount || 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee + tax - discount);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!cart.items || cart.items.length === 0) {
      toast.error(`Your ${isFreshMode ? 'Fresh Mandi' : 'Cravings'} basket is empty!`);
      return;
    }
    try {
      setLoading(true);
      const res = await API.post('/orders', {
        address,
        paymentMethod,
        deliveryNotes,
        shoppingMode: activeMode
      });

      if (res.data.success) {
        toast.success('Order placed successfully! Redirecting to live order tracking...');
        await fetchCart();
        const orderId = res.data.order?._id || res.data.order?.id;
        navigate(`/order-tracking/${orderId}`);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Error processing order payment';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex items-center justify-between">
          <div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
              isFreshMode ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {isFreshMode ? '🥬 FRESH MANDI CHECKOUT' : '🍕 CRAVINGS CHECKOUT'}
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Delivery Address & Payment</h1>
          </div>
          {cart.restaurant && (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
              <Store className="w-4 h-4 text-slate-500" />
              <span>{cart.restaurant.name}</span>
            </div>
          )}
        </div>

        <form onSubmit={handlePlaceOrder} className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Address & Payment Selection */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Address Selection Box */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <MapPin className="w-5 h-5 text-rose-600" />
                  <span>Confirm Delivery Location</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved Profiles</span>
                </button>
              </div>

              {/* Saved Address Selection Pills & GPS Trigger */}
              <div className="space-y-2">
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Quick Select Saved Address Profile
                </p>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.map(sa => (
                    <button
                      key={sa.id}
                      type="button"
                      onClick={() => selectSavedAddress(sa)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                        address.street === sa.street
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{sa.title}</span>
                      <span className="text-[10px] opacity-75 font-normal truncate max-w-[100px]">
                        ({sa.city})
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleFetchLiveGps}
                    disabled={locating}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1.5"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                    <span>{locating ? 'Locating...' : 'Use Live Device GPS'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-xs pt-2">
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
                  { id: 'COD', label: 'Cash on Delivery (COD)', desc: 'Pay cash to driver upon arrival', available: true },
                  { id: 'UPI', label: 'Instant Google Pay / PhonePe UPI', desc: 'Fast & 100% Instant Approval', available: false },
                  { id: 'CARD', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', available: false }
                ].map(pm => {
                  const isSelected = paymentMethod === pm.id;
                  const isComingSoon = !pm.available;

                  return (
                    <div
                      key={pm.id}
                      onClick={() => {
                        if (isComingSoon) {
                          toast.info('Feature will be coming soon');
                        } else {
                          setPaymentMethod(pm.id);
                        }
                      }}
                      className={`flex items-start justify-between p-4 rounded-2xl border transition select-none ${
                        isComingSoon
                          ? 'bg-slate-50/80 border-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-100/50'
                          : isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md cursor-pointer'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={isSelected}
                          disabled={isComingSoon}
                          onChange={() => {
                            if (!isComingSoon) setPaymentMethod(pm.id);
                          }}
                          className="mt-1"
                        />
                        <div>
                          <span className={`text-xs font-extrabold block ${isComingSoon ? 'text-slate-600 font-bold' : ''}`}>
                            {pm.label}
                          </span>
                          <span className={`text-[11px] font-medium ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {pm.desc}
                          </span>
                        </div>
                      </div>

                      {isComingSoon && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold border border-amber-300 flex-shrink-0">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Order Summary & Place Order CTA */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              {isFreshMode ? 'Fresh Mandi Basket Items' : 'Cravings Order Summary'}
            </h3>

            {/* Mode Specific Channel Notes */}
            <div className={`p-3 rounded-2xl text-xs space-y-1 ${
              isFreshMode ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                {isFreshMode ? <Scale className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                <span>{isFreshMode ? 'Direct Wholesale Mandi Supply' : 'Kitchen Fresh Preparation'}</span>
              </div>
              <p className="text-[11px] font-medium opacity-90">
                {isFreshMode 
                  ? 'All produce is weighed and packed directly from local Mandi vendors.'
                  : 'Prepared hot & fresh on demand from restaurant kitchen.'}
              </p>
            </div>

            {/* Itemized List */}
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
              {cart.items && cart.items.length > 0 ? (
                cart.items.map((item) => (
                  <div key={item.id || item._id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-extrabold text-slate-800">{item.name}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Qty: {item.quantity}</span>
                        {item.selectedWeight && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-[10px]">
                            {item.selectedWeight}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-extrabold text-slate-900">₹{item.price * item.quantity}</span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs font-bold text-slate-400">
                  No items in this shopping basket
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Subtotal ({cart.items?.length || 0} items)</span>
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
                disabled={loading || !cart.items || cart.items.length === 0}
                className={`w-full py-4 rounded-2xl text-xs font-extrabold text-white shadow-lg transition flex items-center justify-center gap-2 ${
                  isFreshMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                } ${(!cart.items || cart.items.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm {isFreshMode ? 'Fresh Mandi' : 'Cravings'} Order (₹{grandTotal})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Explore More Deals Redirect Link (Tactical Lure to add more items) */}
              {(() => {
                const targetShopId = cart.restaurantId || cart.vendorId || cart.restaurant?.id || cart.restaurant?._id;
                const targetUrl = targetShopId ? `/restaurant/${targetShopId}` : '/home';
                return (
                  <Link
                    to={targetUrl}
                    className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-rose-300 hover:border-rose-400 bg-rose-50/80 hover:bg-rose-100/90 text-rose-700 text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-sm text-center"
                  >
                    <Tag className="w-4 h-4 text-rose-600 animate-pulse" />
                    <span>Explore more deals in this store before ordering!</span>
                  </Link>
                );
              })()}

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-extrabold pt-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Instant Order Dispatch Guaranteed</span>
              </div>
            </div>

          </div>

        </form>

      </main>

      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelectAddress={(selected) => selectSavedAddress(selected)}
      />
    </div>
  );
}
