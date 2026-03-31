'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Event = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  brandColor: string;
  eventCodes: Array<{ code: string; active: boolean }>;
  _count: { users: number; rooms: number };
};

export default function OrganiserDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/organiser/events');
      const data = await res.json();
      if (!res.ok) {
        router.push('/organiser');
        return;
      }
      setEvents(data.events);
    } catch {
      router.push('/organiser');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-org-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-violet-300/20 border-t-violet-300 mx-auto mb-4" />
          <p className="text-violet-100/80 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-org-bg text-org-text">
      <header className="sticky top-0 z-20 bg-org-surface/95 border-b border-org-border backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 safe-bottom">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-display">Echo Room</h1>
              <p className="text-sm text-violet-100/70 mt-0.5">Organiser dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/organiser/insights" className="btn min-h-[48px] border border-org-border bg-transparent text-org-text hover:bg-white/5">
                Insights
              </Link>
              <Link href="/organiser/events/new" className="btn min-h-[48px] text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-glowOrg">
                + Create event
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-8 safe-bottom">
        {events.length === 0 ? (
          <div className="rounded-3xl border border-org-border bg-org-surface text-center py-14 px-6 shadow-soft">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-violet-500/15 text-violet-300 items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No events yet</h3>
            <p className="text-violet-100/70 mb-6">Create your first event to get started.</p>
            <Link href="/organiser/events/new" className="btn text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400">
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/organiser/events/${event.id}`}
                className="rounded-3xl border border-org-border bg-org-surface hover:bg-[#252438] hover:shadow-glowOrg transition-all block active:scale-[0.99] p-6"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold truncate">{event.name}</h3>
                    {event.description && (
                      <p className="text-sm text-violet-100/70 mt-0.5 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                  <span
                    className="w-3 h-3 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: event.brandColor }}
                    aria-hidden
                  />
                </div>
                {event.startDate && (
                  <p className="flex items-center text-sm text-violet-100/70 mb-3">
                    <svg className="w-4 h-4 mr-2 text-violet-200/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(event.startDate).toLocaleDateString()}
                  </p>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-org-border">
                  <div className="flex items-center gap-4 text-sm text-violet-100/75">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-violet-200/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event._count.users}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-violet-200/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {event._count.rooms}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-amber-300">{event.eventCodes.length} codes</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
