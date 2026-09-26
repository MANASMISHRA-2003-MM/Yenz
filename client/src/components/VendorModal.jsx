import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Upload, X, Store } from 'lucide-react';
import { toast } from 'sonner';

export default function VendorModal({ isOpen, onClose, vendor, defaultType = 'CRAVINGS', onSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    vendorType: defaultType,
    phone: '',
    email: '',
    address: '',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    deliveryFee: '30',
    deliveryTime: '25-35 min',
    image: '',
    bannerImage: '',
    status: 'open'
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name || '',
        vendorType: vendor.vendorType || defaultType,
        phone: vendor.phone || '',
        email: vendor.email || '',
        address: vendor.address || '',
        city: vendor.city || 'Noida',
        state: vendor.state || 'Uttar Pradesh',
        pincode: vendor.pincode || '201301',
        deliveryFee: vendor.deliveryFee ? String(vendor.deliveryFee) : '30',
        deliveryTime: vendor.deliveryTime || '25-35 min',
        image: vendor.image || '',
        bannerImage: vendor.bannerImage || '',
        status: vendor.status || 'open'
      });
    } else {
      setFormData({
        name: '',
        vendorType: defaultType,
        phone: '',
        email: '',
        address: '',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        deliveryFee: '30',
        deliveryTime: '25-35 min',
        image: '',
        bannerImage: '',
        status: 'open'
      });
    }
  }, [vendor, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        if (field === 'image') setUploadingImage(true);
        else setUploadingBanner(true);

        const base64 = reader.result;
        const res = await API.post('/admin/upload-image', { image: base64, folder: `krawing/vendors/${field}s` });
        if (res.data.success) {
          setFormData(prev => ({ ...prev, [field]: res.data.secureUrl }));
          toast.success(`${field === 'image' ? 'Store Logo' : 'Banner'} uploaded to Cloudinary`);
        }
      } catch (err) {
        toast.error('Image upload failed');
      } finally {
        setUploadingImage(false);
        setUploadingBanner(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Store name is required');
      return;
    }

    try {
      let res;
      if (vendor?._id || vendor?.id) {
        res = await API.put(`/restaurants/${vendor._id || vendor.id}`, formData);
      } else {
        res = await API.post('/restaurants', formData);
      }

      if (res.data.success) {
        toast.success(vendor ? 'Store updated' : 'Store created');
        onSaved();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save store');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                {vendor ? 'Manage Store Profile' : (defaultType === 'FRESH' ? 'Add Fresh Mandi Vendor' : 'Add Cravings Restaurant')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">PostgreSQL store details & Cloudinary media links</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-700">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Store Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Royal Punjab Dhaba"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Operating Mode</label>
              <select
                value={formData.vendorType}
                onChange={e => setFormData({ ...formData, vendorType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              >
                <option value="CRAVINGS">CRAVINGS (Food Restaurant)</option>
                <option value="FRESH">FRESH MANDI (Groceries & Produce)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Contact Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="store@krawing.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block mb-1 font-extrabold text-slate-900">Address / Location</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Sector 62, Main Market"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>
            <div>
              <label className="block mb-1 font-extrabold text-slate-900">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="Noida"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Delivery Fee (₹)</label>
              <input
                type="number"
                value={formData.deliveryFee}
                onChange={e => setFormData({ ...formData, deliveryFee: e.target.value })}
                placeholder="30"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Est. Time</label>
              <input
                type="text"
                value={formData.deliveryTime}
                onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
                placeholder="25-35 min"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              >
                <option value="open">OPEN</option>
                <option value="closed">CLOSED</option>
              </select>
            </div>
          </div>

          {/* Cloudinary Logo & Banner Uploads */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-extrabold text-slate-900 mb-1">Cloudinary Store Logo URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                />
                <label className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'image')} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <label className="block font-extrabold text-slate-900 mb-1">Cloudinary Banner Image URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.bannerImage}
                  onChange={e => setFormData({ ...formData, bannerImage: e.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono"
                />
                <label className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-extrabold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'bannerImage')} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-md transition">
              Save Store
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
