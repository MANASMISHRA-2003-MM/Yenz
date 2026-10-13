import React from 'react';
import { useMode } from '../context/ModeContext';
import { ArrowRight, Tag, Truck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PromotionCarousel() {
  const { isFresh } = useMode();
  const promos = isFresh ? [
    {title:'Fresh vegetables every morning', subtitle:'Farm-style produce, fruits and vegetable mandis near you.', tag:'FRESH MANDI', image:'/freshcart/images/banner/grocery-banner.png', link:'/search?q=Vegetable', action:'Shop Fresh'},
    {title:'Kitchen staples at daily prices', subtitle:'Grains, dals, flour, oils and everyday essentials.', tag:'GROCERY ESSENTIALS', image:'/freshcart/images/banner/grocery-banner-2.jpg', link:'/search?q=Grocery', action:'Shop Groceries'}
  ] : [
    {title:'Meals made for your cravings', subtitle:'Find local favourites, rolls, burgers and complete meals.', tag:'CRAVINGS', image:'/freshcart/images/banner/cravings-banner-1.jpg', link:'/search', action:'Order Food'},
    {title:'Great food. Better value.', subtitle:'Discover authentic veg biryani, paneer & popular specials.', tag:'DAILY DEALS', image:'/freshcart/images/banner/cravings-banner-2.jpg', link:'/search?q=Popular', action:'Popular Foods'}
  ];
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {promos.map((promo, index) => <div key={promo.title} className="relative min-h-[220px] rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
        <img src={promo.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
        <div className="relative z-10 p-6 sm:p-8 max-w-xl min-h-[220px] flex flex-col justify-between text-white">
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 text-gray-800 rounded-md text-[10px] font-extrabold"><Tag className="w-3 h-3" />{promo.tag}</span>
            <h1 className="mt-5 text-2xl sm:text-4xl font-extrabold tracking-tight text-white">{promo.title}</h1>
            <p className="mt-2 text-sm text-white/85">{promo.subtitle}</p>
          </div>
          <div className="flex items-center gap-4 mt-5"><Link to={promo.link} className={`fc-btn ${isFresh || index===1 ? 'fc-btn-fresh' : 'fc-btn-cravings'} py-2 text-xs`}>{promo.action}<ArrowRight className="w-3.5 h-3.5"/></Link><span className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-white/80"><ShieldCheck className="w-4 h-4"/>Verified local delivery</span></div>
        </div>
      </div>)}
    </section>
  );
}
