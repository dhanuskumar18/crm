'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  Building2,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/20 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" /> Phase 0 Foundation Active
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome, {user?.firstName} {user?.lastName}! 👋
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Your organization <span className="text-white font-medium">{user?.tenantName}</span> is tenant-isolated with multi-role access control.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-950/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-white font-semibold">{user?.role}</p>
              <p className="text-slate-400 text-[10px]">Permission Guard Enforced</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Leads', count: '0', icon: Users, color: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/20' },
          { title: 'Active Companies', count: '0', icon: Building2, color: 'from-violet-500/20 to-purple-500/10 text-violet-400 border-violet-500/20' },
          { title: 'Pipeline Value', count: '$0.00', icon: TrendingUp, color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20' },
          { title: 'Active Customers', count: '0', icon: ShieldCheck, color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/20' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className={`bg-gradient-to-br ${card.color} border rounded-2xl p-5 shadow-lg flex justify-between items-start`}>
              <div>
                <p className="text-slate-400 text-xs font-medium">{card.title}</p>
                <p className="text-2xl font-bold text-white mt-2">{card.count}</p>
              </div>
              <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800">
                <Icon className={`w-5 h-5`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Security & System Readiness Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Phase 0 System Verification Matrix
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {[
            { label: 'JWT Access & Refresh Session Management', status: 'Enforced (15m / 30d)' },
            { label: 'Row-Level Tenant Data Isolation', status: 'Enforced via AsyncLocalStorage' },
            { label: 'Role-Based Access Control (RBAC)', status: '8 Default Roles Seeded' },
            { label: 'Audit Log Foundation', status: 'Tenant & User Scoped' },
            { label: 'User Invitation & Profile System', status: 'Active (SMTP Ready)' },
            { label: 'Base Settings Table', status: 'Seeded (Currency, Fiscal Year)' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-slate-300 font-medium">{item.label}</span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
