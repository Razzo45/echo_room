/**
 * API route: POST /api/vote
 * Validates body and returns 400 for invalid input.
 * @jest-environment node
 */
import { POST } from '@/app/api/vote/route';

jest.mock('@/lib/db', () => ({
  prisma: {
    room: { findUnique: jest.fn() },
    vote: { upsert: jest.fn(), findMany: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}));

const { requireAuth } = require('@/lib/auth');

function request(body: unknown) {
  return new Request('http://localhost/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/vote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    requireAuth.mockRejectedValue(new Error('Unauthorized'));
    const res = await POST(request({
      roomId: 'room1',
      decisionNumber: 1,
      optionKey: 'A',
      justification: 'I choose A',
    }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is invalid (missing roomId)', async () => {
    requireAuth.mockResolvedValue({ id: 'u1' });
    const res = await POST(request({
      decisionNumber: 1,
      optionKey: 'A',
      justification: 'x',
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when optionKey is not A/B/C', async () => {
    requireAuth.mockResolvedValue({ id: 'u1' });
    const res = await POST(request({
      roomId: 'r1',
      decisionNumber: 1,
      optionKey: 'D',
      justification: 'x',
    }));
    expect(res.status).toBe(400);
  });
});
