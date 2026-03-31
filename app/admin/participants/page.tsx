'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Participant = {
  id: string;
  name: string;
  organisation: string;
  role: string;
  country: string;
  createdAt: string;
  event: {
    id: string;
    name: string;
  };
  _count: {
    roomMembers: number;
    votes: number;
    badges: number;
  };
};

export default function AdminParticipantsPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    loadParticipants();
  }, [page]);

  const loadParticipants = async () => {
    try {
      const res = await fetch(`/api/admin/participants?page=${page}&limit=50`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setParticipants(data.participants);
      setTotalPages(data.pagination.pages);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load participants:', err);
      router.push('/admin/login');
    }
  };

  const removeParticipant = async (participant: Participant) => {
    if (!confirm(`Remove "${participant.name}"? This will permanently delete their profile, room memberships, votes, and badges.`)) return;
    setRemovingId(participant.id);
    try {
      const res = await fetch(`/api/admin/participants/${participant.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to remove participant');
        return;
      }
      await loadParticipants();
    } catch (err) {
      console.error(err);
      alert('Failed to remove participant');
    }
    setRemovingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-500/30 border-t-primary-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading participants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-admin-bg text-admin-text">
      <header className="sticky top-0 z-20 bg-admin-surface border-b border-admin-border shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 font-semibold text-sm mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-2 font-display">Participants Management</h1>
          <p className="text-sm text-zinc-400 mt-0.5">View and manage participant accounts</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-8 safe-bottom">
        <div className="bg-admin-surface rounded-3xl border border-admin-border overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Organisation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rooms</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Votes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Badges</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {participants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{participant.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{participant.organisation}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{participant.event.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{participant.country}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{participant._count.roomMembers}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{participant._count.votes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{participant._count.badges}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => removeParticipant(participant)}
                      disabled={removingId === participant.id}
                      className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                      title="Permanently remove this participant"
                    >
                      {removingId === participant.id ? 'Removing…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn min-h-[48px] bg-gray-700 text-white border border-gray-600 rounded-2xl hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-400 text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn min-h-[48px] bg-gray-700 text-white border border-gray-600 rounded-2xl hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
