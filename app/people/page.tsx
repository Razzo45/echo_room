'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DualSurfaceNav from '@/components/DualSurfaceNav';
import {
  Avatar,
  AvatarLabelGroup,
  Badge,
  EmptyState,
  FeaturedIcon,
  PageHeader,
} from '@/components/ui/untitled';

type Person = {
  id: string;
  name: string;
  organisation: string;
  role: string;
  headline: string | null;
  linkedinUrl: string | null;
};

type RequestRow = {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  user: { id: string; name: string; organisation: string; role: string };
};

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function PeoplePage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [incoming, setIncoming] = useState<RequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<RequestRow[]>([]);
  const [playIncoming, setPlayIncoming] = useState<RequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const statusFor = useCallback(
    (personId: string): 'none' | 'pending_out' | 'pending_in' | 'connected' | 'declined' => {
      const out = outgoing.find((r) => r.user.id === personId);
      const inn = incoming.find((r) => r.user.id === personId);
      if (out?.status === 'ACCEPTED' || inn?.status === 'ACCEPTED') return 'connected';
      if (out?.status === 'PENDING') return 'pending_out';
      if (inn?.status === 'PENDING') return 'pending_in';
      if (out?.status === 'DECLINED' || inn?.status === 'DECLINED') return 'declined';
      return 'none';
    },
    [incoming, outgoing]
  );

  const loadRequests = useCallback(async () => {
    const [net, play] = await Promise.all([
      fetch('/api/network/requests').then((r) => r.json()),
      fetch('/api/play-invites').then((r) => r.json()),
    ]);
    if (net.incoming) setIncoming(net.incoming);
    if (net.outgoing) setOutgoing(net.outgoing);
    if (play.incoming) {
      setPlayIncoming(
        (play.incoming as RequestRow[]).filter((r) => r.status === 'PENDING')
      );
    }
  }, []);

  const fetchPeople = useCallback(async (q: string) => {
    const url = q.trim() ? `/api/people?q=${encodeURIComponent(q.trim())}` : '/api/people';
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.people) setPeople(data.people);
    else setPeople([]);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      loadRequests(),
    ])
      .then(([authData]) => {
        if (authData.error || authData.needsProfile) {
          router.push(authData.needsProfile ? '/profile' : '/');
          return;
        }
        setLoading(false);
      })
      .catch(() => router.push('/'));
  }, [router, loadRequests]);

  useEffect(() => {
    if (loading) return;
    fetchPeople(search);
  }, [loading, search, fetchPeople]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const sendRequest = async (toUserId: string) => {
    setBusyId(toUserId);
    try {
      const res = await fetch('/api/network/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId }),
      });
      await loadRequests();
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Could not send request');
      }
    } finally {
      setBusyId(null);
    }
  };

  const respond = async (requestId: string, action: 'accept' | 'decline') => {
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/network/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      await loadRequests();
      if (action === 'accept' && data.playInviteOffered) {
        alert(
          'Connected. An optional play invite was suggested — accept it from People when you’re ready (or skip).'
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--theme-border)] border-t-[var(--theme-ink)] mx-auto mb-4" />
          <p className="text-[var(--theme-muted)] text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  const pendingIncoming = incoming.filter((r) => r.status === 'PENDING');

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-8">
      <DualSurfaceNav />
      <PageHeader
        title="People"
        subtitle="Search professionals, connect, then chat — storytelling lives in Echo Room."
        actions={
          <div className="flex items-center gap-3 text-sm">
            <Link href="/messages" className="text-corridor-signal font-semibold hover:underline">
              Messages
            </Link>
            <Link href="/profile" className="text-[var(--theme-muted)] font-medium">
              Profile
            </Link>
          </div>
        }
      />

      <main className="surface-shell py-5">
        {pendingIncoming.length > 0 && (
          <section className="mb-5 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)] mb-2">
              Incoming requests
            </h2>
            {pendingIncoming.map((r) => (
              <div key={r.id} className="card !p-3.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <AvatarLabelGroup
                    name={r.user.name}
                    subtitle={`${r.user.role} at ${r.user.organisation}`}
                    size="md"
                  />
                </div>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => respond(r.id, 'accept')}
                  className="btn btn-primary btn-sm"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => respond(r.id, 'decline')}
                  className="btn btn-ghost btn-sm"
                >
                  Decline
                </button>
              </div>
            ))}
          </section>
        )}

        {playIncoming.length > 0 && (
          <section className="mb-5 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-muted)] mb-2">
              Play invites
            </h2>
            {playIncoming.map((r) => (
              <div key={r.id} className="card !p-3.5 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <AvatarLabelGroup
                    name={r.user.name}
                    subtitle="~15 min private story room"
                    size="md"
                  />
                </div>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={async () => {
                    setBusyId(r.id);
                    try {
                      const res = await fetch(`/api/play-invites/${r.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'accept' }),
                      });
                      const data = await res.json();
                      if (res.ok && data.roomId) {
                        router.push(`/room/${data.roomId}`);
                        return;
                      }
                      alert(data.error || 'Could not accept');
                      await loadRequests();
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className="btn btn-primary btn-sm"
                >
                  Play
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={async () => {
                    setBusyId(r.id);
                    try {
                      await fetch(`/api/play-invites/${r.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'decline' }),
                      });
                      await loadRequests();
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Decline
                </button>
              </div>
            ))}
          </section>
        )}

        <form onSubmit={handleSearchSubmit} className="mb-5 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, org, role…"
            className="input flex-1"
            maxLength={100}
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Search
          </button>
        </form>

        {people.length === 0 ? (
          <EmptyState
            icon={
              <FeaturedIcon color="gray">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </FeaturedIcon>
            }
            title={search ? 'No matches found' : 'Directory is quiet'}
            description={
              search
                ? 'Try another name, organisation, or role.'
                : 'Make yourself discoverable from Profile so others can find you.'
            }
            actions={
              !search ? (
                <Link href="/profile" className="btn btn-secondary btn-sm">
                  Open profile
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="surface-card-grid list-none p-0 m-0">
            {people.map((person) => {
              const st = statusFor(person.id);
              const inn = incoming.find((r) => r.user.id === person.id && r.status === 'PENDING');
              return (
                <li key={person.id} className="card !p-3.5 !shadow-none hover:shadow-soft transition-shadow h-full">
                  <div className="flex items-start gap-3">
                    <Avatar name={person.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[var(--theme-text)] truncate">{person.name}</p>
                        {st === 'connected' && (
                          <Badge color="success" size="sm" dot>
                            Connected
                          </Badge>
                        )}
                        {st === 'pending_out' && (
                          <Badge color="gray" size="sm">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {person.headline && (
                        <p className="text-sm text-[var(--theme-muted)] line-clamp-2 mt-0.5">
                          {person.headline}
                        </p>
                      )}
                      <p className="text-xs text-[var(--theme-muted)] mt-1">
                        {person.role} · {person.organisation}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                      {st === 'none' || st === 'declined' ? (
                        <button
                          type="button"
                          disabled={busyId === person.id}
                          onClick={() => sendRequest(person.id)}
                          className="btn btn-primary btn-sm"
                        >
                          Connect
                        </button>
                      ) : null}
                      {st === 'pending_in' && inn && (
                        <button
                          type="button"
                          disabled={busyId === inn.id}
                          onClick={() => respond(inn.id, 'accept')}
                          className="btn btn-primary btn-sm"
                        >
                          Accept
                        </button>
                      )}
                      {st === 'connected' && (
                        <>
                          <Link
                            href={`/messages?with=${person.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            Message
                          </Link>
                          <button
                            type="button"
                            disabled={busyId === `play-${person.id}`}
                            onClick={async () => {
                              setBusyId(`play-${person.id}`);
                              try {
                                const res = await fetch('/api/play-invites', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ toUserId: person.id }),
                                });
                                const data = await res.json();
                                if (!res.ok) alert(data.error || 'Could not send play invite');
                                else
                                  alert(
                                    'Play invite sent — they can accept from People or Messages.'
                                  );
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            Play together
                          </button>
                        </>
                      )}
                      {person.linkedinUrl && (
                        <a
                          href={person.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm !px-2"
                          aria-label="LinkedIn"
                        >
                          <LinkedInIcon className="w-4 h-4 text-[#0A66C2]" />
                        </a>
                      )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
