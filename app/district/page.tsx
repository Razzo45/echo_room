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
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading quests…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/world"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to World Map
        </Link>

        <header className="mb-8">
          <h1 className="page-title">{regionName}</h1>
          <p className="page-subtitle">Choose a quest to begin</p>
        </header>

        <div className="space-y-5">
          {quests.map((quest) => (
            <div key={quest.id} className="card-elevated hover:shadow-lg transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{quest.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {quest.durationMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Team quest
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{quest.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleJoinQuest(quest.id)}
                  disabled={joiningId !== null}
                  className="btn btn-primary shrink-0 w-full sm:w-auto"
                >
                  {joiningId === quest.id ? 'Joining…' : 'Join quest'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {quests.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-500">No quests available in this region yet.</p>
            <Link href="/world" className="btn btn-secondary mt-4">Back to World Map</Link>
          </div>
        )}
      </div>
    </div>
  );
}
