'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type EventOption = {
  id: string;
  name: string;
};

type Participant = {
  id: string;
  name: string;
  organisation: string;
  role: string;
  country: string;
  skill: string;
  curiosity: string;
  createdAt: string;
};

type RoomMember = {
  userId: string;
  name: string;
  organisation: string;
  role: string;
};

type Room = {
  id: string;
  roomCode: string;
  status: string;
  questName: string;
  startedAt: string | null;
  completedAt: string | null;
  members: RoomMember[];
};

type ArtifactRow = {
  id: string;
  roomId: string;
  roomCode: string;
  questName: string;
  completedAt: string | null;
  createdAt: string;
  roomStatus: string;
  closedAt: string | null;
};

type ArchivedArtifactRow = {
  id: string;
  roomCode: string;
  questName: string;
  createdAt: string;
};

type BadgeStat = {
  badgeType: string;
  name: string;
  icon: string;
  rarity: string;
  count: number;
};

type InsightsData = {
  event: { id: string; name: string };
  participants: Participant[];
  rooms: Room[];
  artifacts: ArtifactRow[];
  archivedArtifacts: ArchivedArtifactRow[];
  badgeStats: BadgeStat[];
};

export default function OrganiserInsightsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [artifactFilter, setArtifactFilter] = useState<'all' | 'archived' | 'past'>('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/organiser/events');
        const data = await res.json();
        if (!res.ok) {
          router.push('/organiser');
          return;
        }
        setEvents(data.events?.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })) ?? []);
        if (data.events?.length && !selectedEventId) {
          setSelectedEventId(data.events[0].id);
        }
      } catch {
        router.push('/organiser');
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!selectedEventId) {
      setInsights(null);
      return;
    }
    setLoadingInsights(true);
    fetch(`/api/organiser/insights?eventId=${encodeURIComponent(selectedEventId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok && data.error === 'Unauthorized') {
          router.push('/organiser');
          return null;
        }
        return data.event ? data : null;
      })
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setLoadingInsights(false));
  }, [selectedEventId, router]);

  const handlePrintArtifact = async (a: ArtifactRow) => {
    try {
      const res = await fetch(`/api/artifact/${a.id}/export?format=html`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to load artifact');
        return;
      }
      const html = await res.text();
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to open the print view.');
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 400);
    } catch (err) {
      alert('Failed to open print view.');
    }
  };

  const handlePrintArchivedArtifact = async (a: ArchivedArtifactRow) => {
    try {
      const res = await fetch(`/api/organiser/archived-artifact/${a.id}`);
      const data = await res.json();
      if (!res.ok || !data.htmlContent) {
        alert(data?.error || 'Failed to load archived artifact');
        return;
      }
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to open the print view.');
        return;
      }
      printWindow.document.write(data.htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 400);
    } catch (err) {
      alert('Failed to open print view.');
    }
  };

  if (loadingEvents) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-org-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-violet-300/20 border-t-violet-300 mx-auto mb-4"></div>
          <p className="text-violet-100/75">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-org-bg text-org-text">
      <div className="sticky top-0 z-20 bg-org-surface/95 border-b border-org-border backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/organiser/dashboard"
                className="text-violet-300 hover:text-violet-200 font-semibold text-sm"
              >
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-bold tracking-tight font-display">Insights</h1>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="event-select" className="label mb-0 text-violet-100/85">
                Event:
              </label>
              <select
                id="event-select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="input min-w-[220px]"
              >
                <option value="">Select event</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8 space-y-6 safe-bottom [&_.text-gray-900]:!text-org-text [&_.text-gray-800]:!text-violet-100 [&_.text-gray-700]:!text-violet-100/85 [&_.text-gray-600]:!text-violet-100/75 [&_.text-gray-500]:!text-violet-100/65 [&_.bg-gray-50]:!bg-[#151423] [&_.border-gray-200]:!border-org-border">
        {!selectedEventId && (
          <div className="rounded-3xl border border-org-border bg-org-surface p-12 text-center shadow-soft">
            <p className="text-violet-100/75">Select an event to view insights.</p>
          </div>
        )}

        {selectedEventId && loadingInsights && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-300/20 border-t-violet-300" />
          </div>
        )}

        {selectedEventId && !loadingInsights && insights && (
          <>
            <section className="rounded-3xl border border-org-border bg-org-surface overflow-hidden shadow-soft">
              <div className="px-4 py-3 border-b border-org-border bg-[#151423] rounded-t-3xl">
                <h2 className="text-lg font-semibold text-org-text font-display">Participants</h2>
                <p className="text-sm text-violet-100/70 mt-0.5">
                  {insights.participants.length} participant{insights.participants.length !== 1 ? 's' : ''} in this event
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-org-border">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organisation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {insights.participants.length === 0 ? (
                      <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-violet-100/70">
                          No participants yet
                        </td>
                      </tr>
                    ) : (
                      insights.participants.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-sm font-medium text-org-text">{p.name}</td>
                          <td className="px-4 py-3 text-sm text-violet-100/75">{p.organisation}</td>
                          <td className="px-4 py-3 text-sm text-violet-100/75">{p.role}</td>
                          <td className="px-4 py-3 text-sm text-violet-100/75">{p.country}</td>
                          <td className="px-4 py-3 text-sm text-violet-100/65">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-org-border bg-org-surface overflow-hidden shadow-soft">
              <div className="px-4 py-3 border-b border-org-border bg-[#151423]">
                <h2 className="text-lg font-semibold text-org-text font-display">Room compositions</h2>
                <p className="text-sm text-violet-100/70 mt-0.5">Who joined whom in each room</p>
              </div>
              <div className="divide-y divide-gray-200">
                {insights.rooms.length === 0 ? (
                  <div className="px-4 py-8 text-center text-violet-100/70">No rooms yet</div>
                ) : (
                  insights.rooms.map((room) => (
                    <div key={room.id} className="px-4 py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-primary-600">
                          {room.roomCode}
                        </span>
                        <span className="text-xs text-gray-500">({room.questName})</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            room.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : room.status === 'IN_PROGRESS'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>
                      <ul className="flex flex-wrap gap-2">
                        {room.members.map((m) => (
                          <li
                            key={m.userId}
                            className="text-sm text-violet-100/80 bg-[#151423] px-3 py-1.5 rounded-2xl border border-org-border"
                          >
                            <span className="font-medium">{m.name}</span>
                            <span className="text-gray-500">
                              {' '}
                              · {m.organisation}
                              {m.role ? ` · ${m.role}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-org-border bg-org-surface overflow-hidden shadow-soft">
              <div className="px-4 py-3 border-b border-org-border bg-[#151423]">
                <h2 className="text-lg font-semibold text-org-text font-display">Badge stats</h2>
                <p className="text-sm text-violet-100/70 mt-0.5">Badges earned by participants in this event</p>
              </div>
              <div className="p-4">
                {insights.badgeStats.length === 0 ? (
                  <p className="text-violet-100/70 text-sm">No badges earned yet</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {insights.badgeStats.map((b) => (
                      <div
                        key={b.badgeType}
                        className="flex items-center gap-2 rounded-2xl border border-org-border px-4 py-2 bg-[#151423]"
                      >
                        <span className="text-xl" title={b.name}>
                          {b.icon}
                        </span>
                        <span className="text-sm font-medium text-org-text">{b.name}</span>
                        <span className="text-sm text-violet-100/70">× {b.count}</span>
                        <span
                          className={`text-xs capitalize ${
                            b.rarity === 'legendary'
                              ? 'text-amber-600'
                              : b.rarity === 'epic'
                                ? 'text-purple-600'
                                : b.rarity === 'rare'
                                  ? 'text-blue-600'
                                  : 'text-gray-500'
                          }`}
                        >
                          {b.rarity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="card-elevated overflow-hidden rounded-3xl">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Artifacts</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  View in browser or open as PDF (Save as PDF in the print dialog). Past generations are preserved when you re-generate rooms.
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setArtifactFilter('all')}
                    className={`min-h-[44px] px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                      artifactFilter === 'all'
                        ? 'bg-violet-600 text-white'
                        : 'bg-[#1c1a2a] text-violet-100 hover:bg-[#26233a] border border-org-border'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtifactFilter('archived')}
                    className={`min-h-[44px] px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                      artifactFilter === 'archived'
                        ? 'bg-violet-600 text-white'
                        : 'bg-[#1c1a2a] text-violet-100 hover:bg-[#26233a] border border-org-border'
                    }`}
                  >
                    Archived (closed rooms)
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtifactFilter('past')}
                    className={`min-h-[44px] px-4 py-2 rounded-2xl text-sm font-semibold transition ${
                      artifactFilter === 'past'
                        ? 'bg-violet-600 text-white'
                        : 'bg-[#1c1a2a] text-violet-100 hover:bg-[#26233a] border border-org-border'
                    }`}
                  >
                    Past generations
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Room
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Quest
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Completed
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {artifactFilter === 'past' ? (
                      (insights.archivedArtifacts ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                            No artifacts from past generations
                          </td>
                        </tr>
                      ) : (
                        (insights.archivedArtifacts ?? []).map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm text-gray-900">{a.roomCode}</span>
                              <span className="ml-2 px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800">
                                Past generation
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{a.questName}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(a.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <Link
                                  href={`/organiser/archived-artifact/${a.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                                >
                                  View
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handlePrintArchivedArtifact(a)}
                                  className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                                >
                                  PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )
                    ) : (() => {
                      const filtered =
                        artifactFilter === 'archived'
                          ? insights.artifacts.filter((a) => a.roomStatus === 'CLOSED')
                          : insights.artifacts;
                      return filtered.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                            {artifactFilter === 'archived'
                              ? 'No archived artifacts'
                              : 'No artifacts yet'}
                          </td>
                        </tr>
                      ) : (
                        filtered.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-gray-900">{a.roomCode}</span>
                            {a.roomStatus === 'CLOSED' && (
                              <span className="ml-2 px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-700">
                                Archived
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{a.questName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {a.completedAt
                              ? new Date(a.completedAt).toLocaleString()
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <Link
                                href={`/artifact/${a.id}?from=insights`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                              >
                                View
                              </Link>
                              <button
                                type="button"
                                onClick={() => handlePrintArtifact(a)}
                                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                              >
                                PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      )));
                    })()}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {selectedEventId && !loadingInsights && !insights?.event && (
          <div className="rounded-3xl border border-org-border bg-org-surface p-8 text-center text-violet-100/75">
            Failed to load insights for this event.
          </div>
        )}
      </div>
    </div>
  );
}
