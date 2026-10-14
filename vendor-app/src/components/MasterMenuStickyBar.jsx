import React, { useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Camera,
  Upload,
  Eye,
  X,
  Check,
  Search,
  Sparkles,
  Layers,
  Tag,
  DollarSign,
  Printer,
  Trash2,
  AlertCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import CameraCaptureModal from './CameraCaptureModal';
import API from '../services/api';
import { toast } from 'sonner';

/**
 * MasterMenuStickyBar
 * Sticky header positioned at the top of the restaurant products list.
 * Visible ONLY to Admin and that specific restaurant's Vendor.
 * Provides:
 * 1. Master Menu quick pricing & catalog stats.
 * 2. Master Price Booklet modal (all products, categories, inline price editing).
 * 3. Direct Master Menu Card photo upload (direct base64 to DB, no Cloudinary/ImageKit).
 * 4. High-res Master Menu Card viewer lightbox.
 */
export default function MasterMenuStickyBar({
  restaurant,
  products = [],
  onProductUpdated,
  onRestaurantUpdated,
  onAddProductClick,
  userRole = 'ADMIN'
}) {
  const [isBookletOpen, setIsBookletOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Price booklet filters & edits
  const [bookletSearch, setBookletSearch] = useState('');
  const [bookletCategory, setBookletCategory] = useState('ALL');
  const [editingPrices, setEditingPrices] = useState({});
  const [savingPriceId, setSavingPriceId] = useState(null);

  // Direct photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const fileInputRef = useRef(null);

  const vendorId = restaurant?._id || restaurant?.id;
  const menuCardImage = restaurant?.menuCardImage;

  // Compute master menu statistics
  const stats = useMemo(() => {
    if (!products || products.length === 0) {
      return { total: 0, minPrice: 0, maxPrice: 0, avgPrice: 0, vegCount: 0, nonVegCount: 0, categories: [] };
    }
    const prices = products.map(p => Number(p.price || 0)).filter(p => !isNaN(p) && p > 0);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const vegCount = products.filter(p => p.isVeg).length;
    const nonVegCount = products.length - vegCount;
    const catSet = new Set();
    products.forEach(p => {
      const c = p.category || (p.Category && p.Category.name);
      if (c) catSet.add(c);
    });

    return {
      total: products.length,
      minPrice,
      maxPrice,
      avgPrice,
      vegCount,
      nonVegCount,
      categories: Array.from(catSet)
    };
  }, [products]);

  // Handle direct file picker upload (Base64 directly into DB, no third-party service)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size should be under 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewPhoto(event.target.result);
      setIsPhotoModalOpen(true);
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle camera capture callback
  const handleCameraCapture = (dataUrl) => {
    setIsCameraModalOpen(false);
    setPreviewPhoto(dataUrl);
    setIsPhotoModalOpen(true);
  };

  // Save menu card direct photo to database
  const handleSaveMenuCardImage = async () => {
    if (!previewPhoto || !vendorId) return;
    try {
      setUploadingPhoto(true);
      const res = await API.put(`/restaurants/${vendorId}`, {
        menuCardImage: previewPhoto
      });
      if (res.data.success) {
        toast.success('📸 Master Menu Card updated successfully!');
        setIsPhotoModalOpen(false);
        setPreviewPhoto(null);
        if (onRestaurantUpdated) {
          onRestaurantUpdated(res.data.restaurant || { ...restaurant, menuCardImage: previewPhoto });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save menu card photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Delete menu card photo
  const handleDeleteMenuCardImage = async () => {
    if (!window.confirm('Are you sure you want to remove the Master Menu Card photo for this restaurant?')) return;
    try {
      setUploadingPhoto(true);
      const res = await API.put(`/restaurants/${vendorId}`, {
        menuCardImage: ''
      });
      if (res.data.success) {
        toast.success('Master Menu Card photo removed');
        setIsLightboxOpen(false);
        if (onRestaurantUpdated) {
          onRestaurantUpdated(res.data.restaurant || { ...restaurant, menuCardImage: null });
        }
      }
    } catch (err) {
      toast.error('Failed to remove menu card photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save quick price in Master Price Booklet
  const handleSaveQuickPrice = async (productId, currentPrice) => {
    const newPriceVal = editingPrices[productId];
    if (newPriceVal === undefined || Number(newPriceVal) === Number(currentPrice)) return;
    if (isNaN(Number(newPriceVal)) || Number(newPriceVal) < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setSavingPriceId(productId);
      const res = await API.put(`/foods/${productId}`, {
        price: Number(newPriceVal),
        priceChangeReason: `Master Menu Price adjusted by ${userRole}`
      });
      if (res.data.success) {
        toast.success(`Price updated to ₹${newPriceVal}`);
        if (onProductUpdated) onProductUpdated();
        setEditingPrices(prev => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update price');
    } finally {
      setSavingPriceId(null);
    }
  };

  // Filtered products for Master Price Booklet
  const filteredBookletProducts = useMemo(() => {
    return products.filter(p => {
      const cat = p.category || (p.Category && p.Category.name) || '';
      const matchesCat = bookletCategory === 'ALL' || cat === bookletCategory;
      const q = bookletSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        String(p.price).includes(q) ||
        cat.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, bookletCategory, bookletSearch]);

  return (
    <>
      {/* Hidden file input for direct photo upload (NO Cloudinary / NO ImageKit) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* STICKY TOP MASTER MENU BAR */}
      <div className="sticky top-2 z-20 mb-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-500/30 backdrop-blur-md p-3.5 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Master Menu Info & Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black tracking-wider uppercase border border-amber-400/30">
                  MASTER MENU & PRICING
                </span>
                <span className="text-[11px] font-bold text-slate-300">
                  {restaurant?.name || 'Restaurant'}
                </span>
                {menuCardImage ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Card Attached
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-bold border border-amber-500/30">
                    No Card Photo
                  </span>
                )}
              </div>

              {/* Stats pills */}
              <div className="flex flex-wrap items-center gap-2.5 mt-1 text-[11px] text-slate-300 font-medium">
                <span>Total Items: <strong className="text-white font-black">{stats.total}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Price Range: <strong className="text-emerald-400 font-mono font-bold">₹{stats.minPrice} – ₹{stats.maxPrice}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Veg: <strong className="text-emerald-400 font-bold">{stats.vegCount}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Non-Veg: <strong className="text-rose-400 font-bold">{stats.nonVegCount}</strong></span>
              </div>
            </div>
          </div>

          {/* Right: Master Menu Action Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Master Price Booklet Button */}
            <button
              onClick={() => setIsBookletOpen(true)}
              className="px-3.5 py-2 bg-indigo-600/90 hover:bg-indigo-600 active:scale-95 text-white text-xs font-black rounded-xl border border-indigo-400/30 shadow-md flex items-center gap-1.5 transition"
              title="Open full Master Menu price registry"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-200" />
              <span>Master Price Book ({stats.total})</span>
            </button>

            {/* View or Upload Master Menu Card Photo */}
            {menuCardImage ? (
              <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/80 p-1 rounded-xl">
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 transition"
                  title="View restaurant master menu card photo"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>View Card</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                  title="Replace Master Menu Card Photo"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDeleteMenuCardImage}
                  className="p-1.5 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 rounded-lg transition"
                  title="Remove Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition"
                  title="Upload Master Menu Card (Direct image to DB, No Cloudinary/ImageKit)"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Menu Card</span>
                </button>
                <button
                  onClick={() => setIsCameraModalOpen(true)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 rounded-xl border border-slate-700 transition"
                  title="Snap Menu Card with Camera"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Add Product Shortcut if provided */}
            {onAddProductClick && (
              <button
                onClick={onAddProductClick}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1 transition"
                title="Add new item to this restaurant's master menu"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: MASTER MENU & PRICE REGISTRY BOOKLET */}
      {/* ============================================================== */}
      {isBookletOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                    OFFICIAL PRICE REGISTRY
                  </span>
                  <span className="text-xs text-indigo-300 font-mono">
                    ID: {vendorId}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mt-1">
                  {restaurant?.name} — Master Menu Booklet
                </h2>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Collection of all {stats.total} food items & real-time pricing for this restaurant. Only visible to Admin and this Vendor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition print:hidden"
                  title="Print Price List"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsBookletOpen(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search master menu by item name, description, price..."
                  value={bookletSearch}
                  onChange={(e) => setBookletSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-medium text-slate-900 shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bookletCategory}
                  onChange={(e) => setBookletCategory(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:border-indigo-500 shadow-sm"
                >
                  <option value="ALL">All Categories ({stats.total})</option>
                  {stats.categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <div className="text-xs font-bold text-slate-500 px-2 whitespace-nowrap">
                  Showing {filteredBookletProducts.length} of {products.length}
                </div>
              </div>
            </div>

            {/* Table of products */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {filteredBookletProducts.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No items match your search</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try searching another term or resetting the category filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 uppercase text-[10px] text-slate-500 font-black tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Item Details</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Price (₹)</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Quick Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredBookletProducts.map((p, idx) => {
                        const pid = p._id || p.id;
                        const cat = p.category || (p.Category && p.Category.name) || 'General';
                        const currentVal = editingPrices[pid] !== undefined ? editingPrices[pid] : p.price;
                        const isSaving = savingPriceId === pid;
                        const hasModified = editingPrices[pid] !== undefined && Number(editingPrices[pid]) !== Number(p.price);

                        return (
                          <tr key={pid} className="hover:bg-indigo-50/30 transition">
                            <td className="p-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3 flex items-center gap-3">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-11 h-11 rounded-xl object-cover bg-slate-50 border border-slate-200 shrink-0"
                              />
                              <div>
                                <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  <span className={`w-2 h-2 rounded-full ${p.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                </div>
                                <div className="text-[11px] text-slate-500 font-normal line-clamp-1 max-w-xs">
                                  {p.description || 'Standard restaurant menu preparation'}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                p.isVeg ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {p.isVeg ? 'Veg' : 'Non-Veg'}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-800">{cat}</td>
                            <td className="p-3 font-mono font-extrabold text-slate-900">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">₹</span>
                                <input
                                  type="number"
                                  value={currentVal}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditingPrices(prev => ({ ...prev, [pid]: val }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveQuickPrice(pid, p.price);
                                  }}
                                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-extrabold text-emerald-700 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {p.isAvailable ? 'AVAILABLE' : 'OUT OF STOCK'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {hasModified && (
                                <button
                                  onClick={() => handleSaveQuickPrice(pid, p.price)}
                                  disabled={isSaving}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-black rounded-lg shadow-sm transition inline-flex items-center gap-1"
                                >
                                  {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  <span>Save ₹{editingPrices[pid]}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-4">
                <span>Avg Price: <strong className="text-slate-900 font-bold">₹{stats.avgPrice}</strong></span>
                <span>•</span>
                <span>Lowest: <strong className="text-emerald-700 font-bold">₹{stats.minPrice}</strong></span>
                <span>•</span>
                <span>Highest: <strong className="text-indigo-700 font-bold">₹{stats.maxPrice}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setIsBookletOpen(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl transition shadow-md flex items-center justify-center cursor-pointer"
                style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
              >
                <span style={{ color: '#ffffff', fontWeight: 900 }}>Close Booklet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CONFIRM DIRECT UPLOAD OF MASTER MENU CARD PHOTO */}
      {/* ============================================================== */}
      {isPhotoModalOpen && previewPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">Confirm Master Menu Card Photo</h3>
                <p className="text-xs text-slate-400 mt-0.5">Saving menu card photo to {restaurant?.name}</p>
              </div>
              <button
                onClick={() => { setIsPhotoModalOpen(false); setPreviewPhoto(null); }}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 flex flex-col items-center">
              <div className="max-h-80 w-full overflow-hidden rounded-2xl border border-slate-200 bg-black flex items-center justify-center">
                <img
                  src={previewPhoto}
                  alt="Menu Card Preview"
                  className="max-h-80 w-auto object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                This image will be available for instant menu reference by Admin and {restaurant?.name}.
              </p>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => { setIsPhotoModalOpen(false); setPreviewPhoto(null); }}
                disabled={uploadingPhoto}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMenuCardImage}
                disabled={uploadingPhoto}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                {uploadingPhoto ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{uploadingPhoto ? 'Saving directly to DB...' : 'Save Master Menu Card'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: LIGHTBOX VIEWER FOR MASTER MENU CARD PHOTO */}
      {/* ============================================================== */}
      {isLightboxOpen && menuCardImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn">
          {/* Top Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                MASTER MENU CARD
              </span>
              <h3 className="text-base font-black mt-1">{restaurant?.name} — Physical Menu Card</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Replace Photo
              </button>
              <button
                onClick={handleDeleteMenuCardImage}
                className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="max-w-4xl max-h-[82vh] overflow-auto rounded-2xl border border-slate-700 bg-slate-950 flex items-center justify-center p-2">
            <img
              src={menuCardImage}
              alt="Master Menu Card"
              className="max-h-[78vh] w-auto object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* CAMERA CAPTURE MODAL */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        title="Snap Master Menu Card"
        subtitle={`Take a clear live photo of ${restaurant?.name}'s physical menu card / price board`}
      />
    </>
  );
}
