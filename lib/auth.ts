import { cookies } from 'next/headers';
import { prisma } from './db';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'mmo_session';
const SESSION_DURATION_DAYS = 7;

export async function createSession(userId: string, eventCodeId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const session = await prisma.session.create({
    data: {
      token,
      userId,
      eventCodeId,
      expiresAt,
    },
  });

  // Set httpOnly cookie
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return session;
}

export async function getSession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          event: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function deleteSession() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  cookies().delete(SESSION_COOKIE_NAME);
}

// Admin session (simple password check)
const ADMIN_SESSION_COOKIE = 'mmo_admin_session';

export async function createAdminSession() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2); // 2 hour admin session

  cookies().set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return token;
}

export async function isAdminAuthenticated() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return !!token;
}

export async function deleteAdminSession() {
  cookies().delete(ADMIN_SESSION_COOKIE);
}
