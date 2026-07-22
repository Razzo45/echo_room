/**
 * API route: POST /api/auth/start
 * Tests validation and error responses. Success path requires DB (mocked or integration).
 * @jest-environment node
 */
import { POST } from '@/app/api/auth/start/route';

// Mock dependencies so we don't hit real DB or rate limit
jest.mock('@/lib/db', () => ({
  prisma: {
    eventCode: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      create: jest.fn(),
    },
  },
}));
jest.mock('@/lib/auth', () => ({
  createSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockReturnValue(true),
  getRateLimitKey: jest.fn().mockReturnValue('test-key'),
}));
jest.mock('@/lib/data-retention', () => ({
  purgeInactiveUsers: jest.fn().mockResolvedValue(0),
}));

const prisma = require('@/lib/db').prisma;

function request(body: unknown, headers = {}) {
  return new Request('http://localhost/api/auth/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/start', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when body is invalid (missing code)', async () => {
    const res = await POST(request({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 400 when code is empty string', async () => {
    const res = await POST(request({ code: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when event code is not found', async () => {
    prisma.eventCode.findUnique.mockResolvedValue(null);
    const res = await POST(request({ code: 'INVALID' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid|inactive/i);
  });

  it('returns 401 when event code is inactive', async () => {
    prisma.eventCode.findUnique.mockResolvedValue({
      id: '1',
      active: false,
      eventId: 'e1',
      maxUses: null,
      usedCount: 0,
    });
    const res = await POST(request({ code: 'INACTIVE' }));
    expect(res.status).toBe(401);
  });

  it('returns 200 and needsProfile when code is valid', async () => {
    prisma.eventCode.findUnique.mockResolvedValue({
      id: 'ec1',
      active: true,
      eventId: 'e1',
      maxUses: null,
      usedCount: 0,
    });
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      eventId: 'e1',
      name: 'Unnamed',
    });
    prisma.eventCode.update.mockResolvedValue({});
    const res = await POST(request({ code: 'VALID1' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.needsProfile).toBe(true);
    expect(data.userId).toBe('u1');
  });
});
