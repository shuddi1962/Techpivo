'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AccountSidebar, { NAV_ITEMS } from '@/components/account/account-sidebar';
import { getLevelForXP } from '@/lib/community-utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/community/profile')
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const levelInfo = getLevelForXP(profile?.xp || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b]">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <Skeleton className="h-8 w-48 bg-white/10 mb-2" />
            <Skeleton className="h-4 w-72 bg-white/10" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-10">
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-3">
              <Skeleton className="h-[500px] w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navy gradient hero */}
      <div className="bg-gradient-to-br from-slate-950 via-[#0b1035] to-[#1b1b4b] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(245,158,11,0.06),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.05),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-4 py-10 relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">My Account</h1>
          <p className="text-white/60 mt-1 text-sm md:text-base">Manage your profile, security, and preferences</p>
        </div>
      </div>

      {/* Mobile horizontal nav */}
      <div className="lg:hidden border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-2 overflow-x-auto flex gap-2 no-scrollbar" aria-label="Account sections">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== '/account' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <AccountSidebar profile={profile} levelInfo={levelInfo} />
            </div>
          </div>
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}