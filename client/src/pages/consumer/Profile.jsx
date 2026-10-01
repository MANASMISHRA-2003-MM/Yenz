import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import FreshCartFooter from '../../components/FreshCartFooter';
import MobileBottomNavigation from '../../components/MobileBottomNavigation';
import AddressModal, { getSavedAddresses, saveAddresses } from '../../components/AddressModal';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, Receipt, Shield, Store, Bike, LogOut, ArrowRight, LayoutGrid, MapPin, Plus, Trash2, Home, Briefcase, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { getUniversalProfileIcon } from '../../utils/imageUtils';
import { reverseGeocode } from '../../utils/reverseGeocode';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState(getSavedAddresses());
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [locating, setLocating] = useState(false);

  const [newAddr, setNewAddr] = useState({
    title: 'Home',
    street: '',
    city: 'Faridabad',
    state: 'Haryana',
    pincode: '121009',
    phone: user?.phone || '+91 98765 43210'
  });

  useEffect(() => {
    const handleUpdate = () => setAddresses(getSavedAddresses());
    window.addEventListener('krawing_addresses_updated', handleUpdate);
    window.addEventListener('krawing_location_changed', handleUpdate);
    return () => {
      window.removeEventListener('krawing_addresses_updated', handleUpdate);
      window.removeEventListener('krawing_location_changed', handleUpdate);
    };
  }, []);

  if (!user) {
    navigate('/login');
    return null;
  }

  const role = (user.role || 'customer').toLowerCase();

  const handleLogout = () => {
    logout();
    toast.success('Successfully logged out');
    navigate('/login');
  };

  const Icon = role === 'admin' ? Shield : role === 'vendor' ? Store : role === 'delivery_partner' ? Bike : User;

  const handleSetDefault = (id) => {
    const updated = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(updated);
    saveAddresses(updated);
    toast.success('Default address updated');
  };

  const handleDelete = (id) => {
    const updated = addresses.filter(a => a.id !== id);
    setAddresses(updated);
    saveAddresses(updated);
    toast.success('Address removed');
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newAddr.street || !newAddr.city || !newAddr.pincode) {
      toast.error('Please enter street, city and pincode');
      return;
    }
    const created = {
      id: `addr-${Date.now()}`,
      ...newAddr,
      isDefault: addresses.length === 0
    };
    const updated = [...addresses, created];
    setAddresses(updated);
    saveAddresses(updated);
    setShowAddForm(false);
    toast.success('New address added successfully');
    setNewAddr({
      title: 'Home',
      street: '',
      city: 'Faridabad',
      state: 'Haryana',
      pincode: '121009',
      phone: user?.phone || '+91 98765 43210'
    });
  };

  const handleFetchLiveGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const geo = await reverseGeocode(latitude, longitude);
          const gpsAddress = {
            id: 'addr-live-current',
            title: 'Live Location 📍',
            street: geo.street,
            city: geo.city,
            state: geo.state,
            pincode: geo.pincode,
            latitude,
            longitude,
            phone: user?.phone || '+91 98765 43210',
            isDefault: true
          };
          const nonLive = addresses.filter(a => !(a.id?.startsWith('addr-live') || a.title?.includes('Live Location')));
          const updated = [gpsAddress, ...nonLive.map(a => ({ ...a, isDefault: false }))];
          setAddresses(updated);
          saveAddresses(updated);
          localStorage.setItem('krawing_user_address', JSON.stringify(gpsAddress));
          localStorage.setItem('krawing_selected_address', JSON.stringify(gpsAddress));
          window.dispatchEvent(new Event('krawing_location_changed'));
          toast.success('Live GPS location detected and saved');
        } catch {
          toast.error('Could not determine exact address for live location.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        toast.error(`Location error: ${err.message}`);
      },
      { timeout: 15000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="fc-page pb-24">
      <Navbar />
      <main className="fc-container py-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Header Card */}
          <section className="fc-card p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <img
                src={getUniversalProfileIcon(user.avatar)}
                alt={user.name || 'Profile'}
                className="w-20 h-20 rounded-md object-cover border border-gray-200"
              />
              <div className="text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                  <Icon className="w-3.5 h-3.5" />
                  {role.replace('_', ' ')} account
                </div>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">{user.name || user.fullName}</h1>
                <p className="mt-1 text-sm text-gray-500">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="fc-btn bg-red-50 text-red-600 border-red-200 text-xs">
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </section>

          {/* Personal Info Card */}
          <section className="fc-card p-6">
            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-base font-semibold text-gray-800">Personal information</h2>
              <p className="text-xs text-gray-500 mt-1">Account details retained from your user profile.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div className="p-4 rounded-md border border-gray-200 bg-gray-50 flex gap-3">
                <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                <div>
                  <div className="fc-eyebrow">Email</div>
                  <div className="text-sm font-semibold text-gray-800 mt-1 break-all">{user.email}</div>
                </div>
              </div>
              <div className="p-4 rounded-md border border-gray-200 bg-gray-50 flex gap-3">
                <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
                <div>
                  <div className="fc-eyebrow">Phone</div>
                  <div className="text-sm font-semibold text-gray-800 mt-1">{user.phone || 'Not provided'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Saved Addresses Section */}
          <section className="fc-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-600" /> Saved Delivery Addresses
                </h2>
                <p className="text-xs text-gray-500 mt-1">Manage your delivery locations for quick checkout.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFetchLiveGPS}
                  disabled={locating}
                  className="fc-btn text-xs bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                >
                  <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  {locating ? 'Locating...' : 'Use Live GPS'}
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="fc-btn bg-gray-900 text-white text-xs flex items-center gap-1.5 hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4" /> Add Address
                </button>
              </div>
            </div>

            {/* Add Address Form */}
            {showAddForm && (
              <form onSubmit={handleAddSubmit} className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-900">Add New Address</h3>
                  <button type="button" onClick={() => setShowAddForm(false)} className="text-xs text-gray-400 hover:text-gray-600">
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  {['Home', 'Work', 'Other'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewAddr({ ...newAddr, title: type })}
                      className={`px-3 py-1.5 rounded-md border text-xs font-semibold ${
                        newAddr.title === type ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Street / Apartment / Area *</label>
                  <input
                    className="fc-input text-xs"
                    required
                    value={newAddr.street}
                    onChange={e => setNewAddr({ ...newAddr, street: e.target.value })}
                    placeholder="e.g. Flat 101, Sunshine Heights, Sector 15"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">City *</label>
                    <input
                      className="fc-input text-xs"
                      required
                      value={newAddr.city}
                      onChange={e => setNewAddr({ ...newAddr, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Pincode *</label>
                    <input
                      className="fc-input text-xs"
                      required
                      value={newAddr.pincode}
                      onChange={e => setNewAddr({ ...newAddr, pincode: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone</label>
                  <input
                    className="fc-input text-xs"
                    value={newAddr.phone}
                    onChange={e => setNewAddr({ ...newAddr, phone: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="fc-btn text-white bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-xs px-4">
                    Save Address
                  </button>
                </div>
              </form>
            )}

            {/* List of Saved Addresses */}
            <div className="mt-4 space-y-3">
              {addresses.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <MapPin className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="font-semibold text-gray-700">No saved addresses</p>
                  <p className="text-xs text-gray-400 mt-1">Add a delivery address to speed up checkout.</p>
                </div>
              ) : (
                addresses.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 transition ${
                      item.isDefault ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-700">
                          {item.title?.toLowerCase().includes('home') ? (
                            <Home className="w-4 h-4" />
                          ) : item.title?.toLowerCase().includes('work') ? (
                            <Briefcase className="w-4 h-4" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-gray-900">{item.title || 'Saved Location'}</span>
                            {item.isDefault && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-600 text-white">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 break-words">
                            {item.street || item.addressLine || item.area}, {item.city} - {item.pincode}
                          </p>
                          {item.phone && <p className="text-xs text-gray-400 mt-1">📞 {item.phone}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!item.isDefault && (
                          <button
                            onClick={() => handleSetDefault(item.id)}
                            className="text-xs font-semibold text-gray-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-gray-100"
                          >
                            Set as default
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          title="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Quick Links Card */}
          <section className="fc-card p-6">
            <div className="border-b border-gray-200 pb-3">
              <h2 className="text-base font-semibold text-gray-800">Quick links</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  className="p-4 border border-gray-200 rounded-md flex items-center justify-between hover:border-green-500 hover:bg-gray-50"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                    <LayoutGrid className="w-5 h-5 text-purple-600" />
                    Admin dashboard
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </Link>
              )}
              {role === 'vendor' && (
                <Link
                  to="/vendor/dashboard"
                  className="p-4 border border-gray-200 rounded-md flex items-center justify-between hover:border-green-500 hover:bg-gray-50"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                    <Store className="w-5 h-5 text-amber-600" />
                    Vendor dashboard
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </Link>
              )}
              {role === 'delivery_partner' && (
                <Link
                  to="/delivery/dashboard"
                  className="p-4 border border-gray-200 rounded-md flex items-center justify-between hover:border-green-500 hover:bg-gray-50"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                    <Bike className="w-5 h-5 text-cyan-600" />
                    Delivery dashboard
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </Link>
              )}
              <Link
                to="/orders"
                className="p-4 border border-gray-200 rounded-md flex items-center justify-between hover:border-green-500 hover:bg-gray-50"
              >
                <span className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                  <Receipt className="w-5 h-5 text-green-600" />
                  My orders
                </span>
                <ArrowRight className="w-4 h-4 text-gray-500" />
              </Link>
            </div>
          </section>
        </div>
        <FreshCartFooter />
      </main>
      <MobileBottomNavigation />
      {showAddressModal && (
        <AddressModal
          isOpen={showAddressModal}
          onClose={() => setShowAddressModal(false)}
          onSelectAddress={() => {
            setShowAddressModal(false);
            setAddresses(getSavedAddresses());
          }}
        />
      )}
    </div>
  );
}
