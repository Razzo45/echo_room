'use client';

import { useState, useEffect } from 'react';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

type Badge = {
  id: string;
  badgeType: string;
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  roomId?: string | null;
  metadata?: any;
  earnedAt: string;
};

type BadgeStats = {
  total: number;
  byRarity: Record<string, number>;
  recent: Badge[];
};

type ProgressHint = {
  badgeType: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  hint: string;
  current: number;
  target: number;
  percent: number;
};

const JOURNEY_ORDER = [
  'FIRST_CHAPTER', 'NATURAL_TWENTY', 'FUMBLE', 'HOT_STREAK', 'RISING_PHOENIX',
  'UNITED_FRONT', 'SEASONED_ADVENTURER', 'SOCIAL_BUTTERFLY', 'ARTIFACT_COLLECTOR',
  'LEGENDARY_CAMPAIGN',
];

const rarityColors: Record<Rarity, string> = {
  common: 'bg-gray-100 border-gray-300 text-gray-800',
  rare: 'bg-blue-100 border-blue-300 text-blue-800',
  epic: 'bg-purple-100 border-purple-300 text-purple-800',
  legendary: 'bg-yellow-100 border-yellow-400 text-yellow-900',
};

const rarityGradients: Record<Rarity, string> = {
  common: 'from-gray-50 to-gray-100',
  rare: 'from-blue-50 to-blue-100',
  epic: 'from-purple-50 to-purple-100',
  legendary: 'from-yellow-50 to-yellow-100',
};

const rarityBarColors: Record<string, string> = {
  common: 'bg-gray-500',
  rare: 'bg-blue-500',
  epic: 'bg-purple-500',
  legendary: 'bg-yellow-500',
};

const RARITY_ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'common'];

function sortBadgesByJourney(badges: Badge[]): Badge[] {
  const idx = (t: string) => { const i = JOURNEY_ORDER.indexOf(t); return i === -1 ? 999 : i; };
  return [...badges].sort((a, b) => idx(a.badgeType) - idx(b.badgeType));
}

export function BadgeDisplay({ userId, compact = false }: { userId?: string; compact?: boolean }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [progressHints, setProgressHints] = useState<ProgressHint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = userId ? `/api/badges/${userId}` : '/api/badges';
    const progressUrl = userId ? null : '/api/badges/progress';
    Promise.all([
      fetch(endpoint).then((r) => r.json()),
      progressUrl ? fetch(progressUrl).then((r) => r.json()) : Promise.resolve({ hints: [] }),
    ])
      .then(([data, progressData]) => {
        if (data.badges) { setBadges(data.badges); setStats(data.stats); }
        if (progressData?.hints) setProgressHints(progressData.hints);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
      </div>
    );
  }

  const earnedTypes = new Set(badges.map((b) => b.badgeType));
  const earnedMap = new Map(badges.map((b) => [b.badgeType, b]));
  const progressMap = new Map(progressHints.map((h) => [h.badgeType, h]));

  if (compact) {
    const sorted = sortBadgesByJourney(badges);
    return (
      <div className="flex flex-wrap gap-2">
        {sorted.slice(0, 5).map((badge) => (
          <div
            key={badge.id}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${rarityColors[badge.rarity]}`}
            title={`${badge.name}: ${badge.description}`}
          >
            <span className="text-lg">{badge.icon}</span>
            <span className="text-xs font-semibold">{badge.name}</span>
          </div>
        ))}
        {sorted.length > 5 && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full border-2 border-gray-300 bg-gray-50 text-gray-600">
            <span className="text-xs font-semibold">+{sorted.length - 5} more</span>
          </div>
        )}
      </div>
    );
  }

  const earnedCount = badges.length;
  const total = JOURNEY_ORDER.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-gray-900">{earnedCount} / {total} Badges</p>
          <p className="text-xs text-gray-500">
            {earnedCount === 0
              ? 'Complete story rooms to start earning badges.'
              : earnedCount === total
                ? 'All badges earned. Legendary!'
                : `${total - earnedCount} remaining — keep playing.`}
          </p>
        </div>
        {stats && (
          <div className="flex gap-3">
            {RARITY_ORDER.filter((r) => (stats.byRarity[r] ?? 0) > 0).map((rarity) => (
              <div key={rarity} className="text-center">
                <div className={`text-lg font-bold ${rarityColors[rarity].split(' ')[2]}`}>
                  {stats.byRarity[rarity]}
                </div>
                <div className="text-[10px] text-gray-500 capitalize">{rarity}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badge journey — all 10, earned or locked */}
      <div className="grid gap-3">
        {JOURNEY_ORDER.map((bt) => {
          const earned = earnedTypes.has(bt);
          const badge = earnedMap.get(bt);
          const progress = progressMap.get(bt);
          const def = progress ?? badge;
          if (!def) return null;

          const rarity = (def.rarity ?? 'common') as Rarity;
          const pct = earned ? 100 : (progress?.percent ?? 0);

          return (
            <div
              key={bt}
              className={`rounded-2xl border-2 p-4 transition-all ${
                earned
                  ? `${rarityColors[rarity]} bg-gradient-to-br ${rarityGradients[rarity]}`
                  : 'border-gray-200 bg-gray-50/60 opacity-80'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`text-3xl ${earned ? '' : 'grayscale opacity-40'}`}>{def.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold ${earned ? '' : 'text-gray-500'}`}>{def.name}</p>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      earned ? rarityColors[rarity] : 'bg-gray-200 text-gray-500'
                    }`}>
                      {rarity}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${earned ? 'opacity-80' : 'text-gray-400'}`}>
                    {def.description}
                  </p>
                  {earned && badge && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Earned {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  )}
                  {!earned && progress && (
                    <p className="text-xs text-gray-500 mt-1">{progress.hint}</p>
                  )}
                  {/* Progress bar */}
                  {pct > 0 && pct < 100 && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${rarityBarColors[rarity] ?? 'bg-gray-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {pct > 0 && pct < 100 && progress && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {progress.current}/{progress.target}
                    </p>
                  )}
                </div>
                {earned && (
                  <span className="text-emerald-500 text-lg flex-shrink-0">&#10003;</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BadgeNotification({ badge }: { badge: Badge }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div
        className={`card border-2 ${rarityColors[badge.rarity]} bg-gradient-to-br ${rarityGradients[badge.rarity]} shadow-xl max-w-sm`}
      >
        <div className="flex items-center gap-4">
          <div className="text-4xl">{badge.icon}</div>
          <div className="flex-1">
            <div className="font-bold text-lg">{badge.name}</div>
            <div className="text-sm opacity-75">{badge.description}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
