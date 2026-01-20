'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Quest = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  teamSize: number;
  questType?: 'DECISION_ROOM' | 'FORM' | 'SURVEY';
};

export default function DistrictPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionName, setRegionName] = useState<string>('City District');

  useEffect(() => {
    // Get regionId or regionName from URL query params
    const params = new URLSearchParams(window.location.search);
    const regionId = params.get('regionId');
    const regionName = params.get('regionName') || 'city-district'; // Fallback for legacy

    // Build quests API URL
    const questsUrl = regionId 
      ? `/api/quests?regionId=${regionId}`
      : `/api/quests?regionName=${regionName}`;

    // Fetch quests for the specified region
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
          console.error('Failed to fetch quests:', questsData.error);
          setLoading(false);
          return;
        }
        // Only show decision room quests for now (team-based collaborative flow)
        const allQuests = questsData.quests || [];
        const decisionRoomQuests = allQuests.filter(
          (q: Quest) => !q.questType || q.questType === 'DECISION_ROOM'
        );
        setQuests(decisionRoomQuests);
        
        // Set region name from first quest if available
        if (decisionRoomQuests.length > 0 && (decisionRoomQuests[0] as any).regionName) {
          setRegionName((decisionRoomQuests[0] as any).regionName);
        }
        
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading quests:', err);
        router.push('/');
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/world"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to World Map
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{regionName}</h1>
          <p className="text-gray-600">Choose a quest to begin</p>
        </div>

        <div className="space-y-6">
          {quests.map((quest) => (
            <div key={quest.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{quest.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {quest.durationMinutes} min
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      {quest.teamSize} players
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-700 mb-6">{quest.description}</p>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/room/join', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ questId: quest.id }),
                    });

                    const data = await res.json();

                    if (!res.ok) {
                      alert(data.error || 'Failed to join quest. Please try again.');
                      return;
                    }

                    if (data.roomId) {
                      router.push(`/room/${data.roomId}`);
                    } else {
                      alert(data.message || 'Failed to join quest.');
                    }
                  } catch (err) {
                    console.error('Failed to join quest:', err);
                    alert('Failed to join quest. Please try again.');
                  }
                }}
                className="btn btn-primary"
              >
                Join Quest
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
