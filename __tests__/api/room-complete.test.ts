/**
 * POST /api/room/[id]/complete
 * @jest-environment node
 */
import { POST } from '@/app/api/room/[id]/complete/route';

jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/artifact', () => ({
  generateArtifact: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    room: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    roomMember: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const { requireAuth } = require('@/lib/auth');
const { generateArtifact } = require('@/lib/artifact');
const prisma = require('@/lib/db').prisma;

function req(url = 'http://localhost/api/room/r1/complete') {
  return new Request(url, { method: 'POST' });
}

describe('POST /api/room/[id]/complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAuth.mockResolvedValue({ id: 'u1' });
  });

  it('allows completion when runtime phase is final_panel and promotes room to COMPLETED', async () => {
    prisma.room.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'IN_PROGRESS',
      storyState: { phase: 'final_panel' },
      members: [{ id: 'm1', userId: 'u1' }, { id: 'm2', userId: 'u2' }],
      artifact: null,
    });
    prisma.roomMember.findMany.mockResolvedValue([
      { id: 'm1', roomId: 'r1', userId: 'u1', completedAt: new Date().toISOString() },
      { id: 'm2', roomId: 'r1', userId: 'u2', completedAt: null },
    ]);

    const res = await POST(req() as any, { params: { id: 'r1' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.room.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          storyState: expect.objectContaining({ phase: 'completed' }),
        }),
      })
    );
  });

  it('generates artifact when all members have completed', async () => {
    prisma.room.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'COMPLETED',
      storyState: { phase: 'completed' },
      members: [{ id: 'm1', userId: 'u1' }, { id: 'm2', userId: 'u2' }],
      artifact: null,
    });
    prisma.roomMember.findMany.mockResolvedValue([
      { id: 'm1', roomId: 'r1', userId: 'u1', completedAt: new Date().toISOString() },
      { id: 'm2', roomId: 'r1', userId: 'u2', completedAt: new Date().toISOString() },
    ]);
    generateArtifact.mockResolvedValue({ id: 'a1' });

    const res = await POST(req() as any, { params: { id: 'r1' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.allCompleted).toBe(true);
    expect(data.artifactId).toBe('a1');
    expect(generateArtifact).toHaveBeenCalledWith('r1');
  });
});
