/**
 * API route: POST /api/auth/login
 * @jest-environment node
 */
import { POST } from '@/app/api/auth/login/route';

jest.mock('@/lib/db', () => ({
  prisma: {
    eventCode: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));
jest.mock('@/lib/auth', () => ({
  createSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/auth-password', () => ({
  normalizeParticipantName: (n: string) => n.trim().toLowerCase(),
  verifyParticipantPassword: jest.fn(),
}));
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue(true),
  getRateLimitKey: jest.fn().mockReturnValue('test-key'),
}));
jest.mock('@/lib/data-retention', () => ({
  purgeInactiveUsers: jest.fn().mockResolvedValue(0),
}));

const prisma = require('@/lib/db').prisma;
const { verifyParticipantPassword } = require('@/lib/auth-password');
const { createSession } = require('@/lib/auth');

function request(body: unknown) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when password too short', async () => {
    const res = await POST(
      request({ code: 'TEST', name: 'Ada', password: '123' })
    );
    expect(res.status).toBe(400);
  });

  it('returns 401 for unknown name', async () => {
    prisma.eventCode.findUnique.mockResolvedValue({
      id: 'ec1',
      active: true,
      eventId: 'e1',
    });
    prisma.user.findMany.mockResolvedValue([]);
    const res = await POST(
      request({ code: 'TEST', name: 'Ada', password: 'secret1' })
    );
    expect(res.status).toBe(401);
  });

  it('returns 200 and creates session when credentials match', async () => {
    prisma.eventCode.findUnique.mockResolvedValue({
      id: 'ec1',
      active: true,
      eventId: 'e1',
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'Ada', passwordHash: 'hash' },
    ]);
    verifyParticipantPassword.mockResolvedValue(true);

    const res = await POST(
      request({ code: 'TEST', name: 'Ada', password: 'secret1' })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.needsProfile).toBe(false);
    expect(createSession).toHaveBeenCalledWith('u1', 'ec1', false);
  });
});
