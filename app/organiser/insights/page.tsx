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
  badgeStats: BadgeStat[];
};

function slugForFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'artifact';
}

export default function OrganiserInsightsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [downloadingArtifactId, setDownloadingArtifactId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

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

  const handleDownloadArtifact = async (a: ArtifactRow) => {
    setDownloadingArtifactId(a.id);
    try {
      const res = await fetch(`/api/artifact/${a.id}/export?format=html`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to load artifact');
        return;
      }
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `decision-map-${a.roomCode}-${slugForFilename(a.questName)}.html`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed. Please try again.');
    } finally {
      setDownloadingArtifactId(null);
    }
  };

  const handleDownloadPdf = async (a: ArtifactRow) => {
    setDownloadingPdfId(a.id);
    try {
      const res = await fetch(`/api/artifact/${a.id}/export?format=html`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to load artifact');
        return;
      }
      let inlinedHtml = await res.text();
      const pdfOverrides = `
<style id="pdf-overrides">
  body { width: 816px !important; max-width: 816px !important; margin: 0 auto !important; padding: 32px !important; background: #f9fafb !important; font-size: 16px; }
  .container { width: 100% !important; max-width: none !important; padding: 48px !important; background: #fff !important; border-radius: 8px !important; box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important; }
  .header-with-image { display: flex !important; align-items: flex-start !important; gap: 24px !important; margin-bottom: 32px !important; padding-bottom: 32px !important; border-bottom: 2px solid #e5e7eb !important; }
  .city-thumbnail { width: 100px !important; height: 100px !important; object-fit: cover !important; border-radius: 8px !important; flex-shrink: 0 !important; }
  .header-content { flex: 1 !important; min-width: 0 !important; }
  h1 { font-size: 32px !important; font-weight: 700 !important; color: #111827 !important; margin-bottom: 8px !important; }
  h2 { font-size: 24px !important; font-weight: 600 !important; color: #374151 !important; margin-top: 32px !important; margin-bottom: 16px !important; padding-bottom: 8px !important; border-bottom: 2px solid #e5e7eb !important; page-break-after: avoid !important; }
  .subtitle { font-size: 18px !important; color: #6b7280 !important; margin-bottom: 8px !important; }
  .timestamp { font-size: 14px !important; color: #9ca3af !important; }
  .team-list { display: block !important; margin-bottom: 32px !important; }
  .team-member { display: block !important; padding: 12px 16px !important; margin-bottom: 12px !important; background: #f3f4f6 !important; border-radius: 6px !important; page-break-inside: avoid !important; }
  .team-member-name { font-size: 16px !important; font-weight: 600 !important; color: #111827 !important; }
  .team-member-details { font-size: 14px !important; color: #6b7280 !important; }
  .decision { margin-bottom: 40px !important; padding: 24px !important; background: #fafafa !important; border-left: 4px solid #3b82f6 !important; border-radius: 6px !important; page-break-inside: avoid !important; }
  .decision-header { margin-bottom: 16px !important; }
  .decision-title { font-size: 18px !important; font-weight: 600 !important; color: #1f2937 !important; margin-bottom: 4px !important; }
  .decision-choice { font-size: 16px !important; color: #3b82f6 !important; font-weight: 500 !important; }
  .vote-summary { font-size: 14px !important; color: #6b7280 !important; margin-top: 4px !important; }
  .section { margin-top: 16px !important; }
  .section-title { font-size: 14px !important; font-weight: 600 !important; color: #374151 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; margin-bottom: 8px !important; }
  .section-content { font-size: 16px !important; color: #4b5563 !important; line-height: 1.6 !important; }
  ul { margin-left: 24px !important; margin-top: 8px !important; }
  li { margin-bottom: 6px !important; font-size: 16px !important; color: #4b5563 !important; }
  .justifications { margin-top: 16px !important; padding-top: 16px !important; border-top: 1px solid #e5e7eb !important; }
  .justification { margin-bottom: 12px !important; padding: 8px 12px !important; background: #fff !important; border-radius: 4px !important; border: 1px solid #e5e7eb !important; page-break-inside: avoid !important; }
  .justification-author { font-weight: 500 !important; font-size: 14px !important; color: #374151 !important; }
  .justification-text { font-size: 14px !important; color: #6b7280 !important; margin-top: 4px !important; }
  .location-badge { font-size: 14px !important; color: #2563eb !important; font-weight: 500 !important; }
</style>`;
      inlinedHtml = inlinedHtml.replace('</head>', pdfOverrides + '\n</head>');
      const html2pdf = (await import('html2pdf.js')).default;
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '816px';
      iframe.style.height = '1056px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument;
      if (!doc) throw new Error('Could not create document');
      doc.open();
      doc.write(inlinedHtml);
      doc.close();
      await new Promise((r) => setTimeout(r, 600));
      const filename = `decision-map-${a.roomCode}-${slugForFilename(a.questName)}.pdf`;
      const element = doc.body;
      await html2pdf()
        .set({
          filename,
          margin: [12, 12, 12, 12],
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            letterRendering: true,
            logging: false,
          },
          jsPDF: { unit: 'mm', format: 'a4', hotfixes: ['px_scaling'] },
          pagebreak: { mode: ['avoid-all', 'css'], avoid: ['.decision', '.team-member', '.header-with-image', 'h2', '.justification'] },
        })
        .from(element)
        .save();
      document.body.removeChild(iframe);
    } catch (err) {
      alert('PDF download failed. Please try again.');
    } finally {
      setDownloadingPdfId(null);
    }
  };

  if (loadingEvents) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/organiser/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="event-select" className="text-sm font-medium text-gray-700">
                Event:
              </label>
              <select
                id="event-select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[220px]"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {!selectedEventId && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Select an event to view insights.</p>
          </div>
        )}

        {selectedEventId && loadingInsights && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          </div>
        )}

        {selectedEventId && !loadingInsights && insights && (
          <>
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Participants</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {insights.participants.length} participant{insights.participants.length !== 1 ? 's' : ''} in this event
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
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
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          No participants yet
                        </td>
                      </tr>
                    ) : (
                      insights.participants.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{p.organisation}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{p.role}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{p.country}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Room compositions</h2>
                <p className="text-sm text-gray-500 mt-0.5">Who joined whom in each room</p>
              </div>
              <div className="divide-y divide-gray-200">
                {insights.rooms.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">No rooms yet</div>
                ) : (
                  insights.rooms.map((room) => (
                    <div key={room.id} className="px-4 py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-indigo-600">
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
                            className="text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded border border-gray-200"
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

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Badge stats</h2>
                <p className="text-sm text-gray-500 mt-0.5">Badges earned by participants in this event</p>
              </div>
              <div className="p-4">
                {insights.badgeStats.length === 0 ? (
                  <p className="text-gray-500 text-sm">No badges earned yet</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {insights.badgeStats.map((b) => (
                      <div
                        key={b.badgeType}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 bg-white"
                      >
                        <span className="text-xl" title={b.name}>
                          {b.icon}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{b.name}</span>
                        <span className="text-sm text-gray-500">× {b.count}</span>
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

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Artifacts</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  View, or download as HTML (images included) or PDF. Use Print for best PDF formatting (opens in new tab → Save as PDF).
                </p>
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
                    {insights.artifacts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                          No artifacts yet
                        </td>
                      </tr>
                    ) : (
                      insights.artifacts.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm text-gray-900">{a.roomCode}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{a.questName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {a.completedAt
                              ? new Date(a.completedAt).toLocaleString()
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <Link
                                href={`/artifact/${a.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                              >
                                View
                              </Link>
                              <button
                                type="button"
                                onClick={() => handlePrintArtifact(a)}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                              >
                                Print
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadArtifact(a)}
                                disabled={downloadingArtifactId === a.id || downloadingPdfId === a.id}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50"
                              >
                                {downloadingArtifactId === a.id ? 'Downloading…' : 'HTML'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(a)}
                                disabled={downloadingArtifactId === a.id || downloadingPdfId === a.id}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50"
                              >
                                {downloadingPdfId === a.id ? 'Generating…' : 'PDF'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {selectedEventId && !loadingInsights && !insights?.event && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            Failed to load insights for this event.
          </div>
        )}
      </div>
    </div>
  );
}
