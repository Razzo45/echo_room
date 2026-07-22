'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DualSurfaceNav from '@/components/DualSurfaceNav';
import ArrivalKitCard from '@/components/ArrivalKitCard';
import {
  Badge,
  EmptyState,
  FeaturedIcon,
  PageHeader,
} from '@/components/ui/untitled';

type Post = {
  id: string;
  type: string;
  title: string;
  body: string;
  pinned: boolean;
  publishedAt: string;
  seededQuestId: string | null;
  authorName: string;
};

const typeColor: Record<string, 'blue' | 'brand' | 'success' | 'warning' | 'gray'> = {
  NEWSLETTER: 'brand',
  SPEAKER: 'blue',
  PANEL: 'warning',
  UPDATE: 'gray',
};

export default function FeedPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/feed').then((r) => r.json()),
    ])
      .then(([auth, feed]) => {
        if (auth.error || auth.needsProfile) {
          router.push(auth.needsProfile ? '/profile' : '/');
          return;
        }
        if (feed.posts) setPosts(feed.posts);
        setLoading(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--theme-border)] border-t-[var(--theme-ink)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-10">
      <DualSurfaceNav />
      <PageHeader
        title="Event feed"
        subtitle="Speakers, panels, and updates — value before play."
        actions={
          <div className="flex items-center gap-3 text-sm">
            <Link href="/people" className="text-corridor-signal font-semibold hover:underline">
              People
            </Link>
            <Link href="/companions" className="text-[var(--theme-muted)] font-medium hover:text-[var(--theme-text)]">
              Companions
            </Link>
            <Link href="/messages" className="text-[var(--theme-muted)] font-medium hover:text-[var(--theme-text)]">
              Messages
            </Link>
          </div>
        }
      />

      <main className="surface-shell py-5 space-y-4">
        <div className="max-w-lg mx-auto md:max-w-none">
          <ArrivalKitCard />
        </div>

        {posts.length === 0 ? (
          <div className="max-w-lg mx-auto">
            <EmptyState
              icon={
                <FeaturedIcon color="gray">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                </FeaturedIcon>
              }
              title="No posts yet"
              description="Check back when your organiser publishes a newsletter, speaker note, or panel preview."
              actions={
                <Link href="/people" className="btn btn-secondary btn-sm">
                  Browse people
                </Link>
              }
            />
          </div>
        ) : (
          <div className="surface-card-grid">
            {posts.map((p) => (
              <article
                key={p.id}
                className="card !p-5 space-y-3 animate-slide-up hover:shadow-soft transition-shadow h-full flex flex-col"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {p.pinned && (
                    <Badge color="blue" size="sm" dot>
                      Pinned
                    </Badge>
                  )}
                  <Badge color={typeColor[p.type] || 'gray'} size="sm">
                    {p.type}
                  </Badge>
                  <span className="text-xs text-[var(--theme-muted)] ml-auto">
                    {new Date(p.publishedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-[var(--theme-ink)] leading-snug tracking-tight">
                  {p.title}
                </h2>
                <p className="text-sm text-[var(--theme-text)] whitespace-pre-wrap leading-relaxed line-clamp-6 flex-1">
                  {p.body}
                </p>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--theme-border)] mt-auto">
                  <p className="text-xs text-[var(--theme-muted)]">— {p.authorName}</p>
                  {p.seededQuestId && (
                    <Link
                      href="/world"
                      className="text-xs font-semibold text-corridor-signal hover:underline"
                    >
                      Open in Echo Room →
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
