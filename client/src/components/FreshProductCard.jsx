import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { getAccurateDishImage } from '../utils/imageUtils';

export default function FreshProductCard({ product, isStoreClosed = false }) {
  const { cart, addToCart, updateQuantity } = useCart();
  let weightOptions = [];
  if (Array.isArray(product.variants) && product.variants.length) weightOptions = product.variants.map(v => ({weightLabel: v.name || `${v.quantity}${v.unit}`, price: v.price}));
  else if (product.weightOptions?.length) weightOptions = product.weightOptions;
  else {
    const unitStr = (product.unit || '1 kg').trim(); const produce = ['VEGETABLE','FRUIT'].includes(product.productType);
    weightOptions = produce && ['kg','1 kg','1kg'].includes(unitStr.toLowerCase()) ? [{weightLabel:'500g',price:Math.round((Number(product.price)||40)*.5)},{weightLabel:'1kg',price:Number(product.price)||40},{weightLabel:'2kg',price:Math.round((Number(product.price)||40)*2)}] : [{weightLabel:unitStr || '1 Pack',price:Number(product.price)||0}];
  }
  const [selectedWeight, setSelectedWeight] = useState(weightOptions[0]);
  const targetId = product.id || product._id;
  const cartItem = cart?.items?.find(i => (i.foodId === targetId || i.productId === targetId || i.foodId?._id === targetId || i.id === targetId || i._id === targetId) && i.selectedWeight === selectedWeight.weightLabel);
  const quantity = cartItem?.quantity || 0;
  const [adding, setAdding] = useState(false);
  const handleAdd = async e => { e.stopPropagation(); if (isStoreClosed) return toast.error('This store is currently offline / closed and not accepting orders.'); if (product?.isAvailable === false) return toast.error(`"${product?.name || 'This item'}" is currently out of stock`); setAdding(true); try { const res = await addToCart(targetId,1,selectedWeight.weightLabel,'FRESH_MANDI'); if(res?.success) toast.success(`Added ${product.name} (${selectedWeight.weightLabel}) to basket!`);}finally{setAdding(false);} };
  const imageUrl = getAccurateDishImage(product.name, product.category, product.image, true);
  return (
    <article className="fc-card fc-card-hover overflow-hidden group">
      <div className="relative h-52 bg-gray-50 p-3">
        <img src={imageUrl} alt={product.name} className={`w-full h-full object-contain group-hover:scale-[1.03] transition ${product?.isAvailable === false ? 'opacity-50 grayscale' : ''}`} loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/favicon.png';}} />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold"><Leaf className="w-3 h-3 fill-white" />{product.freshnessBadge || 'Fresh today'}</span>
        {product?.isAvailable === false && <div className="absolute inset-0 bg-black/45 flex items-center justify-center"><span className="px-3 py-1.5 bg-white text-red-600 rounded-md font-bold text-[10px] uppercase">Out of Stock</span></div>}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-emerald-700">{product.name}</h3>
        <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 min-h-[2.25rem]">{product.description || 'Farm-fresh quality harvested daily'}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{weightOptions.map((opt,idx)=><button key={idx} onClick={()=>setSelectedWeight(opt)} className={`px-2 py-1 rounded-md text-[10px] font-bold border ${selectedWeight.weightLabel===opt.weightLabel?'bg-emerald-600 text-white border-emerald-600':'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{opt.weightLabel} · ₹{opt.price}</button>)}</div>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-gray-200 pt-3">
          <div><div className="text-base font-bold text-gray-900">₹{selectedWeight.price}</div><div className="text-[10px] text-gray-500">{selectedWeight.weightLabel}</div></div>
          {isStoreClosed ? <button className="fc-btn py-1.5 px-3 text-[10px] bg-red-50 text-red-600 border-red-200" onClick={e=>{e.stopPropagation();toast.error('This store is currently offline / closed')}}>Closed</button> : product?.isAvailable===false ? <button disabled className="fc-btn py-1.5 px-3 text-[10px] bg-gray-100 text-gray-500 border-gray-200">Out of stock</button> : quantity>0 ? <div className="inline-flex items-center rounded-md overflow-hidden bg-emerald-600 text-white"><button onClick={async e=>{e.stopPropagation();await updateQuantity(targetId,quantity-1,selectedWeight.weightLabel,'FRESH_MANDI')}} className="p-1.5 hover:bg-emerald-700"><Minus className="w-3.5 h-3.5"/></button><span className="px-2 text-xs font-bold">{quantity}</span><button onClick={async e=>{e.stopPropagation();await updateQuantity(targetId,quantity+1,selectedWeight.weightLabel,'FRESH_MANDI')}} className="p-1.5 hover:bg-emerald-700"><Plus className="w-3.5 h-3.5"/></button></div> : <button onClick={handleAdd} disabled={adding} className="fc-btn py-1.5 px-3 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><Plus className="w-3.5 h-3.5"/>{adding?'ADDING':'ADD'}</button>}
        </div>
      </div>
    </article>
  );
}
