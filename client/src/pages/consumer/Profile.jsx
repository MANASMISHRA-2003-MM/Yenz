import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, MapPin, Receipt, Shield, Store, Bike, LogOut, ArrowRight, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  const role = (user.role || 'customer').toLowerCase();

  const handleLogout = () => {
    logout();
    toast.success('Successfully logged out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Profile Card Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <img
              src={(user.avatar && !user.avatar.includes('user-avatar.jpg')) ? user.avatar : 'https://img.icons8.com/?size=100&id=85147&format=png&color=000000'}
              alt={user.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-500/20 shadow-md"
            />
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-extrabold uppercase text-slate-700">
                {role === 'admin' && <Shield className="w-3 h-3 text-purple-600" />}
                {role === 'vendor' && <Store className="w-3 h-3 text-amber-600" />}
                {role === 'delivery_partner' && <Bike className="w-3 h-3 text-cyan-600" />}
                {role === 'consumer' || role === 'customer' ? <User className="w-3 h-3 text-brand-600" /> : null}
                <span>{role.replace('_', ' ')} Account</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{user.name || user.fullName}</h1>
              <p className="text-xs text-slate-500 font-medium">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-extrabold text-xs flex items-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* User Contact Info */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider text-slate-400">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Email Address</span>
                <span className="text-slate-900">{user.email}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Phone Number</span>
                <span className="text-slate-900">{user.phone || 'Not provided'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Role-Specific Actions & Dashboard Quick Links */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider text-slate-400">Quick Dashboard Links</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {role === 'admin' && (
              <Link
                to="/admin/dashboard"
                className="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl flex items-center justify-between font-extrabold text-xs text-purple-900 transition"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span>Admin Operations Control</span>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-600" />
              </Link>
            )}

            {role === 'vendor' && (
              <Link
                to="/vendor/dashboard"
                className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-between font-extrabold text-xs text-amber-900 transition"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-amber-600" />
                  <span>Vendor Shop Orders & Catalog</span>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600" />
              </Link>
            )}

            {role === 'delivery_partner' && (
              <Link
                to="/delivery/dashboard"
                className="p-4 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-2xl flex items-center justify-between font-extrabold text-xs text-cyan-900 transition"
              >
                <div className="flex items-center gap-3">
                  <Bike className="w-5 h-5 text-cyan-600" />
                  <span>Delivery Fleet Dashboard</span>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-600" />
              </Link>
            )}

            <Link
              to="/orders"
              className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between font-extrabold text-xs text-slate-900 transition"
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-brand-500" />
                <span>My Order History</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
