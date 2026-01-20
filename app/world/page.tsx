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

export default function WorldPage() {
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [showCityInfo, setShowCityInfo] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/world').then((r) => r.json()),
    ])
      .then(([userData, worldData]) => {
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
        setLoading(false);
      })
      .catch(() => {
        router.push('/');
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading world...</p>
        </div>
      </div>
    );
  }

  const cityDistrict = regions.find((r) => r.name === 'city-district');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-blue-200 mb-2">Welcome back, {userName}</p>
          <h1 className="text-4xl font-bold text-white mb-2">World Map</h1>
          <p className="text-blue-200">Select a region to begin your quest</p>
        </div>

        {/* City District Image Container */}
        <div className="relative mb-8 bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto">
          <Image
            src="/city-district.png"
            alt="Isometric illustration of a smart city pilot district"
            width={1024}
            height={1536}
            className="w-full h-auto"
            priority
            onClick={() => setShowCityInfo(true)}
          />

          {/* City District Active Overlay - Always Visible */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              onClick={() => router.push('/district')}
              className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl px-8 py-6 pointer-events-auto hover:bg-white transition transform hover:scale-105 active:scale-95"
            >
              <div className="flex items-center gap-4 mb-3">
                <span className="text-5xl">🏙️</span>
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-gray-900">City District</h2>
                  <p className="text-sm text-gray-600">Smart City Pilot Zone</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="px-4 py-1.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                  ✓ ACTIVE
                </span>
                <span className="text-blue-600 font-semibold text-base flex items-center gap-2">
                  Tap to Enter
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </button>
          </div>

          {/* Locked Zone Labels - Non-interactive */}
          <div className="absolute top-6 left-6 bg-gray-800/85 backdrop-blur-sm text-gray-300 px-4 py-2.5 rounded-lg text-sm shadow-lg pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏭</span>
              <span className="font-semibold">Factory Hub</span>
            </div>
            <div className="text-xs text-gray-400 pl-7">Unlocks later in 2026</div>
          </div>

          <div className="absolute top-6 right-6 bg-gray-800/85 backdrop-blur-sm text-gray-300 px-4 py-2.5 rounded-lg text-sm shadow-lg pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎓</span>
              <span className="font-semibold">Campus Zone</span>
            </div>
            <div className="text-xs text-gray-400 pl-7">Unlocks later in 2026</div>
          </div>

          <div className="absolute bottom-32 right-6 bg-gray-800/85 backdrop-blur-sm text-gray-300 px-4 py-2.5 rounded-lg text-sm shadow-lg pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏛️</span>
              <span className="font-semibold">Policy Hall</span>
            </div>
            <div className="text-xs text-gray-400 pl-7">Unlocks later in 2026</div>
          </div>

          <div className="absolute bottom-6 left-6 bg-gray-800/85 backdrop-blur-sm text-gray-300 px-4 py-2.5 rounded-lg text-sm shadow-lg pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🚢</span>
              <span className="font-semibold">Border Port</span>
            </div>
            <div className="text-xs text-gray-400 pl-7">Unlocks later in 2026</div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white text-center max-w-2xl mx-auto mb-6">
          <p className="text-sm mb-2">📍 You are viewing the Smart City World Map</p>
          <p className="text-xs text-blue-200">Tap the City District to explore available quests</p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-4">
          <Link href="/me" className="btn btn-secondary">
            My Rooms & Artifacts
          </Link>
        </div>
      </div>
    </div>
  );
}
