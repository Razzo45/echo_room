import { NextResponse } from 'next/server';
import { verifyOrganiserPassword, createOrganiserSession } from '@/lib/auth-organiser';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const isValid = verifyOrganiserPassword(password);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    await createOrganiserSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Organiser login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
