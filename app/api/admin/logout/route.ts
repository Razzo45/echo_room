import { NextResponse } from 'next/server';
import { destroyOrganiserSession } from '@/lib/auth-organiser';

export async function POST() {
  try {
    await destroyOrganiserSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
