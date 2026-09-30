import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useMode } from '../context/ModeContext';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export default function StickyBasketBar() {
  const { cart, itemCount, subtotal } = useCart();
  const { isFresh } = useMode();

  if (!cart || itemCount === 0) return null;

  const checkoutPath = isFresh ? '/checkout/fresh-mandi' : '/checkout/cravings';

  return (
    <aside aria-label="Active Cart Summary" className="fixed bottom-16 left-3 right-3 z-40 md:hidden animate-in slide-in-from-bottom-4 duration-300">
      <div className={`p-3.5 rounded-2xl shadow-xl flex items-center justify-between text-white border backdrop-blur-lg ${
        isFresh
          ? 'bg-[#168A5B] border-[#0F6945]'
          : 'bg-[#E51B4B] border-[#B90F38]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold text-sm">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                {isFresh ? 'Fresh Mandi' : 'Cravings'}
              </span>
              <span className="text-xs font-extrabold text-white">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-sm font-extrabold text-white mt-0.5">
              ₹{subtotal} <span className="text-[10px] font-normal opacity-80">(plus taxes & fees)</span>
            </p>
          </div>
        </div>

        <Link
          to={checkoutPath}
          className="px-4 py-2 bg-white text-slate-900 rounded-xl font-extrabold text-xs shadow-md hover:bg-slate-100 transition flex items-center gap-1.5 whitespace-nowrap active:scale-95"
        >
          <span>View Basket</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
}
