import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Store, Bike, ShieldCheck, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';

export default function RoleSwitcher() {
  const { user, demoSwitchRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    { id: 'consumer', label: 'Consumer', icon: User, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100', path: '/home' },
    { id: 'vendor', label: 'Vendor', icon: Store, color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100', path: '/vendor/dashboard' },
    { id: 'delivery_partner', label: 'Delivery Driver', icon: Bike, color: 'text-cyan-700 bg-cyan-50 border-cyan-200 hover:bg-cyan-100', path: '/delivery/dashboard' },
    { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100', path: '/admin/dashboard' }
  ];

  const handleSwitch = async (roleId, path) => {
    await demoSwitchRole(roleId);
    navigate(path);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-soft-lg space-y-2 min-w-[190px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-1.5 px-2 pb-1 border-b border-slate-100">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Instant Demo Role</span>
          </div>

          <div className="space-y-1">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = user?.role === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => handleSwitch(r.id, r.path)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition ${r.color} ${
                    isActive ? 'ring-2 ring-brand-500 shadow-sm' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{r.label}</span>
                  </div>
                  {isActive && <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-soft-lg border border-slate-700 text-xs font-extrabold transition group"
      >
        <Sparkles className="w-4 h-4 text-brand-400 group-hover:rotate-12 transition-transform" />
        <span>Switch Role</span>
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </button>
    </div>
  );
}
