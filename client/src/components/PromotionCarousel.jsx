import React from 'react';
import { useMode } from '../context/ModeContext';
import { Tag, Sparkles, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PromotionCarousel() {
  const { isFresh } = useMode();

  const cravingsPromos = [
    {
      id: 1,
      title: 'FREE DELIVERY ABOVE ₹99',
      subtitle: 'Order from top outlets around Lakkarpur',
      tag: 'HOT OFFER',
      gradient: 'from-[#B90F38] via-[#E51B4B] to-slate-900',
      btnText: 'Order Food Now',
      link: '/search?q=Food'
    },
    {
      id: 2,
      title: 'MEALS UNDER ₹250',
      subtitle: 'Pocket-friendly thalis, biryanis & rolls',
      tag: 'BUDGET DEALS',
      gradient: 'from-amber-600 via-rose-600 to-slate-900',
      btnText: 'Explore Under ₹250',
      link: '/search?q=Under250'
    },
    {
      id: 3,
      title: '40% OFF ON FIRST ORDER',
      subtitle: 'Use code KRAWING40 at checkout',
      tag: 'NEW USER SPECIAL',
      gradient: 'from-purple-700 via-pink-600 to-rose-900',
      btnText: 'Claim Offer',
      link: '/search'
    }
  ];

  const freshPromos = [
    {
      id: 1,
      title: 'WHOLESALE MANDI RATES',
      subtitle: 'Direct morning harvest at unbeatable prices',
      tag: '5 AM HARVEST',
      gradient: 'from-[#0F6945] via-[#168A5B] to-slate-900',
      btnText: 'Shop Fresh Sabzi',
      link: '/search?q=Vegetable'
    },
    {
      id: 2,
      title: 'QUALITY GROCERIES',
      subtitle: 'Staples, pulses, flour, oil & daily kitchen essentials',
      tag: 'GROCERY STAPLES',
      gradient: 'from-emerald-700 via-teal-600 to-slate-900',
      btnText: 'Explore Groceries',
      link: '/restaurant/vnd-mandi-04?cat=GROCERY_ESSENTIALS'
    }
  ];

  const promos = isFresh ? freshPromos : cravingsPromos;

  return (
    <div className="w-full">
      {/* Horizontal Scrollable Rail on Mobile, Clean Grid on Desktop */}
      <div className="flex lg:grid lg:grid-cols-3 gap-4 overflow-x-auto lg:overflow-visible scrollbar-none snap-x snap-mandatory py-1 max-w-full">
        {promos.map((promo) => (
          <div
            key={promo.id}
            className={`snap-center flex-shrink-0 w-[85%] sm:w-[48%] lg:w-full min-h-[160px] sm:min-h-[180px] p-5 sm:p-6 rounded-3xl bg-gradient-to-r ${promo.gradient} text-white shadow-soft relative overflow-hidden flex flex-col justify-between group border border-white/10`}
          >
            {/* Background Decorative Pattern */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 backdrop-blur-3xl rounded-l-full transform translate-x-8 pointer-events-none" />

            <div className="space-y-1.5 z-10 max-w-lg">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 backdrop-blur-md border border-white/30 text-white">
                <Tag className="w-3 h-3 text-amber-300 fill-amber-300" />
                <span>{promo.tag}</span>
              </div>

              <h2 className="font-heading font-extrabold text-lg sm:text-2xl text-white tracking-tight leading-snug">
                {promo.title}
              </h2>

              <p className="text-xs text-slate-200 font-medium line-clamp-1">
                {promo.subtitle}
              </p>
            </div>

            <div className="pt-3 flex items-center justify-between z-10">
              <Link
                to={promo.link}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 transition text-xs font-extrabold shadow-sm"
              >
                <span>{promo.btnText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-slate-200 opacity-90">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Outlets</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
