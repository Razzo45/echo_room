'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export type StatsPanelKind = 'quests' | 'badges' | 'progress' | null;

type QuestItem = { id: string; name: string; completed: boolean };
type RegionWithQuests = {
  id: string;
  displayName: string;
  completed: number;
  questCount: number;
  quests?: QuestItem[];
};

type BadgeItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  earnedAt: string;
};

type Props = {
  open: StatsPanelKind;
  onClose: () => void;
  regions: RegionWithQuests[];
  totalCompleted: number;
  totalQuests: number;
  progressPercent: number;
  badgeCount: number;
};

export default function WorldStatsPanel({
  open,
  onClose,
  regions,
  totalCompleted,
  totalQuests,
  progressPercent,
  badgeCount,
}: Props) {
  const [badges, setBadges] = useState<BadgeItem[] | null>(null);
  const [levelLabel, setLevelLabel] = useState<string | null>(null);
  const [loadingBadges, setLoadingBadges] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open !== 'badges') return;
    setLoadingBadges(true);
    fetch('/api/badges')
      .then((r) => r.json())
      .then((data) => {
        setBadges(data.badges || []);
      })
      .catch(() => setBadges([]))
      .finally(() => setLoadingBadges(false));
  }, [open]);

  useEffect(() => {
    if (open !== 'progress') return;
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.levelLabel) setLevelLabel(data.levelLabel);
      })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const title =
    open === 'quests' ? 'Quests' : open === 'badges' ? 'Badges' : 'Progress';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-panel-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md max-h-[75vh] overflow-hidden flex flex-col bg-echovoid-panel border border-echovoid-cyan/35 shadow-glowCyan animate-slide-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-echovoid-cyan/25">
          <h2
            id="stats-panel-title"
            className="font-display text-sm uppercase tracking-[0.2em] text-echovoid-cyan"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-echovoid-dim hover:text-echovoid-chrome text-sm px-2 py-1"
          >
            Close
          </button>
        </div>

        <div className="overflow-auto px-4 py-4 space-y-3">
          {open === 'quests' && (
            <>
              <p className="text-xs text-echovoid-dim font-mono">
                {totalCompleted}/{totalQuests} completed across regions
              </p>
              {regions.filter((r) => r.questCount > 0).length === 0 ? (
                <p className="text-sm text-echovoid-dim">No quests published yet.</p>
              ) : (
                regions
                  .filter((r) => r.questCount > 0)
                  .map((region) => (
                    <div key={region.id} className="border border-echovoid-cyan/20 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-echovoid-chrome font-display tracking-wide">
                          {region.displayName}
                        </h3>
                        <span className="text-xs font-mono text-echovoid-dim">
                          {region.completed}/{region.questCount}
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {(region.quests || []).map((q) => (
                          <li key={q.id} className="flex items-start gap-2 text-sm">
                            <span
                              className={
                                q.completed
                                  ? 'text-echovoid-cyan mt-0.5'
                                  : 'text-echovoid-dim mt-0.5'
                              }
                              aria-hidden
                            >
                              {q.completed ? '✓' : '○'}
                            </span>
                            <span
                              className={
                                q.completed
                                  ? 'text-echovoid-chrome'
                                  : 'text-echovoid-dim'
                              }
                            >
                              {q.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/district?regionId=${region.id}`}
                        onClick={onClose}
                        className="inline-block text-xs text-echovoid-cyan hover:underline"
                      >
                        Open region →
                      </Link>
                    </div>
                  ))
              )}
            </>
          )}

          {open === 'badges' && (
            <>
              <p className="text-xs text-echovoid-dim font-mono">
                {badgeCount} earned
              </p>
              {loadingBadges && (
                <p className="text-sm text-echovoid-dim">Loading badges…</p>
              )}
              {!loadingBadges && badges && badges.length === 0 && (
                <p className="text-sm text-echovoid-dim">
                  No badges yet — finish a story room to earn your first.
                </p>
              )}
              {!loadingBadges &&
                badges &&
                badges.map((b) => (
                  <div
                    key={b.id}
                    className="border border-echovoid-magenta/30 bg-echovoid-magenta/5 p-3 flex gap-3"
                  >
                    <span className="text-2xl shrink-0" aria-hidden>
                      {b.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-echovoid-chrome">
                        {b.name}
                      </p>
                      <p className="text-xs text-echovoid-dim mt-0.5">{b.description}</p>
                      <p className="text-[10px] uppercase tracking-wider text-echovoid-magenta mt-1">
                        {b.rarity}
                      </p>
                    </div>
                  </div>
                ))}
              <Link
                href="/badges"
                onClick={onClose}
                className="inline-block text-xs text-echovoid-cyan hover:underline pt-1"
              >
                Full badge board →
              </Link>
            </>
          )}

          {open === 'progress' && (
            <>
              <div className="border border-echovoid-cyan/25 p-4 space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-echovoid-dim">
                      Overall
                    </p>
                    <p className="text-3xl font-mono font-bold text-echovoid-cyan">
                      {progressPercent}%
                    </p>
                  </div>
                  {levelLabel && (
                    <span className="level-banner">{levelLabel}</span>
                  )}
                </div>
                <div className="h-2 bg-echovoid-cyan/10 border border-echovoid-cyan/20 overflow-hidden">
                  <div
                    className="h-full bg-echovoid-cyan transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-echovoid-dim font-mono">
                  {totalCompleted} of {totalQuests} quests complete
                </p>
              </div>

              <h3 className="text-[10px] uppercase tracking-wider text-echovoid-dim pt-1">
                By region
              </h3>
              {regions
                .filter((r) => r.questCount > 0)
                .map((r) => {
                  const pct =
                    r.questCount > 0
                      ? Math.round((100 * r.completed) / r.questCount)
                      : 0;
                  return (
                    <div key={r.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-echovoid-chrome">{r.displayName}</span>
                        <span className="font-mono text-echovoid-dim">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-echovoid-cyan/10 overflow-hidden">
                        <div
                          className="h-full bg-echovoid-magenta/80"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
