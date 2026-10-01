import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useMode } from '../context/ModeContext';
import { ShoppingBag, ArrowRight } from 'lucide-react';
export default function StickyBasketBar(){const {cart,itemCount,subtotal}=useCart(); const {isFresh}=useMode(); if(!itemCount)return null; return <div className="lg:hidden fixed bottom-16 left-3 right-3 z-40"><Link to={isFresh?'/checkout/fresh-mandi':'/checkout/cravings'} className={`flex items-center justify-between rounded-lg px-4 py-3 text-white shadow-lg ${isFresh?'bg-[rgb(22,138,91)]':'bg-[rgb(229,27,75)]'}`}><span className="flex items-center gap-2 text-xs font-bold"><ShoppingBag className="w-4 h-4"/>{itemCount} item{itemCount!==1?'s':''} · ₹{subtotal}</span><span className="flex items-center gap-1 text-xs font-bold">View basket <ArrowRight className="w-4 h-4"/></span></Link></div>}
