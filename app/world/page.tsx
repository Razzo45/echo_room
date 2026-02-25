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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-900 via-primary-800 to-primary-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white mx-auto mb-4" />
          <p className="text-primary-200 text-sm">Loading world…</p>
        </div>
      </div>
    );
  }

  const activeRegions = regions.filter((r) => r.isActive && r.questCount > 0);
  const cityDistrict = regions.find((r) => r.name === 'city-district');

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-900 via-primary-800 to-primary-900 py-6 sm:py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <p className="text-primary-200 text-sm font-medium mb-1">Welcome back, {userName}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">World Map</h1>
          <p className="text-primary-200/90 text-sm">Select a region to begin your quest</p>
          {identity && (identity.role || identity.country || identity.curiosity) && (
            <p className="mt-3 text-sm text-primary-100/90 max-w-md mx-auto">
              Exploring <span className="font-semibold text-white">{eventName}</span>
              {identity.role && identity.country && <> as {identity.role} from {identity.country}</>}
              {identity.role && !identity.country && <> as {identity.role}</>}
              {!identity.role && identity.country && <> from {identity.country}</>}
              {identity.curiosity && <> · Curious about: {identity.curiosity}</>}
            </p>
          )}
          {progress && progress.eventProgress.total > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <span className="text-white font-semibold text-sm">
                Event progress: {progress.eventProgress.completed} / {progress.eventProgress.total} quests
              </span>
            </div>
          )}
        </header>

        {/* Regions */}
        {activeRegions.length > 0 ? (
          <div className="space-y-4 mb-8">
            {activeRegions.map((region) => {
              const rp = progress?.regions.find((pr) => pr.id === region.id);
              const isComplete = rp && rp.total > 0 && rp.completed === rp.total;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => router.push(`/district?regionId=${region.id}`)}
                  className="w-full text-left bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-5 sm:p-6 hover:bg-white hover:shadow-xl hover:border-white/30 transition-all duration-200 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <span className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center text-2xl">
                        📍
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-xl font-bold text-gray-900 truncate">{region.displayName}</h2>
                        {region.description && (
                          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{region.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{region.questCount} quest{region.questCount !== 1 ? 's' : ''} available</p>
                        {rp && rp.total > 0 && (
                          <p className={`text-xs font-medium mt-1 ${isComplete ? 'text-green-600' : 'text-primary-600'}`}>
                            {isComplete ? `✓ ${rp.total}/${rp.total} completed` : `${rp.displayName}: ${rp.percentage}% (${rp.completed}/${rp.total})`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Active</span>
                      <span className="text-primary-600 font-semibold text-sm flex items-center">
                        Enter
                        <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          cityDistrict && (
            <div className="relative mb-8 bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto border border-white/20">
              <Image
                src="/city-district.png"
                alt="Isometric illustration of a smart city pilot district"
                width={1024}
                height={1536}
                className="w-full h-auto"
                priority
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
                <button
                  type="button"
                  onClick={() => router.push('/district?regionName=city-district')}
                  className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl px-6 py-5 pointer-events-auto hover:bg-white transition-all hover:shadow-2xl active:scale-[0.99] border border-white/20"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">🏙️</span>
                    <div className="text-left">
                      <h2 className="text-xl font-bold text-gray-900">{cityDistrict.displayName || 'City District'}</h2>
                      <p className="text-sm text-gray-600">Smart City Pilot Zone</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 mt-2">
                    <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Active</span>
                    <span className="text-primary-600 font-semibold text-sm flex items-center">Tap to enter →</span>
                  </div>
                </button>
              </div>
            </div>
          )
        )}

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center max-w-xl mx-auto mb-8 border border-white/10">
          <p className="text-sm text-primary-100">Explore regions and complete quests with your team.</p>
          {activeRegions.length === 0 && !cityDistrict && (
            <p className="text-xs text-primary-200/90 mt-1">No active regions yet. Check back later.</p>
          )}
        </div>

        <nav className="flex flex-wrap justify-center gap-3">
          <Link href="/me" className="btn btn-secondary bg-white/90 hover:bg-white text-gray-800 border-white/30">
            My Rooms & Artifacts
          </Link>
          <Link href="/people" className="btn btn-secondary bg-white/90 hover:bg-white text-gray-800 border-white/30">
            People
          </Link>
          <Link href="/profile" className="btn btn-secondary bg-white/90 hover:bg-white text-gray-800 border-white/30">
            Profile
          </Link>
        </nav>
      </div>
    </div>
  );
}
