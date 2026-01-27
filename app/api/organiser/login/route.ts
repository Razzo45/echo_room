import { NextResponse } from 'next/server';
import { verifyOrganiserCredentials, createOrganiserSession } from '@/lib/auth-organiser';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // For backward compatibility: if no email provided, check ORGANISER_PASSWORD env var
    if (!email) {
      const organiserPassword = process.env.ORGANISER_PASSWORD;
      if (organiserPassword && password === organiserPassword) {
        // Try to find or create a default organiser account
        let organiser = await prisma.organiser.findFirst({
          where: { role: 'ORGANISER', isActive: true },
        });

        if (!organiser) {
          // Create a default organiser account
          const hashedPassword = await bcrypt.hash(password, 10);
          organiser = await prisma.organiser.create({
            data: {
              email: 'organiser@echo-room.local',
              name: 'Default Organiser',
              passwordHash: hashedPassword,
              role: 'ORGANISER',
            },
          });
        }

        await createOrganiserSession(organiser.id, organiser.role as any);
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // New email-based authentication
    const result = await verifyOrganiserCredentials(email, password);
    
    if (!result.success || !result.organiser) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    await createOrganiserSession(result.organiser.id, result.organiser.role as any);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Organiser login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
