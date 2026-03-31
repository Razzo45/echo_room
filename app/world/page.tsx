'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Region = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  questCount: number;
  completed: number;
  nextQuestName: string | null;
};

type ActiveRoom = {
  roomId: string;
  questName: string;
  regionId: string;
  currentBeat: number;
  totalBeats: number;
};

type WorldData = {
  event: { name: string; description: string | null } | null;
  regions: Region[];
  activeRoom: ActiveRoom | null;
};

type UserData = {
  user: {
    id: string;
    name: string;
    organisation: string;
    role: string;
    country: string;
    curiosity: string;
    badgeCount: number;
  };
  needsProfile?: boolean;
};

const REGION_MARKERS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export default function WorldPage() {
  const router = useRouter();
  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [totalQuests, setTotalQuests] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/world').then((r) => r.json()),
    ])
      .then(([uData, wData]) => {
        if (uData.error || wData.error) {
          router.push('/');
          return;
        }
        if (uData.needsProfile) {
          router.push('/profile');
          return;
        }
        setUserData(uData);
        setWorldData(wData);
        const active = (wData.regions || []).filter((r: Region) => r.isActive && r.questCount > 0);
        setTotalQuests(active.reduce((sum: number, r: Region) => sum + r.questCount, 0));
        setTotalCompleted(active.reduce((sum: number, r: Region) => sum + r.completed, 0));
        setLoading(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  if (loading || !worldData || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#312e81]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white mx-auto mb-4" />
          <p className="text-white/90 text-sm">Loading world...</p>
        </div>
      </div>
    );
  }

  const user = userData.user;
  const eventName = worldData.event?.name || 'Your Event';
  const eventDescription = worldData.event?.description || null;
  const activeRegions = worldData.regions.filter((r) => r.isActive && r.questCount > 0);
  const activeRoom = worldData.activeRoom;
  const progressPercent = totalQuests > 0 ? Math.round((totalCompleted / totalQuests) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#4338ca] via-[#312e81] to-[#1f2937] pb-44">
      {/* Header: event framing + player identity */}
      <header className="px-4 pt-6 pb-5 shrink-0">
        <h1 className="text-2xl font-bold text-white text-center font-display">{eventName}</h1>
        {eventDescription && (
          <p className="text-white/70 text-sm text-center mt-1 max-w-md mx-auto line-clamp-2">
            {eventDescription}
          </p>
        )}

        {/* Player identity card */}
        <div className="mt-4 mx-auto max-w-sm bg-white/12 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm truncate">{user.name}</p>
              <p className="text-white/60 text-xs truncate">
                {[user.role, user.organisation].filter(Boolean).join(' · ') || 'Participant'}
              </p>
            </div>
            {user.badgeCount > 0 && (
              <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 text-xs font-semibold">
                <span>★</span> {user.badgeCount}
              </div>
            )}
          </div>
          {/* Overall progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
              <span>Overall progress</span>
              <span>{totalCompleted}/{totalQuests} quests</span>
            </div>
            <div className="h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/80 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 overflow-auto">
        {/* Active room banner */}
        {activeRoom && (
          <button
            type="button"
            onClick={() => router.push(`/room/${activeRoom.roomId}/play`)}
            className="w-full mb-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 flex items-center gap-3 shadow-lg active:scale-[0.99] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-white font-semibold text-sm">Continue your story</p>
              <p className="text-amber-100 text-xs truncate">
                {activeRoom.questName} &middot; Beat {activeRoom.currentBeat} of {activeRoom.totalBeats}
              </p>
            </div>
            <svg className="w-5 h-5 text-white/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Region cards */}
        {activeRegions.length > 0 ? (
          <div className="space-y-3 pb-4">
            {activeRegions.map((region, idx) => {
              const isComplete = region.questCount > 0 && region.completed === region.questCount;
              const isStarted = region.completed > 0;
              const pct = region.questCount > 0 ? Math.round((region.completed / region.questCount) * 100) : 0;

              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => router.push(`/district?regionId=${region.id}`)}
                  className="w-full text-left bg-white/95 border border-amber-100 rounded-3xl shadow-lg p-5 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start gap-4">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${
                      isComplete
                        ? 'bg-emerald-100 text-emerald-700'
                        : isStarted
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isComplete ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        REGION_MARKERS[idx] || String(idx + 1)
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-base font-bold text-gray-900 truncate">{region.displayName}</h2>
                        {isComplete && (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Complete
                          </span>
                        )}
                        {!isComplete && isStarted && (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            In progress
                          </span>
                        )}
                      </div>
                      {region.description && (
                        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-2">{region.description}</p>
                      )}

                      {/* Progress bar */}
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 font-medium shrink-0">
                          {region.completed}/{region.questCount}
                        </span>
                      </div>

                      {/* Next quest preview */}
                      {!isComplete && region.nextQuestName && (
                        <p className="text-xs text-amber-700 font-medium truncate">
                          Next: {region.nextQuestName}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl bg-white/10 p-6 text-center">
            <p className="text-white/80 text-sm">No active regions yet. Check back later.</p>
          </div>
        )}
      </main>

      {/* Bottom stats strip */}
      <div className="fixed bottom-[6.25rem] left-0 right-0 z-10 pointer-events-none">
        <div className="max-w-lg mx-auto px-4">
          <div className="pointer-events-auto bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl px-5 py-2.5 flex items-center justify-around shadow-xl">
            <div className="text-center">
              <p className="text-white font-bold text-sm">{totalCompleted}/{totalQuests}</p>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider">Quests</p>
            </div>
            <div className="w-px h-6 bg-gray-700" />
            <div className="text-center">
              <p className="text-amber-400 font-bold text-sm">{user.badgeCount}</p>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider">Badges</p>
            </div>
            <div className="w-px h-6 bg-gray-700" />
            <div className="text-center">
              <p className="text-white font-bold text-sm">{progressPercent}%</p>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider">Progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-xl border-t border-amber-100 safe-bottom z-20">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-around">
          <Link href="/me" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-amber-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs font-medium">My Rooms</span>
          </Link>
          <Link href="/people" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-gray-600 hover:text-amber-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">People</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-gray-600 hover:text-amber-700">
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
