import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useMode } from '../../context/ModeContext';
import Navbar from '../../components/Navbar';
import AddressModal, { getSavedAddresses } from '../../components/AddressModal';
import FreshCartFooter from '../../components/FreshCartFooter';
import { MapPin, CreditCard, ShieldCheck, CheckCircle2, ArrowRight, Navigation, Plus, Minus, Trash2, Bookmark, Store, Clock, Scale, Tag, ShoppingBag, AlertTriangle, Lock, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage({ modeOverride }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { carts, cravingsCart, freshCart, fetchCart, updateQuantity, clearCart } = useCart();
  const { isFresh: defaultIsFresh } = useMode();

  // Determine current mode from prop, pathname or active global mode
  let activeMode = modeOverride;
  if (!activeMode) {
    if (location.pathname.includes('/checkout/fresh-mandi')) {
      activeMode = 'FRESH_MANDI';
    } else if (location.pathname.includes('/checkout/craving') || location.pathname.includes('/checkout/cravings')) {
      activeMode = 'CRAVINGS';
    } else {
      activeMode = defaultIsFresh ? 'FRESH_MANDI' : 'CRAVINGS';
    }
  }

  const isFreshMode = activeMode === 'FRESH_MANDI';
  const cart = (isFreshMode ? (freshCart || carts?.FRESH_MANDI) : (cravingsCart || carts?.CRAVINGS)) || { items: [] };

  const subtotal = cart.items
    ? cart.items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0)
    : 0;

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState(getSavedAddresses());
  const [locating, setLocating] = useState(false);

  // Address fields with safe fallbacks (never null)
  const [address, setAddress] = useState(() => {
    try {
      const selectedRaw = localStorage.getItem('krawing_selected_address') || localStorage.getItem('krawing_user_address');
      if (selectedRaw) {
        const parsed = JSON.parse(selectedRaw);
        if (parsed && (parsed.street || parsed.latitude || parsed.city)) {
          const userCoordsRaw = localStorage.getItem('krawing_user_coords');
          let savedLat = parsed.latitude || parsed.lat;
          let savedLng = parsed.longitude || parsed.lng;
          if ((savedLat === undefined || savedLng === undefined || savedLat === null || savedLng === null) && userCoordsRaw) {
            const parsedCoords = JSON.parse(userCoordsRaw);
            savedLat = parsedCoords.lat || parsedCoords.latitude;
            savedLng = parsedCoords.lng || parsedCoords.longitude;
          }
          return {
            title: parsed.title || 'Delivery Address',
            street: parsed.street || parsed.addressLine || 'Sector 15, Main Market Road',
            city: parsed.city || 'Faridabad',
            state: parsed.state || 'Haryana',
            pincode: parsed.pincode || '121009',
            latitude: (savedLat && !isNaN(Number(savedLat))) ? Number(savedLat) : 28.4866,
            longitude: (savedLng && !isNaN(Number(savedLng))) ? Number(savedLng) : 77.2918,
            lat: (savedLat && !isNaN(Number(savedLat))) ? Number(savedLat) : 28.4866,
            lng: (savedLng && !isNaN(Number(savedLng))) ? Number(savedLng) : 77.2918,
            phone: parsed.phone || '+91 98765 43210'
          };
        }
      }
    } catch (e) {}

    const saved = getSavedAddresses();
    const defaultAddr = saved && saved.length > 0 ? (saved.find(a => a.isDefault) || saved[0]) : null;
    if (defaultAddr) {
      return {
        title: defaultAddr.title || 'Home',
        street: defaultAddr.street || defaultAddr.addressLine || 'Sector 15, Main Market Road',
        city: defaultAddr.city || 'Faridabad',
        state: defaultAddr.state || 'Haryana',
        pincode: defaultAddr.pincode || '121009',
        latitude: defaultAddr.latitude ? Number(defaultAddr.latitude) : 28.4866,
        longitude: defaultAddr.longitude ? Number(defaultAddr.longitude) : 77.2918,
        lat: defaultAddr.latitude ? Number(defaultAddr.latitude) : 28.4866,
        lng: defaultAddr.longitude ? Number(defaultAddr.longitude) : 77.2918,
        phone: defaultAddr.phone || '+91 98765 43210'
      };
    }
    return {
      title: 'Home',
      street: 'Sector 15, Main Market Road',
      city: 'Faridabad',
      state: 'Haryana',
      pincode: '121009',
      latitude: 28.4866,
      longitude: 77.2918,
      lat: 28.4866,
      lng: 77.2918,
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
    if (!savedItem) return;
    const latVal = savedItem.latitude || savedItem.lat || 28.4866;
    const lngVal = savedItem.longitude || savedItem.lng || 77.2918;
    setAddress({
      title: savedItem.title || 'Saved Location',
      street: savedItem.street || savedItem.addressLine || 'Selected Location',
      city: savedItem.city || 'Faridabad',
      state: savedItem.state || 'Haryana',
      pincode: savedItem.pincode || '121009',
      latitude: Number(latVal),
      longitude: Number(lngVal),
      lat: Number(latVal),
      lng: Number(lngVal),
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
          let state = 'Haryana';

          if (data && data.address) {
            const a = data.address;
            const sub = a.suburb || a.neighbourhood || a.residential || a.road || a.subdistrict || '';
            const house = a.house_number || a.building || '';
            street = [house, sub, a.amenity].filter(Boolean).join(', ') || data.display_name.split(',')[0];
            city = a.city || a.town || a.district || a.county || '';
            state = a.state || '';
            pincode = a.postcode || '';
          } else {
            street = `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
            city = '';
            state = '';
            pincode = '';
          }

          const updatedGpsAddr = {
            title: 'Live GPS Location 📍',
            street,
            city,
            state,
            pincode,
            latitude,
            longitude,
            lat: latitude,
            lng: longitude
          };
          setAddress(prev => ({ ...prev, ...updatedGpsAddr }));
          try {
            localStorage.setItem('krawing_user_coords', JSON.stringify({ lat: latitude, lng: longitude }));
            localStorage.setItem('krawing_user_address', JSON.stringify(updatedGpsAddr));
            localStorage.setItem('krawing_selected_address', JSON.stringify(updatedGpsAddr));
          } catch (e) {}
          toast.success('Updated address with live GPS coordinates!');
        } catch (err) {
          console.error('Error reverse geocoding location:', err);
          const fallbackGpsAddr = {
            title: 'Live GPS Location 📍',
            street: `Live GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            city: address.city || '',
            state: address.state || '',
            pincode: address.pincode || '',
            latitude,
            longitude,
            lat: latitude,
            lng: longitude
          };
          setAddress(prev => ({ ...prev, ...fallbackGpsAddr }));
          try {
            localStorage.setItem('krawing_user_coords', JSON.stringify({ lat: latitude, lng: longitude }));
            localStorage.setItem('krawing_user_address', JSON.stringify(fallbackGpsAddr));
            localStorage.setItem('krawing_selected_address', JSON.stringify(fallbackGpsAddr));
          } catch (e) {}
          toast.success('Live GPS coordinates captured!');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast.error(`Location permission error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const deliveryFee = cart.restaurant?.deliveryFee || 35;
  const tax = Math.round(subtotal * 0.05);
  const discount = cart.discount || 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee + tax - discount);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmCode, setConfirmCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [userTypedCode, setUserTypedCode] = useState('');

  const generateNewConfirmCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setConfirmCode(code);
    setUserTypedCode('');
  };

  const handleOpenConfirmModal = (e) => {
    e.preventDefault();
    if (!cart.items || cart.items.length === 0) {
      toast.error(`Your ${isFreshMode ? 'Fresh Mandi' : 'Cravings'} basket is empty!`);
      return;
    }
    if (!address.street || !address.city) {
      toast.error('Please specify a valid delivery address with street and city.');
      return;
    }
    generateNewConfirmCode();
    setShowConfirmModal(true);
  };

  const executePlaceOrder = async () => {
    if (userTypedCode.trim() !== confirmCode) {
      toast.error(`Please type "${confirmCode}" correctly to confirm your order.`);
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
        setShowConfirmModal(false);
        toast.success('Order confirmed & placed! Delivery address locked.');
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
    <div className="min-h-screen bg-white text-gray-800">
      <Navbar />
      <main className="fc-container py-7 sm:py-10 pb-28">
        <div className="fc-page-heading">
          <div>
            <p className={`fc-eyebrow ${isFreshMode ? 'fc-eyebrow-fresh' : 'fc-eyebrow-cravings'}`}>
              {isFreshMode ? 'Fresh Mandi checkout' : 'Cravings checkout'}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Checkout</h1>
            <p className="mt-1 text-sm text-gray-500">Choose your delivery address, payment method and review your basket.</p>
          </div>
          {cart.restaurant && (
            <div className="fc-card px-4 py-3 flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Store className="w-5 h-5 text-gray-500" /></div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide font-bold text-gray-400">Store</div>
                <div className="text-sm font-semibold text-gray-900 truncate">{cart.restaurant.name}</div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleOpenConfirmModal} className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-7 items-start">
          <div className="space-y-5">
            <section className="fc-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2"><MapPin className="w-5 h-5" style={{ color: isFreshMode ? 'var(--fc-fresh)' : 'var(--fc-red)' }} /> Delivery address</h2>
                  <p className="text-xs text-gray-500 mt-1">Your selected address is used for dispatch and navigation.</p>
                </div>
                <button type="button" onClick={() => setShowAddressModal(true)} className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline underline-offset-2">
                  Manage saved addresses
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {savedAddresses.map(sa => (
                  <button key={sa.id} type="button" onClick={() => selectSavedAddress(sa)} className={`px-3 py-2 rounded-md border text-xs font-semibold transition ${address.street === sa.street ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'}`}>
                    {sa.title}<span className="ml-1 text-[10px] opacity-60">• {sa.city}</span>
                  </button>
                ))}
                <button type="button" onClick={handleFetchLiveGps} disabled={locating} className="px-3 py-2 rounded-md border text-xs font-semibold" style={{ borderColor: 'rgba(22,138,91,.3)', color: 'var(--fc-fresh)', background: 'rgba(22,138,91,.06)' }}>
                  <span className="inline-flex items-center gap-1.5"><Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />{locating ? 'Locating…' : 'Use live GPS'}</span>
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <label className="sm:col-span-2"><span className="fc-label">Street / House / Apartment</span><input className="fc-input" value={address.street} onChange={e => setAddress({ ...address, street: e.target.value })} required /></label>
                <label><span className="fc-label">City</span><input className="fc-input" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} required /></label>
                <label><span className="fc-label">State</span><input className="fc-input" value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} /></label>
                <label><span className="fc-label">Pincode</span><input className="fc-input" value={address.pincode} onChange={e => setAddress({ ...address, pincode: e.target.value })} required /></label>
                <label><span className="fc-label">Contact phone</span><input className="fc-input" value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} required /></label>
                <label className="sm:col-span-2"><span className="fc-label">Delivery instructions <span className="text-gray-400 font-normal">(optional)</span></span><input className="fc-input" value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} placeholder="Leave at gate, ring bell, etc." /></label>
              </div>
            </section>

            <section className="fc-card p-5 sm:p-6">
              <div className="pb-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payment method</h2>
                <p className="text-xs text-gray-500 mt-1">Available methods are controlled by the existing Yenz payment flow.</p>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { id: 'COD', label: 'Cash on Delivery', desc: 'Pay the delivery partner on arrival', available: true },
                  { id: 'UPI', label: 'UPI', desc: 'Google Pay / PhonePe', available: false },
                  { id: 'CARD', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', available: false }
                ].map(pm => {
                  const selected = paymentMethod === pm.id;
                  return (
                    <button type="button" key={pm.id} onClick={() => pm.available ? setPaymentMethod(pm.id) : toast.info('Feature will be coming soon')} className={`w-full text-left p-4 rounded-lg border transition ${selected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400'} ${!pm.available ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? 'border-white' : 'border-gray-400'}`}><span className={`w-2 h-2 rounded-full ${selected ? 'bg-white' : 'bg-transparent'}`} /></span>
                          <div><div className="text-sm font-semibold">{pm.label}</div><div className={`text-xs mt-0.5 ${selected ? 'text-gray-300' : 'text-gray-500'}`}>{pm.desc}</div></div>
                        </div>
                        {!pm.available && <span className="text-[10px] font-bold uppercase tracking-wide">Coming soon</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-28">
            <section className="fc-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200">
                <div><h2 className="font-semibold text-gray-900">Order summary</h2><p className="text-xs text-gray-500 mt-1">{cart.items?.length || 0} line items</p></div>
                {cart.items?.length > 0 && <button type="button" onClick={() => clearCart(activeMode)} className="text-xs font-semibold text-gray-500 hover:text-red-600">Clear</button>}
              </div>
              <div className="divide-y divide-gray-100 max-h-72 overflow-auto">
                {cart.items?.length ? cart.items.map(item => {
                  const targetFoodId = item.foodId || item.productId || item.id || item._id;
                  const itemTotal = (item.price || 0) * item.quantity;
                  return (
                    <div key={item.id || item._id} className="py-3 flex gap-3">
                      <div className="w-11 h-11 rounded-md overflow-hidden bg-gray-100 shrink-0"><img src={item.image || item.imageUrl || '/favicon.png'} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.src = '/favicon.png'; }} /></div>
                      <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-gray-900 truncate">{item.name}</div><div className="text-xs text-gray-500 mt-0.5">₹{item.price}{item.selectedWeight ? ` • ${item.selectedWeight}` : ''}</div>
                        <div className="mt-2 inline-flex items-center border border-gray-300 rounded-md overflow-hidden"><button type="button" className="px-2 py-1 hover:bg-gray-50" onClick={() => updateQuantity(targetFoodId, item.quantity - 1, item.selectedWeight, activeMode)}><Minus className="w-3 h-3" /></button><span className="px-2 text-xs font-semibold">{item.quantity}</span><button type="button" className="px-2 py-1 hover:bg-gray-50" onClick={() => updateQuantity(targetFoodId, item.quantity + 1, item.selectedWeight, activeMode)}><Plus className="w-3 h-3" /></button></div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">₹{itemTotal}</div>
                      <button type="button" onClick={() => updateQuantity(targetFoodId, 0, item.selectedWeight, activeMode)} className="self-start text-gray-400 hover:text-red-600" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  );
                }) : <div className="py-8 text-center"><ShoppingBag className="w-8 h-8 text-gray-300 mx-auto" /><p className="text-sm font-semibold text-gray-600 mt-2">Your basket is empty</p><Link to="/home" className="text-xs mt-2 inline-block underline">Continue shopping</Link></div>}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{subtotal}</span></div>
                <div className="flex justify-between text-gray-500"><span>Delivery fee</span><span>₹{deliveryFee}</span></div>
                <div className="flex justify-between text-gray-500"><span>Taxes & packing</span><span>₹{tax}</span></div>
                {discount > 0 && <div className="flex justify-between" style={{ color: 'var(--fc-fresh)' }}><span>Discount</span><span>-₹{discount}</span></div>}
                <div className="pt-3 mt-2 border-t border-gray-200 flex items-center justify-between"><span className="font-semibold text-gray-900">Total</span><span className="text-2xl font-bold text-gray-900">₹{grandTotal}</span></div>
              </div>
              <button type="submit" disabled={loading || !cart.items?.length} className="w-full mt-5 px-4 py-3 rounded-md text-sm font-semibold text-white disabled:opacity-50" style={{ background: isFreshMode ? 'var(--fc-fresh)' : 'var(--fc-red)' }}>
                {loading ? 'Processing…' : `Place ${isFreshMode ? 'Fresh Mandi' : 'Cravings'} order`}
              </button>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500"><ShieldCheck className="w-4 h-4" /> Secure order confirmation</div>
            </section>
          </aside>
        </form>
      </main>

      <FreshCartFooter />
      <AddressModal isOpen={showAddressModal} onClose={() => setShowAddressModal(false)} onSelectAddress={selected => selectSavedAddress(selected)} />

      {showConfirmModal && (
        <div className="fixed inset-0 z-[10000] bg-gray-900/50 p-4 flex items-center justify-center">
          <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md shadow-2xl p-6 relative">
            <button type="button" onClick={() => setShowConfirmModal(false)} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
            <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(229,27,75,.08)', color: 'var(--fc-red)' }}><AlertTriangle className="w-5 h-5" /></div><div><h3 className="font-semibold text-gray-900">Verify your order</h3><p className="text-xs text-gray-500 mt-1">Confirm the delivery details before placing it.</p></div></div>
            <div className="mt-5 p-4 rounded-md bg-gray-50 border border-gray-200"><div className="flex justify-between gap-3"><div className="min-w-0"><div className="text-xs font-bold uppercase tracking-wide text-gray-400">{address.title || 'Delivery address'}</div><div className="mt-1 text-sm font-medium text-gray-900">{address.street}, {address.city}, {address.state} - {address.pincode}</div><div className="mt-1 text-xs text-gray-500">{address.phone}</div></div><button type="button" onClick={() => { setShowConfirmModal(false); setShowAddressModal(true); }} className="text-xs font-semibold underline shrink-0">Change</button></div></div>
            <div className="mt-4 p-4 rounded-md bg-gray-900 text-white"><div className="flex items-center justify-between"><span className="text-xs text-gray-300">Enter the confirmation code</span><button type="button" onClick={generateNewConfirmCode} className="text-xs text-gray-300 hover:text-white inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" />New code</button></div><div className="mt-3 grid grid-cols-[110px_1fr] gap-3"><div className="rounded-md border border-white/20 bg-white/10 flex items-center justify-center font-mono text-xl font-bold tracking-widest text-amber-300">{confirmCode}</div><input className="fc-input !bg-white !text-gray-900" autoFocus maxLength={4} value={userTypedCode} onChange={e => setUserTypedCode(e.target.value.replace(/\D/g, ''))} placeholder="Enter code" /></div></div>
            <div className="mt-5 flex gap-3"><button type="button" onClick={() => setShowConfirmModal(false)} className="fc-btn-secondary flex-1">Cancel</button><button type="button" onClick={executePlaceOrder} disabled={loading || userTypedCode.trim() !== confirmCode} className="flex-1 px-4 py-2.5 rounded-md font-semibold text-white disabled:opacity-50" style={{ background: isFreshMode ? 'var(--fc-fresh)' : 'var(--fc-red)' }}>{loading ? 'Placing…' : `Confirm ₹${grandTotal}`}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
