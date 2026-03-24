/**
 * POST /api/admin/rooms action coverage
 * @jest-environment node
 */
import { POST } from '@/app/api/admin/rooms/route';

jest.mock('@/lib/auth-organiser', () => ({
  requireAdminAuth: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    room: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    roomMember: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const { requireAdminAuth } = require('@/lib/auth-organiser');
const prisma = require('@/lib/db').prisma;

function req(body: unknown) {
  return new Request('http://localhost/api/admin/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/rooms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminAuth.mockResolvedValue({ id: 'a1', role: 'ADMIN' });
  });

  it('supports mark_completed action', async () => {
    const res = await POST(req({ action: 'mark_completed', roomId: 'r1' }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.room.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      })
    );
  });

  it('supports reset_ready_check action', async () => {
    prisma.room.findUnique.mockResolvedValue({
      id: 'r1',
      members: [{ userId: 'u1' }, { userId: 'u2' }],
      storyState: { phase: 'beat_input' },
    });
    const res = await POST(req({ action: 'reset_ready_check', roomId: 'r1' }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.room.update).toHaveBeenCalled();
  });

  it('supports regenerate_final_synthesis action', async () => {
    prisma.room.findUnique.mockResolvedValue({
      id: 'r1',
      storyState: { phase: 'final_panel', finalSynthesis: { status: 'done', text: 'x', mode: 'ai' } },
    });
    const res = await POST(req({ action: 'regenerate_final_synthesis', roomId: 'r1' }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.room.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storyState: expect.objectContaining({
            finalSynthesis: expect.objectContaining({ status: 'pending' }),
          }),
        }),
      })
    );
  });
});
