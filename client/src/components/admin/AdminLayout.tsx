import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  BookOpen,
  Settings,
  History,
  Mail,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = user?.role || 'USER';
  const isAdmin = role === 'ADMIN';

  const navItems = [
    { to: '/admin', label: 'Platform Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'User Directory', icon: Users },
    { to: '/admin/reports', label: 'Moderation & Reports', icon: ShieldAlert },
    { to: '/admin/skills', label: 'Skills Catalog', icon: BookOpen },
    { to: '/admin/subscriptions', label: 'Subscriptions & Revenue', icon: CreditCard, adminOnly: true },
    { to: '/admin/settings', label: 'Platform Settings', icon: Settings, adminOnly: true },
    { to: '/admin/audit', label: 'Audit Trail', icon: History },
    { to: '/admin/emails', label: 'Email Delivery', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Top Mobile Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
            S
          </div>
          <div>
            <span className="font-bold text-white text-sm">SkillSwap</span>
            <span className="ml-1.5 text-[10px] uppercase font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              Admin
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Desktop & Mobile Overlay */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/30">
              SS
            </div>
            <div>
              <div className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                SkillSwap
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Administration Hub</p>
            </div>
          </div>
        </div>

        {/* User Identity / Role Pill */}
        <div className="px-5 py-3.5 mx-3 my-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[11px] text-slate-400 truncate">@{user?.username || 'admin'}</p>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
              isAdmin
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}
          >
            {role}
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Shortcut to App */}
        <div className="p-3 border-t border-slate-800">
          <Link
            to="/dashboard"
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-xs font-medium text-slate-300 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Back to Member App</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 bg-slate-950 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

