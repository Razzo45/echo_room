import { cookies } from 'next/headers';

const ORGANISER_SESSION_COOKIE = 'organiser_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function verifyOrganiserPassword(password: string): boolean {
  const correctPassword = process.env.ORGANISER_PASSWORD;
  if (!correctPassword) {
    throw new Error('ORGANISER_PASSWORD not configured');
  }
  return password === correctPassword;
}

export async function createOrganiserSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = generateSessionToken();
  
  cookieStore.set(ORGANISER_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

export async function getOrganiserSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ORGANISER_SESSION_COOKIE);
  return session?.value || null;
}

export async function destroyOrganiserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ORGANISER_SESSION_COOKIE);
}

export async function requireOrganiserAuth(): Promise<void> {
  const session = await getOrganiserSession();
  if (!session) {
    throw new Error('Organiser authentication required');
  }
}

function generateSessionToken(): string {
  return `org_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
