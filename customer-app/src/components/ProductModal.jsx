import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { Upload, Plus, Trash2, X, Image as ImageIcon, Camera } from 'lucide-react';
import CameraCaptureModal from './CameraCaptureModal';
import { toast } from 'sonner';

export default function ProductModal({ isOpen, onClose, product, vendorId, vendorType = 'CRAVINGS', categories = [], onSaved }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    categoryId: '',
    productType: vendorType === 'FRESH' ? 'VEGETABLE' : 'FOOD',
    isVeg: true,
    isAvailable: true,
    prepTime: '15-20 min',
    unit: vendorType === 'FRESH' ? 'kg' : 'portion',
    image: '',
    imagePublicId: ''
  });

  const [variants, setVariants] = useState([]);
  const [newVariant, setNewVariant] = useState({ name: '', quantity: '1', unit: 'KG', price: '', discountPrice: '', stockQuantity: '100' });
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price ? String(product.price) : '',
        discountPrice: product.discountPrice ? String(product.discountPrice) : '',
        categoryId: product.categoryId || (categories[0]?.id || ''),
        productType: product.productType || (vendorType === 'FRESH' ? 'VEGETABLE' : 'FOOD'),
        isVeg: product.isVeg !== undefined ? product.isVeg : true,
        isAvailable: product.isAvailable !== undefined ? product.isAvailable : true,
        prepTime: product.prepTime || '15-20 min',
        unit: product.unit || (vendorType === 'FRESH' ? 'kg' : 'portion'),
        image: product.image || '',
        imagePublicId: product.imagePublicId || ''
      });
      setVariants(product.variants || []);
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        discountPrice: '',
        categoryId: categories[0]?.id || '',
        productType: vendorType === 'FRESH' ? 'VEGETABLE' : 'FOOD',
        isVeg: true,
        isAvailable: true,
        prepTime: '15-20 min',
        unit: vendorType === 'FRESH' ? 'kg' : 'portion',
        image: '',
        imagePublicId: ''
      });
      setVariants([]);
    }
  }, [product, vendorType, categories, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file too large. Please select an image under 5MB.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress & scale to max 1024x1024 for fast database storage
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1024;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setFormData(prev => ({ ...prev, image: compressedDataUrl, imagePublicId: null }));
        toast.success('📸 Product photo uploaded successfully!');
        setUploading(false);
      };
      img.onerror = () => {
        toast.error('Invalid image file');
        setUploading(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAddVariant = () => {
    if (!newVariant.price || !newVariant.quantity) {
      toast.error('Please specify variant quantity and price');
      return;
    }
    const varName = newVariant.name || `${newVariant.quantity} ${newVariant.unit}`;
    setVariants(prev => [...prev, { ...newVariant, name: varName }]);
    setNewVariant({ name: '', quantity: '1', unit: 'KG', price: '', discountPrice: '', stockQuantity: '100' });
  };

  const handleRemoveVariant = (index) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      toast.error('Product name and base price are required');
      return;
    }

    try {
      const payload = {
        ...formData,
        vendorId,
        price: Number(formData.price),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : null,
        variants
      };

      let res;
      if (product?._id || product?.id) {
        res = await API.put(`/foods/${product._id || product.id}`, payload);
      } else {
        res = await API.post('/foods', payload);
      }

      if (res.data.success) {
        toast.success(product ? 'Product updated successfully' : 'Product created successfully');
        onSaved();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">
              {product ? 'Edit Product' : (vendorType === 'FRESH' ? 'Create Fresh Produce Product' : 'Create Food Item')}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Item details and product media configuration</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-700">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={vendorType === 'FRESH' ? 'e.g. Fresh Red Tomatoes' : 'e.g. Butter Chicken'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Category</label>
              <select
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              >
                {categories.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-extrabold text-slate-900">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of taste, ingredients, or source..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Base Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="220"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Discount Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.discountPrice}
                onChange={e => setFormData({ ...formData, discountPrice: e.target.value })}
                placeholder="199"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Product Type</label>
              <select
                value={formData.productType}
                onChange={e => setFormData({ ...formData, productType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              >
                <option value="FOOD">FOOD (Prepared)</option>
                <option value="VEGETABLE">VEGETABLE</option>
                <option value="FRUIT">FRUIT</option>
                <option value="GROCERY">GROCERY</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-extrabold text-slate-900">Prep / Delivery Time</label>
              <input
                type="text"
                value={formData.prepTime}
                onChange={e => setFormData({ ...formData, prepTime: e.target.value })}
                placeholder="15-20 min"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-500 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 py-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={formData.isVeg}
                onChange={e => setFormData({ ...formData, isVeg: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              Pure Vegetarian Item
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded"
              />
              In Stock / Available
            </label>
          </div>

          {/* Direct Photo Selector (Direct to Database, No Cloudinary/ImageKit) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <label className="block font-extrabold text-slate-900 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                Restaurant Menu Item Photo
              </span>
              <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Instant Upload
              </span>
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {formData.image ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-sm">
                  <img src={formData.image} alt="preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:border-purple-500 text-slate-800 rounded-xl text-xs font-extrabold cursor-pointer shadow-sm transition">
                    <Upload className="w-3.5 h-3.5 text-purple-600" /> Choose Photo from Device
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={() => setCameraOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition"
                  >
                    <Camera className="w-3.5 h-3.5" /> Take with Camera
                  </button>
                </div>

                <input
                  type="text"
                  value={formData.image?.startsWith('data:') ? '📸 Direct photo uploaded' : formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  placeholder="Or enter image URL..."
                  disabled={formData.image?.startsWith('data:')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-purple-500 font-mono disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Fresh Mandi Unit Weight Variants */}
          {vendorType === 'FRESH' && (
            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-3">
              <h4 className="font-extrabold text-emerald-900 text-xs">Fresh Produce Unit Pricing Variants</h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Qty (e.g. 0.5 or 1)"
                  value={newVariant.quantity}
                  onChange={e => setNewVariant({ ...newVariant, quantity: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs bg-white font-medium"
                />
                <select
                  value={newVariant.unit}
                  onChange={e => setNewVariant({ ...newVariant, unit: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs bg-white font-medium"
                >
                  <option value="KG">KG</option>
                  <option value="GRAM">GM (Grams)</option>
                  <option value="PIECE">PIECE</option>
                  <option value="PACK">PACKET</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price (₹)"
                  value={newVariant.price}
                  onChange={e => setNewVariant({ ...newVariant, price: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs bg-white font-medium"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Discount (₹)"
                  value={newVariant.discountPrice}
                  onChange={e => setNewVariant({ ...newVariant, discountPrice: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs bg-white font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg flex items-center justify-center gap-1 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              {variants.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {variants.map((v, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-extrabold text-slate-800">
                      <span>{v.name || `${v.quantity} ${v.unit}`}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-700">₹{v.price} {v.discountPrice ? <span className="line-through text-slate-400 text-[10px]">₹{v.discountPrice}</span> : ''}</span>
                        <button type="button" onClick={() => handleRemoveVariant(idx)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-md transition"
            >
              Save Product
            </button>
          </div>

        </form>

      </div>

      {/* Live Camera Modal for Direct Photo Capture */}
      <CameraCaptureModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(photo) => {
          setFormData(prev => ({ ...prev, image: photo, imagePublicId: null }));
          toast.success('📸 Dish photo captured via camera and saved to product!');
        }}
        title="Capture Menu Item Photo"
        subtitle="Point camera at the freshly prepared dish to take photo"
      />
    </div>
  );
}
