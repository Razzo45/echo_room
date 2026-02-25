'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Quest = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  questType?: 'DECISION_ROOM' | 'FORM' | 'SURVEY';
};

export default function DistrictPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string>('City District');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const regionId = params.get('regionId');
    const regionNameParam = params.get('regionName') || 'city-district';
    const questsUrl = regionId ? `/api/quests?regionId=${regionId}` : `/api/quests?regionName=${regionNameParam}`;

    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch(questsUrl).then((r) => r.json()),
    ])
      .then(([userData, questsData]) => {
        if (userData.error) {
          router.push('/');
          return;
        }
        if (questsData.error) {
          setLoading(false);
          return;
        }
        const allQuests = questsData.quests || [];
        const decisionRoomQuests = allQuests.filter(
          (q: Quest) => !q.questType || q.questType === 'DECISION_ROOM'
        );
        setQuests(decisionRoomQuests);
        if (decisionRoomQuests.length > 0 && (decisionRoomQuests[0] as { regionName?: string }).regionName) {
          setRegionName((decisionRoomQuests[0] as { regionName: string }).regionName);
        }
        setLoading(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  const handleJoinQuest = async (questId: string) => {
    setJoiningId(questId);
    try {
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to join quest. Please try again.');
        setJoiningId(null);
        return;
      }
      if (data.roomId) router.push(`/room/${data.roomId}`);
      else alert(data.message || 'Failed to join quest.');
    } catch {
      alert('Failed to join quest. Please try again.');
      setJoiningId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading quests…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Back bar - mobile */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/world" className="p-2 -ml-2 rounded-xl text-primary-600 hover:bg-primary-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">World</span>
        </Link>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1 text-center pr-12">{regionName}</h1>
      </div>

      <main className="px-4 pt-4 max-w-lg mx-auto">
        <p className="text-gray-500 text-sm mb-4">Choose a quest to begin</p>

        <div className="space-y-4">
          {quests.map((quest) => (
            <div key={quest.id} className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex gap-3 mb-3">
                  <span className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center text-xl shrink-0">
                    🎯
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-gray-900">{quest.name}</h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{quest.durationMinutes} min</span>
                      <span>·</span>
                      <span>Team quest</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{quest.description}</p>
                <button
                  type="button"
                  onClick={() => handleJoinQuest(quest.id)}
                  disabled={joiningId !== null}
                  className="btn btn-primary w-full"
                >
                  {joiningId === quest.id ? 'Joining…' : 'Join quest'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {quests.length === 0 && (
          <div className="bg-white rounded-3xl p-8 text-center">
            <p className="text-gray-500 mb-4">No quests in this region yet.</p>
            <Link href="/world" className="btn btn-secondary">Back to World</Link>
          </div>
        )}
      </main>
    </div>
  );
}
