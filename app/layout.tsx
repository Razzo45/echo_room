import type { Metadata } from 'next';
import './globals.css';
import DebugBanner from '@/components/DebugBanner';

export const metadata: Metadata = {
  title: 'Echo Room - AI Powered Decision Environment',
  description: 'You don\'t leave with slides. You leave with a decision map.',
  manifest: '/manifest.json',
  themeColor: '#0ea5e9',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Echo Room',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DebugBanner />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
