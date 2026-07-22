'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Post = {
  id: string;
  type: string;
  title: string;
  body: string;
  pinned: boolean;
  published: boolean;
  seedPlayspace: boolean;
  seededQuestId: string | null;
  publishedAt: string;
};

const TYPES = ['UPDATE', 'SPEAKER', 'PANEL', 'NEWSLETTER'] as const;

export default function OrganiserForumPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('UPDATE');
  const [seedPlayspace, setSeedPlayspace] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await fetch(`/api/organiser/events/${eventId}/forum`);
    const data = await res.json();
    if (!res.ok) {
      router.push('/organiser/dashboard');
      return;
    }
    setPosts(data.posts || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/organiser/events/${eventId}/forum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, type, pinned, seedPlayspace, published: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed');
        return;
      }
      setTitle('');
      setBody('');
      setSeedPlayspace(false);
      setPinned(false);
      setMessage(
        data.seeded?.roomId
          ? 'Published and seeded a new playspace room (existing rooms untouched).'
          : 'Published.'
      );
      await load();
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async (postId: string) => {
    await fetch(`/api/organiser/events/${eventId}/forum/${postId}`, { method: 'DELETE' });
    await load();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-org-bg text-org-text">
        Loading forum…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-org-bg text-org-text">
      <header className="border-b border-org-border bg-org-surface px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href={`/organiser/events/${eventId}`} className="text-sm text-org-accent">
            ← Event
          </Link>
          <h1 className="text-xl font-bold font-display flex-1">Forum / newsletter</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        <form onSubmit={publish} className="rounded-xl border border-org-border bg-org-surface p-4 space-y-3">
          <h2 className="font-semibold">New post</h2>
          <input
            className="input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="input min-h-[120px]"
            placeholder="Body — speakers, panels, updates…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="input !w-auto !min-h-[40px]"
              value={type}
              onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pin
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={seedPlayspace}
                onChange={(e) => setSeedPlayspace(e.target.checked)}
              />
              Seed new playspace room
            </label>
          </div>
          <p className="text-xs text-org-text/60">
            Seeding creates a <strong>new</strong> mission/room from this post. Open rooms keep their snapshot.
          </p>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? 'Publishing…' : 'Publish'}
          </button>
          {message && <p className="text-sm text-org-accent">{message}</p>}
        </form>

        <section className="space-y-3">
          <h2 className="font-semibold">Posts</h2>
          {posts.length === 0 && (
            <p className="text-sm text-org-text/60">No posts yet.</p>
          )}
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl border border-org-border bg-org-surface p-4">
              <div className="flex gap-2 text-xs text-org-text/50 uppercase tracking-wide mb-1">
                {!p.published && <span className="text-red-300">Unpublished</span>}
                {p.pinned && <span>Pinned</span>}
                <span>{p.type}</span>
                {p.seededQuestId && <span className="text-org-accent">Seeded</span>}
              </div>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-org-text/80 whitespace-pre-wrap mt-1 line-clamp-4">{p.body}</p>
              {p.published && (
                <button
                  type="button"
                  onClick={() => unpublish(p.id)}
                  className="mt-2 text-xs text-red-300 hover:underline"
                >
                  Unpublish
                </button>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
