'use client';

import { useState, useEffect } from 'react';

/**
 * Always-visible banner when the current participant's event has debugMode.
 * Fetches /api/auth/me; shows nothing on 401 or when event.debugMode is false.
 */
export default function DebugBanner() {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok || cancelled) return null;
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data?.event?.debugMode) return;
        setDebugMode(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!debugMode) return null;

  return (
    <div
      className="sticky top-0 left-0 right-0 z-50 flex items-center justify-center py-1.5 px-4 text-sm font-medium bg-amber-500 text-black"
      role="status"
      aria-label="Debug mode"
    >
      Debug mode
    </div>
  );
}
