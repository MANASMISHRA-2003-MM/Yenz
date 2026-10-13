import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../../services/api';
import { useMode } from '../../context/ModeContext';
import Navbar from '../../components/Navbar';
import FreshCartFooter from '../../components/FreshCartFooter';
import FoodCard from '../../components/FoodCard';
import FreshProductCard from '../../components/FreshProductCard';
import RestaurantCard from '../../components/RestaurantCard';
import StickyBasketBar from '../../components/StickyBasketBar';
import MobileBottomNavigation from '../../components/MobileBottomNavigation';
import { Search, X, Leaf, Utensils } from 'lucide-react';

export default function SearchPage(){
  const [searchParams,setSearchParams]=useSearchParams();const initialQuery=searchParams.get('q')||'';const [searchTerm,setSearchTerm]=useState(initialQuery);const [debouncedSearchTerm,setDebouncedSearchTerm]=useState(initialQuery);const {mode,switchMode,isFresh}=useMode();const [vegOnly,setVegOnly]=useState(false);const [selectedCategory,setSelectedCategory]=useState('ALL');const [foods,setFoods]=useState([]);const [restaurants,setRestaurants]=useState([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{const q=searchParams.get('q')||'';setSearchTerm(q);setDebouncedSearchTerm(q)},[searchParams]);useEffect(()=>{const t=setTimeout(()=>setDebouncedSearchTerm(searchTerm),300);return()=>clearTimeout(t)},[searchTerm]);useEffect(()=>{fetchSearchResults()},[debouncedSearchTerm,mode,vegOnly,selectedCategory]);
  const handleInputChange=val=>{setSearchTerm(val);val.trim()?setSearchParams({q:val},{replace:true}):setSearchParams({},{replace:true})};
  const fetchSearchResults=async()=>{try{setLoading(true);const params={};if(debouncedSearchTerm)params.search=debouncedSearchTerm;if(vegOnly)params.isVeg=true;if(selectedCategory!=='ALL')params.category=selectedCategory;params.productType=isFresh?'VEGETABLE,FRUIT,GROCERY':'FOOD';params.vendorType=isFresh?'FRESH':'CRAVINGS';const [rf,rr]=await Promise.all([API.get('/foods',{params}),API.get('/restaurants',{params:{vendorType:isFresh?'FRESH':'FOOD_RESTAURANT',search:debouncedSearchTerm}})]);if(rf.data.success)setFoods(rf.data.foods||[]);if(rr.data.success)setRestaurants(rr.data.restaurants||[])}catch(e){console.error('Search error:',e)}finally{setLoading(false)}};
  const categories=isFresh?['ALL','Daily Vegetables','Fresh Fruits','Leafy Greens & Herbs']:['ALL','North Indian','Italian & Pizza','Asian & Chinese'];
  return <div className="fc-page pb-24"><Navbar/><main className="fc-container py-6 space-y-7">
    <section className="fc-card p-5 sm:p-6"><div className="flex flex-col lg:flex-row lg:items-center gap-5 justify-between"><div><div className="fc-eyebrow">FreshCart search</div><h1 className="mt-1 text-2xl font-bold text-gray-900">{isFresh?'Search fresh produce & mandis':'Find dishes & restaurants'}</h1><p className="mt-1 text-sm text-gray-500">Search results continue to use the original Yenz API queries and filters.</p></div></div>
    <div className="relative mt-5"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/><input value={searchTerm} onChange={e=>handleInputChange(e.target.value)} placeholder={isFresh?'Search tamatar, apple, spinach, onion...':'Search paneer, biryani, pizza, burger...'} className="fc-input pl-10 pr-10 py-3 bg-gray-50"/>{searchTerm&&<button onClick={()=>handleInputChange('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500"><X className="w-4 h-4"/></button>}</div>
    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-2"><div className="flex gap-2 overflow-x-auto scrollbar-none flex-1">{categories.map(cat=><button key={cat} onClick={()=>setSelectedCategory(cat)} className={`px-3 py-2 rounded-md text-xs font-semibold border whitespace-nowrap ${selectedCategory===cat?(isFresh?'bg-emerald-600 text-white border-emerald-600':'bg-[rgb(229,27,75)] text-white border-[rgb(229,27,75)]'):'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{cat}</button>)}</div><button onClick={()=>setVegOnly(v=>!v)} className={`fc-btn text-xs ${vegOnly?'bg-emerald-50 border-emerald-300 text-emerald-700':'fc-btn-soft'}`}><Leaf className="w-3.5 h-3.5"/>Veg only</button></div></section>
    {loading?<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><div key={i} className="h-72 rounded-lg bg-gray-100 animate-pulse"/>)}</div>:<>
      {restaurants.length>0&&<section><div className="flex items-end justify-between mb-3"><div><h2 className="text-xl font-semibold text-gray-800">{isFresh?'Matching Fresh Mandi stores':'Matching restaurants'}</h2><p className="text-xs text-gray-500 mt-1">{restaurants.length} results</p></div></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{restaurants.map(r=><RestaurantCard key={r._id||r.id} restaurant={r}/>)}</div></section>}
      <section><div className="flex items-end justify-between mb-3"><div><h2 className="text-xl font-semibold text-gray-800">{isFresh?'Fresh produce & essentials':'Prepared dishes & meals'}</h2><p className="text-xs text-gray-500 mt-1">{foods.length} products</p></div></div>{foods.length?<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{foods.map(item=>isFresh?<FreshProductCard key={item._id||item.id} product={item}/>:<FoodCard key={item._id||item.id} food={item}/>)}</div>:<div className="fc-card p-12 text-center"><Search className="w-10 h-10 mx-auto text-gray-400"/><h3 className="mt-3 text-base font-semibold text-gray-800">No items found</h3><p className="mt-1 text-xs text-gray-500">Try a different search or clear the filters.</p></div>}</section>
    </>}
  <FreshCartFooter />
      </main><StickyBasketBar/><MobileBottomNavigation/></div>;
}
