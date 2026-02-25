/**
 * GET /api/admin/rooms
 * @jest-environment node
 */
import { GET } from '@/app/api/admin/rooms/route';

jest.mock('@/lib/auth-organiser', () => ({
  requireAdminAuth: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    room: { findMany: jest.fn() },
  },
}));

const { requireAdminAuth } = require('@/lib/auth-organiser');
const prisma = require('@/lib/db').prisma;

function req(url = 'http://localhost/api/admin/rooms') {
  return new Request(url);
}

describe('GET /api/admin/rooms', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns error when not authenticated', async () => {
    requireAdminAuth.mockRejectedValue(new Error('Admin authentication required'));
    const res = await GET(req());
    expect(res.status).toBeGreaterThanOrEqual(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 200 with rooms when authenticated', async () => {
    requireAdminAuth.mockResolvedValue({ id: 'a1', role: 'ADMIN' });
    prisma.room.findMany.mockResolvedValue([
      {
        id: 'r1',
        roomCode: 'ABC123',
        status: 'IN_PROGRESS',
        quest: { name: 'Quest 1' },
        members: [],
        _count: { votes: 3, commits: 1 },
        artifact: null,
      },
    ]);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rooms).toHaveLength(1);
    expect(data.rooms[0].roomCode).toBe('ABC123');
  });
});
