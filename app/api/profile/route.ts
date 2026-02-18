import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
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

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updatePayload as any,
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
