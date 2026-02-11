import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth, requireSuperAdminAuth } from '@/lib/auth-organiser';
import { logAdminAction } from '@/lib/admin-audit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createOrganiserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['ORGANISER', 'ADMIN', 'SUPER_ADMIN']),
});

const updateOrganiserSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ORGANISER', 'ADMIN', 'SUPER_ADMIN']).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAdminAuth();

    const organisers = await prisma.organiser.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ organisers });
  } catch (error: any) {
    if (error.message === 'Admin authentication required' || error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin get organisers error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdminAuth(); // Only super admins can create organisers

    const body = await request.json();
    const validation = createOrganiserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, name, password, role } = validation.data;

    // Check if email already exists
    const existing = await prisma.organiser.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const organiser = await prisma.organiser.create({
      data: {
        email,
        name,
        passwordHash,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAdminAction({
      organiserId: admin.id,
      action: 'organiser.create',
      resourceType: 'organiser',
      resourceId: organiser.id,
      details: { email: organiser.email, name: organiser.name, role: organiser.role },
    });

    return NextResponse.json({ organiser }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (error.message === 'Admin authentication required' || error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin create organiser error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireSuperAdminAuth(); // Only super admins can update organisers

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Organiser ID is required' },
        { status: 400 }
      );
    }

    const validation = updateOrganiserSchema.safeParse(updateData);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const updatePayload: any = { ...validation.data };

    // Hash password if provided
    if (updatePayload.password) {
      updatePayload.passwordHash = await bcrypt.hash(updatePayload.password, 10);
      delete updatePayload.password;
    }

    const organiser = await prisma.organiser.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        updatedAt: true,
      },
    });

    await logAdminAction({
      organiserId: admin.id,
      action: 'organiser.update',
      resourceType: 'organiser',
      resourceId: organiser.id,
      details: {
        email: organiser.email,
        updatedFields: Object.keys(validation.data),
        isActive: organiser.isActive,
      },
    });

    return NextResponse.json({ organiser });
  } catch (error: any) {
    if (error.message === 'Super admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (error.message === 'Admin authentication required' || error.message === 'Organiser authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin update organiser error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
