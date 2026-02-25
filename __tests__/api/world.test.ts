/**
 * API route: GET /api/world
 * Requires auth. Returns 401 when not authenticated.
 * @jest-environment node
 */
import { GET } from '@/app/api/world/route';

jest.mock('@/lib/db', () => ({
  prisma: {
    event: { findUnique: jest.fn() },
    region: { findMany: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}));

const { requireAuth } = require('@/lib/auth');
const prisma = require('@/lib/db').prisma;

describe('GET /api/world', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    requireAuth.mockRejectedValue(new Error('Unauthorized'));
    const res = await GET();
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 200 with event and regions when authenticated', async () => {
    requireAuth.mockResolvedValue({ id: 'u1', eventId: 'e1' });
    prisma.event.findUnique.mockResolvedValue({ name: 'Test Event' });
    prisma.region.findMany.mockResolvedValue([
      {
        id: 'r1',
        name: 'city-district',
        displayName: 'City District',
        description: 'Main area',
        isActive: true,
        _count: { quests: 3 },
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.event).toEqual({ name: 'Test Event' });
    expect(data.regions).toHaveLength(1);
    expect(data.regions[0].displayName).toBe('City District');
    expect(data.regions[0].questCount).toBe(3);
  });
});
