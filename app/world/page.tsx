'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

type Region = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  questCount: number;
};

type RegionProgress = {
  id: string;
  displayName: string;
  name: string;
  completed: number;
  total: number;
  percentage: number;
};

type Progress = {
  eventName: string;
  eventProgress: { completed: number; total: number };
  regions: RegionProgress[];
};

export default function WorldPage() {
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [identity, setIdentity] = useState<{ role: string; country: string; curiosity: string } | null>(null);
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/world').then((r) => r.json()),
      fetch('/api/progress').then((r) => r.json()),
    ])
      .then(([userData, worldData, progressData]) => {
        if (userData.error || worldData.error) {
          router.push('/');
          return;
        }
        if (userData.needsProfile) {
          router.push('/profile');
          return;
        }
        setUserName(userData.user.name);
        setRegions(worldData.regions);
        setEventName(worldData.event?.name || progressData.eventName || 'this event');
        if (progressData.eventProgress) setProgress(progressData);
        setIdentity({
          role: userData.user.role || '',
          country: userData.user.country || '',
          curiosity: userData.user.curiosity || '',
        });
        setLoading(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white mx-auto mb-4" />
          <p className="text-white/90 text-sm">Loading world…</p>
        </div>
      </div>
    );
  }

  const activeRegions = regions.filter((r) => r.isActive && r.questCount > 0);
  const cityDistrict = regions.find((r) => r.name === 'city-district');

  return (
    <div className="min-h-screen flex flex-col bg-primary-600 pb-24">
      {/* Event-app hero: compact header */}
      <header className="px-4 pt-6 pb-4 text-center shrink-0">
        <p className="text-white/80 text-sm">Welcome back, {userName}</p>
        <h1 className="text-2xl font-bold text-white mt-1">World Map</h1>
        <p className="text-white/70 text-sm mt-0.5">Select a region to begin</p>
        {identity && (identity.role || identity.country || identity.curiosity) && (
          <p className="text-white/60 text-xs mt-2 max-w-xs mx-auto">
            {eventName}
            {identity.role && identity.country && <> · {identity.role}, {identity.country}</>}
            {identity.curiosity && <> · {identity.curiosity}</>}
          </p>
        )}
        {progress && progress.eventProgress.total > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15">
            <span className="text-white text-xs font-semibold">
              {progress.eventProgress.completed}/{progress.eventProgress.total} quests
            </span>
          </div>
        )}
      </header>

      {/* Scrollable region list - card-based discovery (Figma event-app style) */}
      <main className="flex-1 px-4 overflow-auto">
        {activeRegions.length > 0 ? (
          <div className="space-y-3 pb-4">
            {activeRegions.map((region) => {
              const rp = progress?.regions.find((pr) => pr.id === region.id);
              const isComplete = rp && rp.total > 0 && rp.completed === rp.total;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => router.push(`/district?regionId=${region.id}`)}
                  className="w-full text-left bg-white rounded-3xl shadow-lg p-4 flex items-center gap-4 active:scale-[0.99] transition-transform"
                >
                  <span className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center text-2xl shrink-0">
                    📍
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-gray-900 truncate">{region.displayName}</h2>
                    {region.description && (
                      <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">{region.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">{region.questCount} quest{region.questCount !== 1 ? 's' : ''}</span>
                      {rp && rp.total > 0 && (
                        <span className={`text-xs font-medium ${isComplete ? 'text-green-600' : 'text-primary-600'}`}>
                          {isComplete ? `✓ ${rp.completed}/${rp.total}` : `${rp.percentage}%`}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          cityDistrict && (
            <div className="relative rounded-3xl overflow-hidden bg-white shadow-lg">
              <Image
                src="/city-district.png"
                alt="Smart city pilot district"
                width={1024}
                height={1536}
                className="w-full h-auto max-h-[280px] object-cover object-top"
                priority
              />
              <button
                type="button"
                onClick={() => router.push('/district?regionName=city-district')}
                className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between"
              >
                <div className="text-left">
                  <h2 className="text-lg font-bold text-white">{cityDistrict.displayName || 'City District'}</h2>
                  <p className="text-white/80 text-sm">Tap to enter</p>
                </div>
                <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            </div>
          )
        )}

        {activeRegions.length === 0 && !cityDistrict && (
          <div className="rounded-3xl bg-white/10 p-6 text-center">
            <p className="text-white/80 text-sm">No active regions yet. Check back later.</p>
          </div>
        )}
      </main>

      {/* Bottom nav - Figma event-app style (fixed, icon + label) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-20">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-around">
          <Link href="/me" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs font-medium">My Rooms</span>
          </Link>
          <Link href="/people" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-gray-600 hover:text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">People</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-gray-600 hover:text-primary-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
