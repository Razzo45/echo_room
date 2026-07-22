'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Dual-surface participant chrome: Event (CORRIDOR) | Echo Room (ECHOVOID).
 * Untitled-inspired segmented control.
 */
export default function DualSurfaceNav() {
  const pathname = usePathname();
  const onPlayspace =
    pathname?.startsWith('/world') ||
    pathname?.startsWith('/district') ||
    pathname?.startsWith('/room') ||
    pathname?.startsWith('/artifact') ||
    pathname?.startsWith('/badges') ||
    pathname?.startsWith('/me');

  const onEvent =
    pathname?.startsWith('/people') ||
    pathname?.startsWith('/messages') ||
    pathname?.startsWith('/feed') ||
    pathname?.startsWith('/profile') ||
    pathname?.startsWith('/companions');

  const eventActive = onEvent || !onPlayspace;

  return (
    <div
      className="sticky top-0 z-20 border-b px-3 pt-2.5 pb-2"
      style={{
        borderColor: 'var(--theme-border)',
        background: 'color-mix(in srgb, var(--theme-surface) 92%, transparent)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div
        className="mx-auto w-full max-w-sm sm:max-w-md grid grid-cols-2 gap-1 p-1 rounded-xl"
        style={{
          background: 'var(--theme-surface-muted)',
          border: '1px solid var(--theme-border)',
        }}
      >
        <Link
          href="/feed"
          className={`text-center py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
            eventActive
              ? 'bg-[var(--theme-surface)] text-[var(--theme-ink)] shadow-sm'
              : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]'
          }`}
        >
          Event
        </Link>
        <Link
          href="/world"
          className={`text-center py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
            onPlayspace
              ? 'bg-[var(--theme-surface)] text-[var(--theme-accent)] shadow-sm'
              : 'text-[var(--theme-muted)] hover:text-[var(--theme-text)]'
          }`}
          style={
            onPlayspace
              ? { boxShadow: '0 0 0 1px color-mix(in srgb, var(--theme-accent) 35%, transparent)' }
              : undefined
          }
        >
          Echo Room
        </Link>
      </div>
    </div>
  );
}
