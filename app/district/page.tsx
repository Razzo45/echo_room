'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type QuestUserStatus = {
  roomId: string;
  status: string;
  currentBeat?: number;
  totalBeats?: number;
  artifactId?: string;
  hasCompleted?: boolean;
  latestArtifactId?: string | null;
} | null;

type Quest = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  questType?: 'DECISION_ROOM' | 'FORM' | 'SURVEY';
  userStatus: QuestUserStatus;
};

type RegionMeta = {
  id: string;
  displayName: string;
  name: string;
  description: string | null;
  questCount: number;
  completed: number;
};

export default function DistrictPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [region, setRegion] = useState<RegionMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

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
        const allQuests: Quest[] = questsData.quests || [];
        const decisionRoomQuests = allQuests.filter(
          (q) => !q.questType || q.questType === 'DECISION_ROOM'
        );
        setQuests(decisionRoomQuests);
        if (questsData.region) setRegion(questsData.region);
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
          <p className="text-gray-500 text-sm">Loading quests...</p>
        </div>
      </div>
    );
  }

  const availableQuests = quests.filter((q) => q.userStatus?.status !== 'COMPLETED');
  const completedQuests = quests.filter((q) => q.userStatus?.status === 'COMPLETED');
  const regionProgress = region ? `${region.completed} of ${region.questCount} completed` : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/world" className="p-2 -ml-2 rounded-xl text-primary-600 hover:bg-primary-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">World</span>
        </Link>
        <h1 className="text-lg font-bold text-gray-900 truncate flex-1 text-center pr-12">
          {region?.displayName || 'Region'}
        </h1>
      </div>

      <main className="px-4 pt-4 max-w-lg mx-auto">
        {/* Region context */}
        {region && (
          <div className="mb-5">
            {region.description && (
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{region.description}</p>
            )}
            {regionProgress && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      region.completed === region.questCount ? 'bg-emerald-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${region.questCount > 0 ? Math.round((region.completed / region.questCount) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium shrink-0">{regionProgress}</span>
              </div>
            )}
          </div>
        )}

        {/* Available quests */}
        {availableQuests.length > 0 && (
          <div className="space-y-4">
            {availableQuests.map((quest, idx) => {
              const isActive = quest.userStatus?.status === 'IN_PROGRESS';
              const isReplaying = isActive && !!quest.userStatus?.hasCompleted;
              const beat = quest.userStatus?.currentBeat ?? 1;
              const totalBeats = quest.userStatus?.totalBeats ?? 5;

              return (
                <div key={quest.id} className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <span className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        isActive ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-gray-900 truncate">{quest.name}</h2>
                          {isReplaying && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              Done
                            </span>
                          )}
                          {isActive && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              {isReplaying ? 'Replaying' : 'In progress'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          <span>{quest.durationMinutes} min</span>
                          <span>&middot;</span>
                          <span>5-beat story</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed mb-4">{quest.description}</p>

                    {/* Beat progress for active quests */}
                    {isActive && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                          <span>Beat {beat} of {totalBeats}</span>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: totalBeats }, (_, i) => (
                            <div
                              key={i}
                              className={`h-2 flex-1 rounded-full ${
                                i < beat ? 'bg-amber-400' : 'bg-gray-100'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/room/${quest.userStatus!.roomId}/play`)}
                        className="btn btn-primary w-full"
                      >
                        Continue story
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleJoinQuest(quest.id)}
                        disabled={joiningId !== null}
                        className="btn btn-primary w-full"
                      >
                        {joiningId === quest.id ? 'Joining...' : 'Join quest'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed quests */}
        {completedQuests.length > 0 && (
          <>
            <div className="flex items-center gap-3 mt-8 mb-4">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Completed</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div className="space-y-3">
              {completedQuests.map((quest) => {
                const artifactLink = quest.userStatus?.artifactId || quest.userStatus?.latestArtifactId;
                return (
                  <div key={quest.id} className="bg-white rounded-2xl border border-gray-100 p-4 opacity-80">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-700 truncate">{quest.name}</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                          Completed
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      {artifactLink && (
                        <Link
                          href={`/artifact/${artifactLink}`}
                          className="flex-1 text-center text-xs font-medium text-primary-600 hover:text-primary-700 px-3 py-2 rounded-xl bg-primary-50"
                        >
                          View artifact
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleJoinQuest(quest.id)}
                        disabled={joiningId !== null}
                        className="flex-1 text-center text-xs font-medium text-amber-700 hover:text-amber-800 px-3 py-2 rounded-xl bg-amber-50"
                      >
                        {joiningId === quest.id ? 'Joining...' : 'Play again'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

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
