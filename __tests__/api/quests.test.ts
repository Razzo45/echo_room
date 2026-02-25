/**
 * API route: GET /api/quests?regionId=... or regionName=...
 * @jest-environment node
 */
import { GET } from '@/app/api/quests/route';

jest.mock('@/lib/db', () => ({
  prisma: {
    quest: { findMany: jest.fn() },
    region: { findFirst: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}));

const { requireAuth } = require('@/lib/auth');
const prisma = require('@/lib/db').prisma;

function request(url = 'http://localhost/api/quests') {
  return new Request(url);
}

describe('GET /api/quests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    requireAuth.mockRejectedValue(new Error('Unauthorized'));
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it('returns 200 with quests when authenticated and regionId provided', async () => {
    requireAuth.mockResolvedValue({ id: 'u1', eventId: 'e1' });
    prisma.quest.findMany.mockResolvedValue([
      {
        id: 'q1',
        name: 'Quest One',
        description: 'Do something',
        durationMinutes: 15,
        questType: 'DECISION_ROOM',
        regionId: 'r1',
        region: { name: 'city-district' },
      },
    ]);
    const res = await GET(request('http://localhost/api/quests?regionId=r1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.quests).toHaveLength(1);
    expect(data.quests[0].name).toBe('Quest One');
    expect(data.quests[0].regionName).toBe('city-district');
  });
});
