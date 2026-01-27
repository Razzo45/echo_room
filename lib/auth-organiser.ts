import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import type { Organiser } from '@prisma/client';

const ORGANISER_SESSION_COOKIE = 'organiser_session';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

type OrganiserSessionPayload = {
  organiserId: string;
};

export async function verifyOrganiserCredentials(
  email: string,
  password: string
): Promise<Organiser | null> {
  const organiser = await prisma.organiser.findUnique({
    where: { email },
  });

  if (!organiser || !organiser.isActive) {
    return null;
  }

  const isValid = await bcrypt.compare(password, organiser.passwordHash);
  if (!isValid) {
    return null;
  }

  return organiser;
}

export async function createOrganiserSession(organiserId: string): Promise<void> {
  const cookieStore = cookies();
  const payload: OrganiserSessionPayload = { organiserId };
  const token = Buffer.from(JSON.stringify(payload)).toString('base64url');

  cookieStore.set(ORGANISER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  });
}

export async function getOrganiserFromSession(): Promise<Organiser | null> {
  const cookieStore = cookies();
  const raw = cookieStore.get(ORGANISER_SESSION_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const payload = JSON.parse(decoded) as OrganiserSessionPayload;
    if (!payload.organiserId) {
      return null;
    }

    const organiser = await prisma.organiser.findUnique({
      where: { id: payload.organiserId },
    });

    if (!organiser || !organiser.isActive) {
      return null;
    }

    return organiser;
  } catch (error) {
    // Invalid cookie format - treat as unauthenticated
    console.error('Failed to parse organiser session cookie:', error);
    return null;
  }
}

export async function destroyOrganiserSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(ORGANISER_SESSION_COOKIE);
}

export async function requireOrganiserAuth(): Promise<Organiser> {
  const organiser = await getOrganiserFromSession();
  if (!organiser) {
    throw new Error('Organiser authentication required');
  }
  return organiser;
}
