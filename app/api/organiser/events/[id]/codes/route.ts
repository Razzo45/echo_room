import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOrganiserAuth } from '@/lib/auth-organiser';

// POST /api/organiser/events/[id]/codes
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireOrganiserAuth();

    const body = await request.json();
    const { count = 1, prefix = '', maxUses } = body;

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

function generateEventCode(prefix: string = ''): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
  const length = 8;
  let code = prefix.toUpperCase();
  
  for (let i = code.length; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}
