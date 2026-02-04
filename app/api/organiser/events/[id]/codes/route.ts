import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

// POST /api/organiser/events/[id]/codes
// - existing behaviour: generate random codes by count
// - new behaviour: optionally accept explicit customCodes array
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

    const body = await request.json();
    const { count = 1, prefix = '', maxUses, customCodes } = body as {
      count?: number;
      prefix?: string;
      maxUses?: number | null;
      customCodes?: string[] | null;
    };

    // If organiser supplied explicit codes, validate and create those instead of random ones
    if (Array.isArray(customCodes) && customCodes.length > 0) {
      const trimmed = customCodes.map((c) => c.trim().toUpperCase()).filter(Boolean);

      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: 'At least one non-empty custom code is required' },
          { status: 400 }
        );
      }

      // Basic length / character validation
      const invalid = trimmed.find(
        (code) => code.length < 4 || code.length > 20 || !/^[A-Z0-9_-]+$/.test(code)
      );
      if (invalid) {
        return NextResponse.json(
          { error: 'Codes must be 4–20 characters and use only A–Z, 0–9, underscore or dash' },
          { status: 400 }
        );
      }

      // Ensure they are unique in this request
      const uniqueInRequest = new Set(trimmed);
      if (uniqueInRequest.size !== trimmed.length) {
        return NextResponse.json(
          { error: 'Duplicate codes in request. Each custom code must be unique.' },
          { status: 400 }
        );
      }

      // Check for existing codes in DB (global, since EventCode.code is unique)
      const existing = await prisma.eventCode.findMany({
        where: {
          code: { in: trimmed },
        },
        select: { code: true },
      });
      if (existing.length > 0) {
        const existingCodes = existing.map((e) => e.code).join(', ');
        return NextResponse.json(
          { error: `These codes already exist: ${existingCodes}` },
          { status: 400 }
        );
      }

      const created = await prisma.$transaction(
        trimmed.map((code) =>
          prisma.eventCode.create({
            data: {
              code,
              eventId: params.id,
              maxUses: typeof maxUses === 'number' ? maxUses : null,
            },
          })
        )
      );

      return NextResponse.json({ codes: created });
    }

    if (count < 1 || count > 100) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 100' },
        { status: 400 }
      );
    }

    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = generateEventCode(prefix);
      const eventCode = await prisma.eventCode.create({
        data: {
          code,
          eventId: params.id,
          maxUses: maxUses || null,
        },
      });
      codes.push(eventCode);
    }

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Generate codes error:', error);
    return NextResponse.json(
      { error: 'Failed to generate codes' },
      { status: 500 }
    );
  }
}

// GET /api/organiser/events/[id]/codes
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

    const codes = await prisma.eventCode.findMany({
      where: { eventId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Get codes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch codes' },
      { status: 500 }
    );
  }
}

// PATCH /api/organiser/events/[id]/codes
// Used to toggle active / inactive state for a given code belonging to this event
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

    const body = await request.json();
    const { codeId, active } = body as { codeId?: string; active?: boolean };

    if (!codeId || typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'codeId and active are required' },
        { status: 400 }
      );
    }

    // Ensure the code belongs to this event
    const existing = await prisma.eventCode.findFirst({
      where: {
        id: codeId,
        eventId: params.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Event code not found for this event' },
        { status: 404 }
      );
    }

    const updated = await prisma.eventCode.update({
      where: { id: codeId },
      data: { active },
    });

    return NextResponse.json({ code: updated });
  } catch (error) {
    console.error('Update code state error:', error);
    return NextResponse.json(
      { error: 'Failed to update event code' },
      { status: 500 }
    );
  }
}

// DELETE /api/organiser/events/[id]/codes
// Permanently delete an event code that has not been used yet
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

    const body = await request.json();
    const { codeId } = body as { codeId?: string };

    if (!codeId) {
      return NextResponse.json(
        { error: 'codeId is required' },
        { status: 400 }
      );
    }

    const existing = await prisma.eventCode.findFirst({
      where: {
        id: codeId,
        eventId: params.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Event code not found for this event' },
        { status: 404 }
      );
    }

    // Safety: do not allow deleting codes that have already been used
    if (existing.usedCount > 0) {
      return NextResponse.json(
        { error: 'This code has already been used. Deactivate it instead of deleting.' },
        { status: 400 }
      );
    }

    await prisma.eventCode.delete({
      where: { id: codeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete event code error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event code' },
      { status: 500 }
    );
  }
}

function generateEventCode(prefix: string = ''): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
  const length = 8;
  let code = prefix.toUpperCase();
  
  for (let i = code.length; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}
