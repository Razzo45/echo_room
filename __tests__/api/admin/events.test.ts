/**
 * GET /api/admin/events
 * @jest-environment node
 */
import { GET } from '@/app/api/admin/events/route';

jest.mock('@/lib/auth-organiser', () => ({
  requireAdminAuth: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    event: { findMany: jest.fn() },
  },
}));

const { requireAdminAuth } = require('@/lib/auth-organiser');
const prisma = require('@/lib/db').prisma;

describe('GET /api/admin/events', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    requireAdminAuth.mockRejectedValue(new Error('Admin authentication required'));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 200 with events when authenticated', async () => {
    requireAdminAuth.mockResolvedValue({ id: 'a1', role: 'ADMIN' });
    prisma.event.findMany.mockResolvedValue([
      { id: 'e1', name: 'Event One', _count: { users: 5, rooms: 2, eventCodes: 1 }, retentionLogs: [] },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.events).toHaveLength(1);
    expect(data.currentUser.role).toBe('ADMIN');
  });
});
