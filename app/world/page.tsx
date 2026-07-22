'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DualSurfaceNav from '@/components/DualSurfaceNav';
import WorldStatsPanel, { type StatsPanelKind } from '@/components/WorldStatsPanel';

type Region = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  questCount: number;
  completed: number;
  nextQuestName: string | null;
  quests?: Array<{ id: string; name: string; completed: boolean }>;
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
  const [statsPanel, setStatsPanel] = useState<StatsPanelKind>(null);

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
      <div className="min-h-screen flex items-center justify-center bg-echovoid-void">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-echovoid-cyan/30 border-t-echovoid-cyan mx-auto mb-4" />
          <p className="text-echovoid-chrome/80 text-sm font-display uppercase tracking-wider">Loading playspace…</p>
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
    <div className="min-h-screen flex flex-col bg-[var(--theme-bg)] pb-44">
      <DualSurfaceNav />
      {/* Header: event framing + player identity */}
      <header className="px-4 pt-5 pb-5 shrink-0 border-b border-echovoid-cyan/20">
        <p className="text-[10px] uppercase tracking-[0.25em] text-echovoid-cyan/70 text-center mb-1 font-display">
          Echo Room playspace
        </p>
        <h1 className="text-2xl font-bold text-echovoid-cyan text-center font-display tracking-wide uppercase">
          {eventName}
        </h1>
        {eventDescription && (
          <p className="text-echovoid-dim text-sm text-center mt-1 max-w-md mx-auto line-clamp-2">
            {eventDescription}
          </p>
        )}

        {/* Player identity card */}
        <div className="mt-4 mx-auto max-w-sm card !p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-sm bg-echovoid-cyan/15 border border-echovoid-cyan/40 flex items-center justify-center text-echovoid-cyan font-bold text-lg shrink-0 font-display ring-2 ring-echovoid-cyan/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-echovoid-chrome font-semibold text-sm truncate">{user.name}</p>
              <p className="text-echovoid-dim text-xs truncate">
                {[user.role, user.organisation].filter(Boolean).join(' · ') || 'Participant'}
              </p>
            </div>
            {user.badgeCount > 0 && (
              <div className="level-banner shrink-0">
                <span>★</span> {user.badgeCount}
              </div>
            )}
          </div>
          {/* Overall progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-echovoid-dim mb-1">
              <span>Overall progress</span>
              <span>{totalCompleted}/{totalQuests} quests</span>
            </div>
            <div className="h-2 rounded-sm bg-echovoid-cyan/10 overflow-hidden border border-echovoid-cyan/20">
              <div
                className="h-full bg-echovoid-cyan transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 overflow-auto">
        <div className="surface-shell !px-0">
        {/* Active room banner */}
        {activeRoom && (
          <button
            type="button"
            onClick={() => router.push(`/room/${activeRoom.roomId}/play`)}
            className="w-full max-w-lg mx-auto mb-4 btn btn-primary !rounded-sm flex items-center gap-3 !justify-start shadow-glowCyan"
          >
            <div className="w-10 h-10 rounded-sm bg-black/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="font-semibold text-sm">Continue your story</p>
              <p className="text-xs opacity-80 truncate">
                {activeRoom.questName} &middot; Beat {activeRoom.currentBeat} of {activeRoom.totalBeats}
              </p>
            </div>
            <svg className="w-5 h-5 opacity-80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Region cards: vertical on mobile; 2/3-up centered leftovers on desktop */}
        {activeRegions.length > 0 ? (
          <div className="surface-card-grid pb-4">
            {activeRegions.map((region, idx) => {
              const isComplete = region.questCount > 0 && region.completed === region.questCount;
              const isStarted = region.completed > 0;
              const pct = region.questCount > 0 ? Math.round((region.completed / region.questCount) * 100) : 0;

              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => router.push(`/district?regionId=${region.id}`)}
                  className="w-full text-left card !p-5 active:scale-[0.99] transition-transform h-full flex flex-col"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <span className={`w-12 h-12 rounded-sm flex items-center justify-center text-sm font-bold shrink-0 font-display border ${
                      isComplete
                        ? 'bg-echovoid-cyan/15 text-echovoid-cyan border-echovoid-cyan/40'
                        : isStarted
                          ? 'bg-echovoid-magenta/15 text-echovoid-magenta border-echovoid-magenta/40'
                          : 'bg-echovoid-panel text-echovoid-dim border-echovoid-cyan/20'
                    }`}>
                      {isComplete ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        REGION_MARKERS[idx] || String(idx + 1)
                      )}
                    </span>
                    <div className="min-w-0 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-base font-bold text-echovoid-chrome truncate font-display tracking-wide">{region.displayName}</h2>
                        {isComplete && (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-echovoid-cyan border border-echovoid-cyan/40 px-2 py-0.5">
                            Complete
                          </span>
                        )}
                        {!isComplete && isStarted && (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-echovoid-magenta border border-echovoid-magenta/40 px-2 py-0.5">
                            In progress
                          </span>
                        )}
                      </div>
                      {region.description && (
                        <p className="text-sm text-echovoid-dim leading-relaxed line-clamp-2 mb-2 md:line-clamp-3">{region.description}</p>
                      )}

                      <div className="mt-auto">
                      {/* Progress bar */}
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="flex-1 h-1.5 rounded-sm bg-echovoid-cyan/10 overflow-hidden border border-echovoid-cyan/15">
                          <div
                            className={`h-full transition-all duration-500 ${isComplete ? 'bg-echovoid-cyan' : 'bg-echovoid-magenta'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-echovoid-dim font-medium shrink-0 font-mono">
                          {region.completed}/{region.questCount}
                        </span>
                      </div>

                      {!isComplete && region.nextQuestName && (
                        <p className="text-xs text-echovoid-cyan font-medium truncate">
                          Next: {region.nextQuestName}
                        </p>
                      )}
                      </div>
                    </div>
                    <span className="shrink-0 w-8 h-8 rounded-sm border border-echovoid-cyan/25 flex items-center justify-center mt-1 md:hidden">
                      <svg className="w-4 h-4 text-echovoid-cyan/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="card p-6 text-center max-w-lg">
            <p className="text-echovoid-dim text-sm">No active regions yet. Check back later.</p>
          </div>
        )}
        </div>
      </main>

      {/* Bottom stats strip — tap for details */}
      <div className="fixed bottom-[6.25rem] left-0 right-0 z-10 pointer-events-none">
        <div className="max-w-lg mx-auto px-4">
          <div className="pointer-events-auto bg-echovoid-panel/95 border border-echovoid-cyan/25 backdrop-blur-md rounded-sm px-2 py-1 flex items-stretch justify-around shadow-glowCyan">
            <button
              type="button"
              onClick={() => setStatsPanel('quests')}
              className="flex-1 text-center py-2 px-1 rounded-sm hover:bg-echovoid-cyan/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-echovoid-cyan transition-colors"
            >
              <p className="text-echovoid-chrome font-bold text-sm font-mono">{totalCompleted}/{totalQuests}</p>
              <p className="text-echovoid-dim text-[10px] uppercase tracking-wider">Quests</p>
            </button>
            <div className="w-px self-stretch my-2 bg-echovoid-cyan/20" />
            <button
              type="button"
              onClick={() => setStatsPanel('badges')}
              className="flex-1 text-center py-2 px-1 rounded-sm hover:bg-echovoid-magenta/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-echovoid-magenta transition-colors"
            >
              <p className="text-echovoid-magenta font-bold text-sm font-mono">{user.badgeCount}</p>
              <p className="text-echovoid-dim text-[10px] uppercase tracking-wider">Badges</p>
            </button>
            <div className="w-px self-stretch my-2 bg-echovoid-cyan/20" />
            <button
              type="button"
              onClick={() => setStatsPanel('progress')}
              className="flex-1 text-center py-2 px-1 rounded-sm hover:bg-echovoid-cyan/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-echovoid-cyan transition-colors"
            >
              <p className="text-echovoid-cyan font-bold text-sm font-mono">{progressPercent}%</p>
              <p className="text-echovoid-dim text-[10px] uppercase tracking-wider">Progress</p>
            </button>
          </div>
        </div>
      </div>

      <WorldStatsPanel
        open={statsPanel}
        onClose={() => setStatsPanel(null)}
        regions={activeRegions}
        totalCompleted={totalCompleted}
        totalQuests={totalQuests}
        progressPercent={progressPercent}
        badgeCount={user.badgeCount}
      />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-echovoid-panel/95 backdrop-blur-xl border-t border-echovoid-cyan/25 safe-bottom z-20">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-around">
          <Link href="/me" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-echovoid-cyan">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs font-medium">My Rooms</span>
          </Link>
          <Link href="/people" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-echovoid-dim hover:text-echovoid-cyan">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium">People</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 py-2 min-w-[72px] text-echovoid-dim hover:text-echovoid-cyan">
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
