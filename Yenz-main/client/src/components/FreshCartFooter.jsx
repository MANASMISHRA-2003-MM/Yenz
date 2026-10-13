import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, MapPin } from 'lucide-react';
import MilegaLogo from './MilegaLogo';

export default function FreshCartFooter() {
  const location = useLocation();
  const isPortalPage = ['/delivery', '/vendor', '/admin'].some(path => location.pathname.startsWith(path));

  // Completely block footer from appearing on portal dashboards (Rider, Vendor, Admin)
  if (isPortalPage) {
    return null;
  }

  return (
    <footer className="fc-footer mt-14 border-t border-gray-200 bg-white">
      <div className="fc-container py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          <div>
            <MilegaLogo />
            <p className="mt-3 text-sm leading-6 text-gray-500 max-w-sm">
              Your everyday food, grocery and fresh mandi delivery marketplace.
            </p>
            <div className="mt-4 space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Hyperlocal delivery</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> Customer support</div>
            </div>
          </div>
          <div>
            <h3 className="fc-footer-heading">Shop</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Link className="fc-footer-link" to="/home">Cravings</Link>
              <Link className="fc-footer-link" to="/home">Fresh Mandi</Link>
              <Link className="fc-footer-link" to="/search">Search</Link>
              <Link className="fc-footer-link" to="/orders">My Orders</Link>
            </div>
          </div>
          <div>
            <h3 className="fc-footer-heading">Account</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Link className="fc-footer-link" to="/profile">Profile</Link>
              <Link className="fc-footer-link" to="/cart">Cart</Link>
              <Link className="fc-footer-link" to="/login">Login</Link>
              <Link className="fc-footer-link" to="/register">Create account</Link>
            </div>
          </div>
          <div>
            <h3 className="fc-footer-heading">Partner</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Link className="fc-footer-link" to="/vendor/onboarding">Sell on Milega</Link>
              <Link className="fc-footer-link" to="/delivery/onboarding">Become a delivery partner</Link>
            </div>
          </div>
        </div>
        <div className="mt-9 pt-5 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} Milega. Built on the Yenz application engine.</span>
          <span>FreshCart-style storefront experience</span>
        </div>
      </div>
    </footer>
  );
}
