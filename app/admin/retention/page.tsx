'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type EligibleEvent = { id: string; name: string; endDate: string };
type LogEntry = {
  id: string;
  eventId: string;
  eventName: string;
  runAt: string;
  triggeredBy: string | null;
  deletedSessions: number;
  deletedVotes: number;
  deletedDecisionCommits: number;
  deletedArtifacts: number;
  deletedUserBadges: number;
  deletedRoomMembers: number;
  deletedRooms: number;
  deletedUsers: number;
  deletedAnalyticsEvents: number;
};

export default function AdminRetentionPage() {
  const router = useRouter();
  const [eligible, setEligible] = useState<EligibleEvent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    try {
      const [eligRes, logRes] = await Promise.all([
        fetch('/api/admin/retention/eligibility'),
        fetch('/api/admin/retention/log'),
      ]);
      if (eligRes.status === 401 || logRes.status === 401) {
        router.push('/admin/login');
        return;
      }
      const eligData = await eligRes.json();
      const logData = await logRes.json();
      setEligible(eligData.events ?? []);
      setLogs(logData.logs ?? []);
    } catch (err) {
      console.error(err);
      router.push('/admin/login');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const runCleanup = async () => {
    if (!confirm('Run data cleanup for all eligible events now? This will permanently delete participant and activity data (2 weeks past event end).')) return;
    setRunning(true);
    try {
      const res = await fetch('/api/admin/retention/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Cleanup failed');
        return;
      }
      const results = data.results ?? [];
      if (results.length === 0) alert('No events were eligible for cleanup.');
      else alert(`Cleanup completed for ${results.length} event(s).`);
      await load();
    } catch (err) {
      console.error(err);
      alert('Cleanup request failed');
    }
    setRunning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/admin" className="text-gray-400 hover:text-white mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Data lifecycle & retention</h1>
          <p className="text-sm text-gray-400">
            Two weeks after an event’s end date, participant and activity data (sessions, rooms, votes, users, etc.) can be automatically removed. Events with “Keep data longer” are excluded.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Run cleanup */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Run cleanup now</h2>
          <p className="text-sm text-gray-400 mb-4">
            {eligible.length === 0
              ? 'No events are currently eligible (endDate + 2 weeks in the past, no retention override).'
              : `${eligible.length} event(s) eligible for cleanup.`}
          </p>
          <button
            onClick={runCleanup}
            disabled={running || eligible.length === 0}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? 'Running…' : 'Run cleanup for all eligible events'}
          </button>
        </div>

        {/* Eligible events */}
        {eligible.length > 0 && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Eligible for cleanup</h2>
            <ul className="space-y-2">
              {eligible.map((e) => (
                <li key={e.id} className="text-sm text-gray-300">
                  {e.name} — end: {new Date(e.endDate).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Audit log */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cleanup audit log</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400">No cleanup runs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 pr-4">Run at</th>
                    <th className="py-2 pr-2">Users</th>
                    <th className="py-2 pr-2">Rooms</th>
                    <th className="py-2 pr-2">Sessions</th>
                    <th className="py-2 pr-2">Votes</th>
                    <th className="py-2">Artifacts</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-gray-700/50">
                      <td className="py-2 pr-4 text-white">{l.eventName}</td>
                      <td className="py-2 pr-4 text-gray-400">
                        {new Date(l.runAt).toLocaleString()}
                        {l.triggeredBy && <span className="text-gray-500 ml-1">(manual)</span>}
                      </td>
                      <td className="py-2 pr-2 text-gray-300">{l.deletedUsers}</td>
                      <td className="py-2 pr-2 text-gray-300">{l.deletedRooms}</td>
                      <td className="py-2 pr-2 text-gray-300">{l.deletedSessions}</td>
                      <td className="py-2 pr-2 text-gray-300">{l.deletedVotes}</td>
                      <td className="py-2 text-gray-300">{l.deletedArtifacts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Per-event “Keep data longer” is set on the Events management page. Override is recorded with timestamp and admin for audit.
        </p>
      </div>
    </div>
  );
}
