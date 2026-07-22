'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type FunnelData = {
  funnel: {
    joined: number;
    discoverable: number;
    connections: number;
    messaged: number;
    playInvitesAccepted: number;
    completedPlay: number;
    artifacts: number;
    forumPosts: number;
    privateRooms: number;
    openRoomsCompleted: number;
  };
  rates: {
    discoverableOfJoined: number;
    messagedOfJoined: number;
    playedOfJoined: number;
    artifactOfPlayed: number;
  };
  cohorts: Array<{
    roomId: string;
    roomCode: string;
    isPrivate: boolean;
    questName: string;
    artifactId: string | null;
    members: Array<{ id: string; name: string; organisation: string }>;
  }>;
};

export default function CampaignFunnelPanel({ eventId }: { eventId: string }) {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/organiser/events/${eventId}/funnel`)
      .then((r) => r.json())
      .then((d) => {
        if (d.funnel) setData(d);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-org-border bg-org-surface p-8 text-center text-sm text-violet-100/70">
        Loading campaign funnel…
      </div>
    );
  }

  if (!data) return null;

  const { funnel: f, rates: r, cohorts } = data;

  const steps = [
    { label: 'Joined', value: f.joined },
    { label: 'Discoverable', value: f.discoverable, rate: r.discoverableOfJoined },
    { label: 'Connections', value: f.connections },
    { label: 'Messaged', value: f.messaged, rate: r.messagedOfJoined },
    { label: 'Completed play', value: f.completedPlay, rate: r.playedOfJoined },
    { label: 'Artifacts', value: f.artifacts },
  ];

  return (
    <>
      <section className="rounded-3xl border border-org-border bg-org-surface overflow-hidden shadow-soft">
        <div className="px-4 py-3 border-b border-org-border bg-[#151423]">
          <h2 className="text-lg font-semibold font-display">Campaign funnel</h2>
          <p className="text-sm text-violet-100/70 mt-0.5">
            Quality metrics — companionship &amp; completion over raw opens
          </p>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {steps.map((s) => (
            <div key={s.label} className="rounded-xl border border-org-border bg-[#151423] p-3 text-center">
              <p className="text-2xl font-bold font-mono text-org-accent">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-violet-100/60 mt-1">{s.label}</p>
              {typeof s.rate === 'number' && (
                <p className="text-xs text-violet-100/50 mt-0.5">{s.rate}% of joined</p>
              )}
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 flex flex-wrap gap-4 text-xs text-violet-100/60">
          <span>Forum posts: {f.forumPosts}</span>
          <span>Private rooms: {f.privateRooms}</span>
          <span>Open rooms completed: {f.openRoomsCompleted}</span>
          <span>Play invites accepted: {f.playInvitesAccepted}</span>
        </div>
      </section>

      <section className="rounded-3xl border border-org-border bg-org-surface overflow-hidden shadow-soft">
        <div className="px-4 py-3 border-b border-org-border bg-[#151423]">
          <h2 className="text-lg font-semibold font-display">Cohort gallery</h2>
          <p className="text-sm text-violet-100/70 mt-0.5">
            Who played with whom — shareable story groups
          </p>
        </div>
        {cohorts.length === 0 ? (
          <p className="p-6 text-sm text-violet-100/60">No completed rooms yet.</p>
        ) : (
          <ul className="divide-y divide-org-border">
            {cohorts.map((c) => (
              <li key={c.roomId} className="px-4 py-3 flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">
                    {c.questName}{' '}
                    <span className="font-mono text-violet-100/50 text-xs">{c.roomCode}</span>
                    {c.isPrivate && (
                      <span className="ml-2 text-[10px] uppercase text-org-accent">Private</span>
                    )}
                  </p>
                  <p className="text-sm text-violet-100/75 mt-1">
                    {c.members.map((m) => m.name).join(' · ') || 'No members'}
                  </p>
                  <p className="text-xs text-violet-100/50 mt-0.5">
                    {c.members.map((m) => m.organisation).filter(Boolean).join(' / ')}
                  </p>
                </div>
                {c.artifactId && (
                  <Link
                    href={`/artifact/${c.artifactId}?from=insights`}
                    className="text-xs text-org-accent hover:underline shrink-0"
                  >
                    View artifact
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
