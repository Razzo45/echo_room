import { cookies } from 'next/headers';
import { prisma } from './db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ORGANISER_SESSION_COOKIE = 'organiser_session';
const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export type OrganiserRole = 'ORGANISER' | 'ADMIN' | 'SUPER_ADMIN';

export async function verifyOrganiserCredentials(email: string, password: string): Promise<{ success: boolean; organiser?: any }> {
  const organiser = await prisma.organiser.findUnique({
    where: { email },
  });

  if (!organiser || !organiser.isActive) {
    return { success: false };
  }

  // For backward compatibility, check env password if no hash exists
  if (!organiser.passwordHash) {
    const envPassword = process.env.ORGANISER_PASSWORD;
    if (envPassword && password === envPassword) {
      // Migrate to hashed password (will be done on next login after migration)
      return { success: true, organiser };
    }
    return { success: false };
  }

  // Verify password hash (using bcrypt)
  const isValid = await bcrypt.compare(password, organiser.passwordHash);
  
  if (!isValid) {
    return { success: false };
  }

  // Update last login
  await prisma.organiser.update({
    where: { id: organiser.id },
    data: { lastLoginAt: new Date() },
  });

  return { success: true, organiser };
}

export async function createOrganiserSession(organiserId: string, role: OrganiserRole): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = generateSessionToken();
  
  // Store session in database for better security
  await prisma.organiserSession.create({
    data: {
      token: sessionToken,
      organiserId,
      expiresAt: new Date(Date.now() + SESSION_DURATION),
    },
  });
  
  cookieStore.set(ORGANISER_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });

  // Also set admin session cookie if ADMIN or SUPER_ADMIN
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    cookieStore.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });
  }
}

export async function getOrganiserSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ORGANISER_SESSION_COOKIE);
  return session?.value || null;
}

export async function getCurrentOrganiser() {
  const token = await getOrganiserSession();
  if (!token) {
    return null;
  }

  const session = await prisma.organiserSession.findUnique({
    where: { token },
    include: {
      organiser: true,
    },
  });

  if (!session || session.expiresAt < new Date() || !session.organiser.isActive) {
    return null;
  }

  return session.organiser;
}

export async function requireOrganiserAuth() {
  const organiser = await getCurrentOrganiser();
  if (!organiser) {
    throw new Error('Organiser authentication required');
  }
  return organiser;
}

export async function requireAdminAuth() {
  const organiser = await getCurrentOrganiser();
  if (!organiser) {
    throw new Error('Admin authentication required');
  }
  if (organiser.role !== 'ADMIN' && organiser.role !== 'SUPER_ADMIN') {
    throw new Error('Admin access required');
  }
  return organiser;
}

export async function requireSuperAdminAuth() {
  const organiser = await getCurrentOrganiser();
  if (!organiser) {
    throw new Error('Super admin authentication required');
  }
  if (organiser.role !== 'SUPER_ADMIN') {
    throw new Error('Super admin access required');
  }
  return organiser;
}

export async function destroyOrganiserSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ORGANISER_SESSION_COOKIE)?.value;
  
  if (token) {
    await prisma.organiserSession.deleteMany({
      where: { token },
    });
  }
  
  cookieStore.delete(ORGANISER_SESSION_COOKIE);
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
