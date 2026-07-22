import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  hashParticipantPassword,
  normalizeParticipantName,
} from '@/lib/auth-password';
import { profileSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const validation = profileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validation.data;
    const needsPassword = !user.passwordHash;

    if (needsPassword && !data.password) {
      return NextResponse.json(
        { error: 'Choose a password so you can log back in after logout' },
        { status: 400 }
      );
    }

    if (normalizeParticipantName(data.name) === 'unnamed') {
      return NextResponse.json(
        { error: 'Please choose a different name' },
        { status: 400 }
      );
    }

    // Name must be unique within the event (case-insensitive) among real profiles
    const nameClash = await prisma.user.findFirst({
      where: {
        eventId: user.eventId,
        id: { not: user.id },
        name: { equals: data.name.trim(), mode: 'insensitive' },
        NOT: { name: 'Unnamed' },
      },
      select: { id: true },
    });
    if (nameClash) {
      return NextResponse.json(
        { error: 'That name is already taken for this event. Pick another or log in instead.' },
        { status: 409 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      name: data.name,
      organisation: data.organisation,
      role: data.role,
      country: data.country,
      skill: data.skill,
      curiosity: data.curiosity,
    };
    if (data.headline !== undefined) updatePayload.headline = data.headline || null;
    if (data.linkedinUrl !== undefined) updatePayload.linkedinUrl = data.linkedinUrl?.trim() || null;
    if (data.isDiscoverable !== undefined) updatePayload.isDiscoverable = data.isDiscoverable;
    if (data.password) {
      updatePayload.passwordHash = await hashParticipantPassword(data.password);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updatePayload as Prisma.UserUpdateInput,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        organisation: updated.organisation,
        role: updated.role,
        country: updated.country,
        skill: updated.skill,
        curiosity: updated.curiosity,
        headline: updated.headline ?? null,
        linkedinUrl: updated.linkedinUrl ?? null,
        isDiscoverable: updated.isDiscoverable ?? false,
        profileUpdatedAt: updated.updatedAt,
        hasPassword: Boolean(updated.passwordHash),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating profile' },
      { status: 500 }
    );
  }
}
