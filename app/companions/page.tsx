'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DualSurfaceNav from '@/components/DualSurfaceNav';
import {
  Avatar,
  Badge,
  EmptyState,
  FeaturedIcon,
  PageHeader,
} from '@/components/ui/untitled';

type Companion = {
  id: string;
  name: string;
  organisation: string;
  role: string;
  headline: string | null;
  country: string;
  sharedRooms: Array<{
    roomId: string;
    questName: string;
    isPrivate: boolean;
    artifactId: string | null;
    completedAt: string | null;
  }>;
};

type Me = {
  id: string;
  name: string;
  organisation: string;
  role: string;
  levelLabel: string;
};

export default function CompanionsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/companions')
      .then((r) => r.json())
      .then((data) => {
        if (data.error === 'Unauthorized') {
          router.push('/');
          return;
        }
        setMe(data.me);
        setCompanions(data.companions || []);
        setLoading(false);
      })
      .catch(() => router.push('/'));
  }, [router]);

  if (loading || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--theme-border)] border-t-[var(--theme-ink)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-12">
      <DualSurfaceNav />
      <PageHeader
        title="Companions"
        subtitle="People you already made a story with — find them on site."
        actions={
          <Link href="/me" className="text-sm text-corridor-signal font-semibold hover:underline">
            My rooms
          </Link>
        }
      />

      <main className="surface-shell py-5 space-y-4">
        <div className="card !p-5 print:border print:shadow-none relative overflow-hidden max-w-lg mx-auto md:max-w-none">
          <div
            className="absolute inset-x-0 top-0 h-16 opacity-90"
            style={{
              background:
                'linear-gradient(135deg, #0b1f3a 0%, #16345a 60%, #1d4ed8 140%)',
            }}
          />
          <div className="relative pt-8 flex items-end gap-3">
            <Avatar name={me.name} size="xl" className="!ring-4 !ring-[var(--theme-surface)]" />
            <div className="min-w-0 pb-1">
              <p className="text-[10px] uppercase tracking-wider text-[var(--theme-muted)] mb-0.5">
                Your intro card
              </p>
              <p className="text-xl font-bold text-[var(--theme-ink)] tracking-tight">{me.name}</p>
              <p className="text-sm text-[var(--theme-muted)]">
                {me.role} · {me.organisation}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="level-banner">{me.levelLabel}</span>
            <Badge color="gray" size="sm">
              {companions.length} companion{companions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {companions.length === 0 ? (
          <div className="max-w-lg mx-auto">
          <EmptyState
            icon={
              <FeaturedIcon color="brand">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </FeaturedIcon>
            }
            title="No companions yet"
            description="Finish a story room (open or private) with someone — they’ll show up here."
            actions={
              <Link href="/world" className="btn btn-primary btn-sm">
                Open Echo Room
              </Link>
            }
          />
          </div>
        ) : (
          <ul className="surface-card-grid list-none p-0 m-0">
            {companions.map((c) => {
              const latest = c.sharedRooms[0];
              return (
                <li key={c.id} className="card !p-4 print:break-inside-avoid !shadow-none hover:shadow-soft transition-shadow h-full">
                  <div className="flex gap-3">
                    <Avatar name={c.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--theme-text)]">{c.name}</p>
                      <p className="text-sm text-[var(--theme-muted)]">
                        {c.role} at {c.organisation}
                        {c.country ? ` · ${c.country}` : ''}
                      </p>
                      {c.headline && (
                        <p className="text-xs text-[var(--theme-muted)] mt-1 line-clamp-2">
                          {c.headline}
                        </p>
                      )}
                      {latest && (
                        <div className="mt-2">
                          <Badge color={latest.isPrivate ? 'warning' : 'blue'} size="sm">
                            {latest.questName}
                            {latest.isPrivate ? ' · private' : ''}
                          </Badge>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 mt-3">
                        <Link
                          href={`/messages?with=${c.id}`}
                          className="text-xs font-semibold text-corridor-signal hover:underline"
                        >
                          Message
                        </Link>
                        {latest?.artifactId && (
                          <Link
                            href={`/artifact/${latest.artifactId}`}
                            className="text-xs font-semibold text-corridor-signal hover:underline"
                          >
                            View artifact
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => window.print()}
          className="btn btn-secondary w-full max-w-lg mx-auto md:max-w-xs print:hidden block"
        >
          Print companion cards
        </button>
      </main>
    </div>
  );
}
