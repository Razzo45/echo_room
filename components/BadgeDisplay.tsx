'use client';

import { useState, useEffect } from 'react';

type Badge = {
  id: string;
  badgeType: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  roomId?: string | null;
  metadata?: any;
  earnedAt: string;
};

type BadgeStats = {
  total: number;
  byRarity: Record<string, number>;
  recent: Badge[];
};

const rarityColors = {
  common: 'bg-gray-100 border-gray-300 text-gray-800',
  rare: 'bg-blue-100 border-blue-300 text-blue-800',
  epic: 'bg-purple-100 border-purple-300 text-purple-800',
  legendary: 'bg-yellow-100 border-yellow-400 text-yellow-900',
};

const rarityGradients = {
  common: 'from-gray-50 to-gray-100',
  rare: 'from-blue-50 to-blue-100',
  epic: 'from-purple-50 to-purple-100',
  legendary: 'from-yellow-50 to-yellow-100',
};

export function BadgeDisplay({ userId, compact = false }: { userId?: string; compact?: boolean }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = userId ? `/api/badges/${userId}` : '/api/badges';
    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => {
        if (data.badges) {
          setBadges(data.badges);
          setStats(data.stats);
        }
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
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No badges earned yet</p>
        <p className="text-xs mt-1">Complete quests to earn badges!</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {badges.slice(0, 5).map((badge) => (
          <div
            key={badge.id}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${rarityColors[badge.rarity]}`}
            title={`${badge.name}: ${badge.description}`}
          >
            <span className="text-lg">{badge.icon}</span>
            <span className="text-xs font-semibold">{badge.name}</span>
          </div>
        ))}
        {badges.length > 5 && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full border-2 border-gray-300 bg-gray-50 text-gray-600">
            <span className="text-xs font-semibold">+{badges.length - 5} more</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600">{stats.total}</div>
            <div className="text-xs text-gray-600 mt-1">Total Badges</div>
          </div>
          {Object.entries(stats.byRarity).map(([rarity, count]) => (
            <div key={rarity} className="card text-center">
              <div className={`text-2xl font-bold ${rarityColors[rarity].split(' ')[2]}`}>
                {count}
              </div>
              <div className="text-xs text-gray-600 mt-1 capitalize">{rarity}</div>
            </div>
          ))}
        </div>
      )}

      {/* Badge Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {badges.map((badge) => (
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
