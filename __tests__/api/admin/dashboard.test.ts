/**
 * GET /api/admin/dashboard
 * @jest-environment node
 */
import { GET } from '@/app/api/admin/dashboard/route';

jest.mock('@/lib/auth-organiser', () => ({
  requireAdminAuth: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    event: { count: jest.fn() },
    organiser: { count: jest.fn() },
    user: { count: jest.fn() },
    room: { count: jest.fn() },
  },
}));

const { requireAdminAuth } = require('@/lib/auth-organiser');
const prisma = require('@/lib/db').prisma;

describe('GET /api/admin/dashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    requireAdminAuth.mockRejectedValue(new Error('Admin authentication required'));
    const res = await GET();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 200 with stats and currentUser when authenticated', async () => {
    requireAdminAuth.mockResolvedValue({
      id: 'a1',
      email: 'admin@b.co',
      name: 'Admin',
      role: 'SUPER_ADMIN',
    });
    prisma.event.count.mockResolvedValue(3);
    prisma.organiser.count.mockResolvedValue(2);
    prisma.user.count.mockResolvedValue(50);
    prisma.room.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats).toEqual({
      events: 3,
      organisers: 2,
      participants: 50,
      rooms: 10,
      activeRooms: 2,
    });
    expect(data.currentUser.role).toBe('SUPER_ADMIN');
  });
});
