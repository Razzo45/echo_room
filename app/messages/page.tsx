'use client';

import { Suspense } from 'react';
import MessagesClient from './MessagesClient';

export default function MessagesRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--theme-border)] border-t-[var(--theme-ink)]" />
        </div>
      }
    >
      <MessagesClient />
    </Suspense>
  );
}
