'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Users,
  Building2,
  Contact,
  TrendingUp,
  FileCheck,
  CalendarCheck,
  Activity,
  Tags,
  FileText,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Bell,
  Search,
  User,
  Loader2,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'Opportunities', href: '/opportunities', icon: TrendingUp },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Contacts', href: '/contacts', icon: Contact },
  { name: 'Customers', href: '/customers', icon: ShieldCheck },
  { name: 'Requirements', href: '/requirements', icon: FileCheck },
  { name: 'Activities', href: '/activities', icon: Activity },
  { name: 'Follow-ups', href: '/follow-ups', icon: CalendarCheck },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Tags', href: '/tags', icon: Tags },
  { name: 'User Management', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900/90 border-r border-slate-800 transition-all duration-300 flex flex-col shrink-0 relative z-20`}
      >
        {/* Logo Header */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm text-white tracking-tight truncate">CostTracking</span>
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold truncate">
                  {user.tenantName}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={!sidebarOpen ? item.name : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              {sidebarOpen && (
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user.role}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-6 z-10">
          {/* Search bar */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search leads, customers, companies..."
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-1.5 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
            </button>

            <div className="h-4 w-[1px] bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {user.role}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
