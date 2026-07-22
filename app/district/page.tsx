'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DualSurfaceNav from '@/components/DualSurfaceNav';

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
    const questsUrl = regionId
      ? `/api/quests?regionId=${regionId}`
      : `/api/quests?regionName=${regionNameParam}`;

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
      if (data.roomId) router.push(`/room/${data.roomId}`);
      else alert(data.message || data.error || 'Failed to join quest.');
    } catch {
      alert('Failed to join quest. Please try again.');
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--theme-border)] border-t-[var(--theme-accent)] mx-auto mb-4" />
          <p className="text-[var(--theme-muted)] text-sm">Loading quests...</p>
        </div>
      </div>
    );
  }

  const availableQuests = quests.filter((q) => q.userStatus?.status !== 'COMPLETED');
  const completedQuests = quests.filter((q) => q.userStatus?.status === 'COMPLETED');
  const regionProgress = region
    ? `${region.completed} of ${region.questCount} completed`
    : null;

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-8">
      <DualSurfaceNav />
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b"
        style={{
          borderColor: 'var(--theme-border)',
          background: 'color-mix(in srgb, var(--theme-surface) 92%, transparent)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Link
          href="/world"
          className="p-2 -ml-2 rounded text-[var(--theme-accent)] hover:opacity-80 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">World</span>
        </Link>
        <h1 className="text-lg font-bold text-[var(--theme-text)] truncate flex-1 text-center pr-12 font-display">
          {region?.displayName || 'Region'}
        </h1>
      </div>

      <main className="surface-shell pt-4">
        {region && (
          <div className="mb-5 max-w-lg mx-auto md:mx-0">
            {region.description && (
              <p className="text-sm text-[var(--theme-muted)] leading-relaxed mb-3">
                {region.description}
              </p>
            )}
            {regionProgress && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-[var(--theme-surface-muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-[var(--theme-accent)]"
                    style={{
                      width: `${
                        region.questCount > 0
                          ? Math.round((region.completed / region.questCount) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs text-[var(--theme-muted)] font-medium shrink-0">
                  {regionProgress}
                </span>
              </div>
            )}
          </div>
        )}

        {availableQuests.length > 0 && (
          <div className="surface-card-grid gap-4">
            {availableQuests.map((quest, idx) => {
              const isActive = quest.userStatus?.status === 'IN_PROGRESS';
              const isReplaying = isActive && !!quest.userStatus?.hasCompleted;
              const beat = quest.userStatus?.currentBeat ?? 1;
              const totalBeats = quest.userStatus?.totalBeats ?? 5;

              return (
                <div key={quest.id} className="card !p-0 overflow-hidden h-full flex flex-col">
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <span
                        className={`w-11 h-11 rounded flex items-center justify-center text-sm font-bold shrink-0 font-mono ${
                          isActive
                            ? 'bg-[color-mix(in_srgb,var(--theme-accent)_18%,transparent)] text-[var(--theme-accent)]'
                            : 'bg-[var(--theme-surface-muted)] text-[var(--theme-text)]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-[var(--theme-text)] truncate font-display">
                            {quest.name}
                          </h2>
                          {isReplaying && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-success)]">
                              Done
                            </span>
                          )}
                          {isActive && (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-accent)]">
                              {isReplaying ? 'Replaying' : 'In progress'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--theme-muted)]">
                          <span>{quest.durationMinutes} min</span>
                          <span>&middot;</span>
                          <span>5-beat story</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-[var(--theme-muted)] leading-relaxed mb-4">
                      {quest.description}
                    </p>

                    {isActive && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-[var(--theme-muted)] mb-1.5">
                          <span>
                            Beat {beat} of {totalBeats}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: totalBeats }, (_, i) => (
                            <div
                              key={i}
                              className={`h-2 flex-1 rounded-sm ${
                                i < beat
                                  ? 'bg-[var(--theme-accent)]'
                                  : 'bg-[var(--theme-surface-muted)]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-auto">
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
                </div>
              );
            })}
          </div>
        )}

        {completedQuests.length > 0 && (
          <>
            <div className="flex items-center gap-3 mt-8 mb-4 max-w-lg mx-auto md:mx-0 md:max-w-none">
              <div className="h-px flex-1 bg-[var(--theme-border)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)]">
                Completed
              </span>
              <div className="h-px flex-1 bg-[var(--theme-border)]" />
            </div>
            <div className="surface-card-grid">
              {completedQuests.map((quest) => {
                const artifactLink =
                  quest.userStatus?.artifactId || quest.userStatus?.latestArtifactId;
                return (
                  <div key={quest.id} className="card !p-4 h-full flex flex-col">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded flex items-center justify-center shrink-0 text-[var(--theme-success)] bg-[color-mix(in_srgb,var(--theme-success)_15%,transparent)]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-[var(--theme-text)] truncate">
                          {quest.name}
                        </h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-success)]">
                          Completed
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto pt-3">
                      {artifactLink && (
                        <Link
                          href={`/artifact/${artifactLink}`}
                          className="flex-1 text-center text-xs font-medium text-[var(--theme-accent)] px-3 py-2 rounded border border-[var(--theme-border)]"
                        >
                          View artifact
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleJoinQuest(quest.id)}
                        disabled={joiningId !== null}
                        className="flex-1 btn btn-primary text-xs !py-2"
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
          <div className="card p-8 text-center">
            <p className="text-[var(--theme-muted)] mb-4">No quests in this region yet.</p>
            <Link href="/world" className="btn btn-secondary">
              Back to World
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
