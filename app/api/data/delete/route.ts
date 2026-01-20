import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, deleteSession } from '@/lib/auth';

export async function DELETE() {
  try {
    const user = await requireAuth();

    // Delete user and all related data (cascading deletes handle relationships)
    await prisma.user.delete({
      where: { id: user.id },
    });

    // Delete session
    await deleteSession();

    return NextResponse.json({
      success: true,
      message: 'All your data has been deleted',
      // Note: Client should clear localStorage on success
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete data error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting data' },
      { status: 500 }
    );
  }
}
