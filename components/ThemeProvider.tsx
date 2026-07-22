'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Playspace routes use ECHOVOID; everything else uses CORRIDOR (incl. organiser/admin). */
export function resolveTheme(pathname: string | null): 'corridor' | 'echovoid' {
  if (!pathname) return 'corridor';
  if (
    pathname.startsWith('/world') ||
    pathname.startsWith('/district') ||
    pathname.startsWith('/room') ||
    pathname.startsWith('/artifact') ||
    pathname.startsWith('/badges') ||
    pathname.startsWith('/me')
  ) {
    return 'echovoid';
  }
  return 'corridor';
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const theme = resolveTheme(pathname);
    document.documentElement.setAttribute('data-theme', theme);
  }, [pathname]);

  return <>{children}</>;
}
