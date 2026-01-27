import { NextRequest, NextResponse } from 'next/server';
import { verifyOrganiserCredentials, createOrganiserSession } from '@/lib/auth-organiser';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const adminLoginSchema = z.object({
  email: z.string().email('Valid email is required').optional(),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = adminLoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // For backward compatibility: if no email provided, check ADMIN_PASSWORD env var
    if (!email) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminPassword && password === adminPassword) {
        // Try to find or create a default admin account
        const { prisma } = await import('@/lib/db');
        let admin = await prisma.organiser.findFirst({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
        });

        if (!admin) {
          // Create a default admin account
          const hashedPassword = await bcrypt.hash(password, 10);
          admin = await prisma.organiser.create({
            data: {
              email: 'admin@echo-room.local',
              name: 'System Administrator',
              passwordHash: hashedPassword,
              role: 'SUPER_ADMIN',
            },
          });
        }

        await createOrganiserSession(admin.id, admin.role as any);
        return NextResponse.json({
          success: true,
          message: 'Admin authenticated',
          organiser: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
          },
        });
      }

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
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

    const organiser = result.organiser;
    
    // Check if user has admin privileges
    if (organiser.role !== 'ADMIN' && organiser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    await createOrganiserSession(organiser.id, organiser.role as any);

    return NextResponse.json({
      success: true,
      message: 'Admin authenticated',
      organiser: {
        id: organiser.id,
        email: organiser.email,
        name: organiser.name,
        role: organiser.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
