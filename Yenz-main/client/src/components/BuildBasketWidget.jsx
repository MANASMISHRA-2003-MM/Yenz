import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Leaf, ArrowRight } from 'lucide-react';
export default function BuildBasketWidget(){const {freshCart,freshCount}=useCart(); return <div className="fc-card p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-emerald-50/50"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center"><Leaf className="w-5 h-5"/></div><div><div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Build your Fresh Mandi basket</div><div className="text-xs text-gray-600 mt-1">{freshCount||0} items · ₹{freshCart?.subtotal||0}</div></div></div><Link to="/checkout/fresh-mandi" className="fc-btn fc-btn-fresh py-2 text-xs">Review basket <ArrowRight className="w-3.5 h-3.5"/></Link></div>}
