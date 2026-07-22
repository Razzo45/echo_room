'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

type Peer = { id: string; name: string; organisation: string; role: string };
type Thread = {
  peer: Peer;
  lastMessage: { id: string; body: string; createdAt: string; senderId: string } | null;
  unread: number;
};
type Message = {
  id: string;
  body: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
};

export default function MessagesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withId = searchParams.get('with');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [meId, setMeId] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const res = await fetch('/api/messages');
    const data = await res.json();
    if (res.ok) setThreads(data.threads || []);
  }, []);

  const loadThread = useCallback(async (peerId: string) => {
    const res = await fetch(`/api/messages?with=${encodeURIComponent(peerId)}`);
    const data = await res.json();
    if (res.ok) {
      setMessages(data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (auth) => {
        if (auth.error || auth.needsProfile) {
          router.push(auth.needsProfile ? '/profile' : '/');
          return;
        }
        setMeId(auth.user.id);
        await loadThreads();
        setLoading(false);
      })
      .catch(() => router.push('/'));
  }, [router, loadThreads]);

  useEffect(() => {
    if (!withId || loading) return;
    const fromThreads = threads.find((t) => t.peer.id === withId)?.peer;
    if (fromThreads) setPeer(fromThreads);
    else {
      fetch('/api/network/requests')
        .then((r) => r.json())
        .then((data) => {
          const all = [...(data.incoming || []), ...(data.outgoing || [])].filter(
            (r: { status: string }) => r.status === 'ACCEPTED'
          );
          const match = all.find((r: { user: Peer }) => r.user.id === withId);
          if (match) setPeer(match.user);
        });
    }
    loadThread(withId);
    const id = setInterval(() => loadThread(withId), 4000);
    return () => clearInterval(id);
  }, [withId, loading, threads, loadThread]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: withId, body: draft.trim() }),
      });
      if (res.ok) {
        setDraft('');
        await loadThread(withId);
        await loadThreads();
      } else {
        const data = await res.json();
        alert(data.error || 'Send failed');
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--theme-border)] border-t-[var(--theme-ink)]" />
      </div>
    );
  }

  if (withId) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--theme-bg)]">
        <DualSurfaceNav />
        <div
          className="px-4 py-3 flex items-center gap-3 border-b"
          style={{
            borderColor: 'var(--theme-border)',
            background: 'color-mix(in srgb, var(--theme-surface) 94%, transparent)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <Link href="/messages" className="btn btn-ghost btn-sm !px-2">
            ←
          </Link>
          <div className="min-w-0 flex-1">
            {peer ? (
              <AvatarLabelGroup
                name={peer.name}
                subtitle={`${peer.role} at ${peer.organisation}`}
                size="sm"
              />
            ) : (
              <p className="font-semibold text-[var(--theme-text)]">Conversation</p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 py-5 space-y-3 max-w-lg mx-auto w-full">
          {messages.length === 0 && (
            <EmptyState
              icon={
                <FeaturedIcon color="brand">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </FeaturedIcon>
              }
              title="Say hello"
              description="Keep it human. Play invites come next in Echo Room."
            />
          )}
          {messages.map((m) => {
            const mine = m.senderId === meId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
                {!mine && peer && <Avatar name={peer.name} size="xs" />}
                <div className={`msg-bubble ${mine ? 'msg-bubble-out' : 'msg-bubble-in'}`}>
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={send}
          className="border-t p-3 max-w-lg mx-auto w-full flex gap-2 safe-bottom"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
        >
          <input
            className="input flex-1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            maxLength={2000}
          />
          <button type="submit" disabled={sending || !draft.trim()} className="btn btn-primary">
            Send
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-8">
      <DualSurfaceNav />
      <PageHeader
        title="Messages"
        subtitle="Conversations with people you’ve connected with."
        actions={
          <Link href="/people" className="text-sm text-corridor-signal font-semibold hover:underline">
            People
          </Link>
        }
      />

      <main className="max-w-lg mx-auto px-4 py-5">
        {threads.length === 0 ? (
          <EmptyState
            icon={
              <FeaturedIcon color="gray">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </FeaturedIcon>
            }
            title="No conversations yet"
            description="Connect with someone first, then message them."
            actions={
              <Link href="/people" className="btn btn-primary btn-sm">
                Browse people
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.peer.id}>
                <Link
                  href={`/messages?with=${t.peer.id}`}
                  className="card !p-3.5 !shadow-none flex items-center gap-3 hover:shadow-soft transition-shadow"
                >
                  <Avatar name={t.peer.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[var(--theme-text)] truncate">{t.peer.name}</p>
                      {t.unread > 0 && (
                        <Badge color="brand" size="sm">
                          {t.unread}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--theme-muted)] truncate mt-0.5">
                      {t.lastMessage?.body || 'Connected — say hello'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
