import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireOrganiserAuth, requireAdminAuth } from '@/lib/auth-organiser';
import { isStoryStateColumnMissing } from '@/lib/story-runtime';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

type User = Awaited<ReturnType<typeof requireAuth>>;
type Organiser = Awaited<ReturnType<typeof requireOrganiserAuth>>;
type Admin = Awaited<ReturnType<typeof requireAdminAuth>>;

type RouteContext = { params: Record<string, string> };

/**
 * Wrap a participant-authed route handler with standard auth/error handling.
 */
export function withAuth(
  handler: (user: User, req: NextRequest, ctx: RouteContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const user = await requireAuth();
      return await handler(user, req, ctx);
    } catch (error: unknown) {
      return handleRouteError(error);
    }
  };
}

/**
 * Wrap an organiser-authed route handler.
 */
export function withOrganiserAuth(
  handler: (organiser: Organiser, req: NextRequest, ctx: RouteContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const organiser = await requireOrganiserAuth();
      return await handler(organiser, req, ctx);
    } catch (error: unknown) {
      return handleRouteError(error);
    }
  };
}

/**
 * Wrap an admin-authed route handler.
 */
export function withAdminAuth(
  handler: (admin: Admin, req: NextRequest, ctx: RouteContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    try {
      const admin = await requireAdminAuth();
      return await handler(admin, req, ctx);
    } catch (error: unknown) {
      return handleRouteError(error);
    }
  };
}

function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('unauthorized') || msg.includes('authentication required') || msg.includes('admin') && msg.includes('required');
}

function handleRouteError(error: unknown): NextResponse {
  if (isAuthError(error)) {
    return jsonError('Unauthorized', 401);
  }
  if (isStoryStateColumnMissing(error)) {
    return jsonError('Runtime state migration is pending. Please run database migrations and retry.', 503);
  }
  console.error('API error:', error);
  return jsonError('An error occurred', 500);
}
