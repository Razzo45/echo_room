'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Event = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  brandColor: string;
  createdAt: string;
  retentionOverride: boolean;
  retentionOverrideAt: string | null;
  retentionOverrideBy: string | null;
  debugMode: boolean;
  _count: {
    users: number;
    rooms: number;
    eventCodes: number;
  };
  retentionLogs: Array<{ runAt: string }>;
};

const RETENTION_WEEKS = 2;

function retentionStatus(event: Event): { label: string; detail?: string } {
  if (event.retentionOverride) {
    return {
      label: 'Retained (override)',
      detail: event.retentionOverrideAt
        ? `Set on ${new Date(event.retentionOverrideAt).toLocaleString()}`
        : undefined,
    };
  }
  const lastCleanup = event.retentionLogs?.[0]?.runAt;
  if (lastCleanup) {
    return { label: 'Cleaned', detail: new Date(lastCleanup).toLocaleString() };
  }
  if (!event.endDate) return { label: 'No end date', detail: 'Set end date for retention rule' };
  const end = new Date(event.endDate);
  const cleanupDue = new Date(end);
  cleanupDue.setDate(cleanupDue.getDate() + RETENTION_WEEKS * 7);
  const now = new Date();
  if (cleanupDue <= now) {
    return { label: 'Eligible for cleanup', detail: 'See Data lifecycle' };
  }
  const days = Math.ceil((cleanupDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return { label: `Cleanup in ${days} days`, detail: cleanupDue.toLocaleDateString() };
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [debugTogglingId, setDebugTogglingId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'ORGANISER' | 'ADMIN' | 'SUPER_ADMIN' | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/admin/events');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setEvents(data.events);
      setCurrentUserRole(data.currentUser?.role ?? null);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load events:', err);
      router.push('/admin/login');
    }
  };

  const setRetentionOverride = async (eventId: string, retentionOverride: boolean) => {
    setTogglingId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/retention`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionOverride }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to update retention');
        return;
      }
      await loadEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to update retention');
    }
    setTogglingId(null);
  };

  const setDebugMode = async (eventId: string, debugMode: boolean) => {
    setDebugTogglingId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debugMode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to update debug mode');
        return;
      }
      await loadEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to update debug mode');
    }
    setDebugTogglingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-gray-400 hover:text-white mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-white mb-2">Events Management</h1>
              <p className="text-sm text-gray-400">{events.length} total events</p>
              <Link href="/admin/retention" className="text-sm text-amber-400 hover:text-amber-300 mt-1 inline-block">
                Data lifecycle & retention →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {events.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <p className="text-gray-400">No events found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{event.name}</h3>
                    {event.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                  <div
                    className="w-4 h-4 rounded-full ml-2 flex-shrink-0"
                    style={{ backgroundColor: event.brandColor }}
                  ></div>
                </div>

                {event.startDate && (
                  <div className="flex items-center text-sm text-gray-400 mb-3">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(event.startDate).toLocaleDateString()}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {event._count.users}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {event._count.rooms}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-gray-400">
                    {event._count.eventCodes} codes
                  </div>
                </div>

                {/* Debug mode (Super Admin only) */}
                {currentUserRole === 'SUPER_ADMIN' && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <label className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="text-xs text-gray-400">Debug mode</span>
                      <input
                        type="checkbox"
                        checked={event.debugMode ?? false}
                        onChange={(e) => setDebugMode(event.id, e.target.checked)}
                        disabled={debugTogglingId === event.id}
                        className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                      />
                      {debugTogglingId === event.id && <span className="text-xs text-gray-500">Updating…</span>}
                    </label>
                  </div>
                )}

                {/* Data retention */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs text-gray-400">
                      <span className="font-medium text-gray-300">{retentionStatus(event).label}</span>
                      {retentionStatus(event).detail && (
                        <span className="block text-gray-500 mt-0.5">{retentionStatus(event).detail}</span>
                      )}
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-gray-400">Keep longer</span>
                      <input
                        type="checkbox"
                        checked={event.retentionOverride}
                        onChange={(e) => setRetentionOverride(event.id, e.target.checked)}
                        disabled={togglingId === event.id}
                        className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                      />
                      {togglingId === event.id && <span className="text-xs text-gray-500">Updating…</span>}
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
