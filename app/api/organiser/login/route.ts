import { NextResponse } from 'next/server';
import { verifyOrganiserCredentials, createOrganiserSession } from '@/lib/auth-organiser';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const organiser = await verifyOrganiserCredentials(email, password);

    if (!organiser) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await createOrganiserSession(organiser.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Organiser login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
