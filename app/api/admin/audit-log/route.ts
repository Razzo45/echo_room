import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-organiser';

// GET /api/admin/audit-log?page=1&limit=50&action=xxx
export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const skip = (page - 1) * limit;

    const where: { action?: string; resourceType?: string } = {};
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: {
          organiser: {
            select: { id: true, email: true, name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        details: l.details ? (JSON.parse(l.details) as Record<string, unknown>) : null,
        createdAt: l.createdAt,
        organiser: l.organiser,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === 'Admin authentication required' ||
        error.message === 'Admin access required')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin audit log get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}
