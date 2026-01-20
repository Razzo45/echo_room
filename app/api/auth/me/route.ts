import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const needsProfile = user.name === 'Unnamed';

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        organisation: user.organisation,
        role: user.role,
        country: user.country,
        skill: user.skill,
        curiosity: user.curiosity,
      },
      needsProfile,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
