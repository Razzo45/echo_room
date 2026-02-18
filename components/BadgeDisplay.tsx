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
  byRarity: Record<Rarity, number>;
  recent: Badge[];
};

type ProgressHint = {
  badgeType: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  hint: string;
  percent: number;
};

const RARITY_ORDER: Rarity[] = ['legendary', 'epic', 'rare', 'common'];
const JOURNEY_ORDER = [
  'FIRST_QUEST_COMPLETE', 'TEAM_PLAYER', 'COLLABORATOR', 'DECISION_MAKER', 'ARTIFACT_CREATOR',
  'STORYTELLER', 'PERFECT_TEAM', 'CONSENSUS_BUILDER', 'QUEST_MASTER', 'DIVERSITY_CHAMPION',
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

function sortBadgesByRarityAndJourney(badges: Badge[]): Badge[] {
  const journeyIndex = (t: string) => {
    const i = JOURNEY_ORDER.indexOf(t);
    return i === -1 ? 999 : i;
  };
  const rarityRank = (r: Rarity) => RARITY_ORDER.indexOf(r);
  return [...badges].sort((a, b) => {
    const rA = rarityRank(a.rarity as Rarity);
    const rB = rarityRank(b.rarity as Rarity);
    if (rA !== rB) return rA - rB;
    const jA = journeyIndex(a.badgeType);
    const jB = journeyIndex(b.badgeType);
    if (jA !== jB) return jA - jB;
    return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
  });
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
        if (data.badges) {
          setBadges(data.badges);
          setStats(data.stats);
        }
        if (progressData?.hints) setProgressHints(progressData.hints);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No badges earned yet</p>
          <p className="text-xs mt-1">Complete quests to earn badges!</p>
        </div>
        {progressHints.length > 0 && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <p className="text-sm font-semibold text-indigo-900 mb-2">Next up</p>
            <p className="text-sm text-indigo-800">{progressHints[0].hint}</p>
            <p className="text-xs text-indigo-600 mt-1">{progressHints[0].name} — {progressHints[0].description}</p>
          </div>
        )}
      </div>
    );
  }

  const sortedBadges = sortBadgesByRarityAndJourney(badges);
  const nextHint = progressHints[0];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {sortedBadges.slice(0, 5).map((badge) => (
          <div
            key={badge.id}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${rarityColors[badge.rarity]}`}
            title={`${badge.name}: ${badge.description}`}
          >
            <span className="text-lg">{badge.icon}</span>
            <span className="text-xs font-semibold">{badge.name}</span>
          </div>
        ))}
        {sortedBadges.length > 5 && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full border-2 border-gray-300 bg-gray-50 text-gray-600">
            <span className="text-xs font-semibold">+{sortedBadges.length - 5} more</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress hint: next badge to work toward */}
      {nextHint && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 flex items-start gap-3">
          <span className="text-2xl">{nextHint.icon}</span>
          <div>
            <p className="text-sm font-semibold text-indigo-900">You&apos;re close: {nextHint.name}</p>
            <p className="text-sm text-indigo-800 mt-0.5">{nextHint.hint}</p>
            {nextHint.percent > 0 && nextHint.percent < 100 && (
              <div className="mt-2 w-full bg-indigo-200 rounded-full h-1.5">
                <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${nextHint.percent}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600">{stats.total}</div>
            <div className="text-xs text-gray-600 mt-1">Total Badges</div>
          </div>
          {RARITY_ORDER.filter((r) => (stats.byRarity[r] ?? 0) > 0).map((rarity) => (
            <div key={rarity} className="card text-center">
              <div className={`text-2xl font-bold ${rarityColors[rarity].split(' ')[2]}`}>
                {stats.byRarity[rarity] ?? 0}
              </div>
              <div className="text-xs text-gray-600 mt-1 capitalize">{rarity}</div>
            </div>
          ))}
        </div>
      )}

      {/* Badge Grid — sorted by rarity (legendary first) then journey order */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedBadges.map((badge) => (
          <div
            key={badge.id}
            className={`card border-2 ${rarityColors[badge.rarity]} bg-gradient-to-br ${rarityGradients[badge.rarity]} hover:shadow-lg transition-all cursor-pointer`}
            title={badge.description}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">{badge.icon}</div>
              <div className="font-bold text-sm mb-1">{badge.name}</div>
              <div className="text-xs opacity-75 mb-2">{badge.description}</div>
              <div className="text-xs opacity-60">
                {new Date(badge.earnedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
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
