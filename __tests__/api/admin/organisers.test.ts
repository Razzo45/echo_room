/**
 * GET /api/admin/organisers
 * @jest-environment node
 */
import { GET } from '@/app/api/admin/organisers/route';

jest.mock('@/lib/auth-organiser', () => ({
  requireAdminAuth: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    organiser: { findMany: jest.fn() },
  },
}));

const { requireAdminAuth } = require('@/lib/auth-organiser');
const prisma = require('@/lib/db').prisma;

describe('GET /api/admin/organisers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    requireAdminAuth.mockRejectedValue(new Error('Admin authentication required'));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 200 with organisers when authenticated', async () => {
    requireAdminAuth.mockResolvedValue({ id: 'a1', role: 'ADMIN' });
    prisma.organiser.findMany.mockResolvedValue([
      { id: 'o1', email: 'o@b.co', name: 'Organiser', role: 'ORGANISER', isActive: true, lastLoginAt: null, createdAt: new Date().toISOString() },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.organisers).toHaveLength(1);
    expect(data.organisers[0].email).toBe('o@b.co');
  });
});
