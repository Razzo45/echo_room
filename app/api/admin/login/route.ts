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
    
    // Handle empty string as undefined for email
    if (body.email === '') {
      body.email = undefined;
    }
    
    const validation = adminLoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // For backward compatibility: if no email provided, check ADMIN_PASSWORD env var
    if (!email || email.trim() === '') {
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminPassword) {
        console.error('ADMIN_PASSWORD environment variable is not set');
        return NextResponse.json(
          { error: 'Admin password not configured. Please set ADMIN_PASSWORD in your .env file.' },
          { status: 500 }
        );
      }
      
      if (password === adminPassword) {
        try {
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
            console.log('Created default admin account:', admin.email);
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
        } catch (dbError: any) {
          console.error('Database error during admin login:', dbError);
          
          // Check if it's a table doesn't exist error
          if (dbError.message?.includes('does not exist') || dbError.code === 'P2021') {
            return NextResponse.json(
              { error: 'Database tables not found. Please run: npx prisma migrate deploy or npx prisma db push' },
              { status: 500 }
            );
          }
          
          return NextResponse.json(
            { error: `Database error: ${dbError.message || 'Unknown error'}` },
            { status: 500 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Invalid password. Check your ADMIN_PASSWORD in .env file.' },
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
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: `An error occurred during login: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
