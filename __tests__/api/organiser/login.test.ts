/**
 * POST /api/organiser/login
 * @jest-environment node
 */
import { POST } from '@/app/api/organiser/login/route';

jest.mock('@/lib/auth-organiser', () => ({
  verifyOrganiserCredentials: jest.fn(),
  createOrganiserSession: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    organiser: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
  },
}));

const { verifyOrganiserCredentials, createOrganiserSession } = require('@/lib/auth-organiser');

function req(body: unknown) {
  return new Request('http://localhost/api/organiser/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/organiser/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when email provided but password missing', async () => {
    const res = await POST(req({ email: 'a@b.co' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/password|required/i);
  });

  it('returns 401 when credentials invalid', async () => {
    verifyOrganiserCredentials.mockResolvedValue({ success: false });
    const res = await POST(req({ email: 'a@b.co', password: 'wrong' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid|credentials/i);
  });

  it('returns 200 when credentials valid', async () => {
    verifyOrganiserCredentials.mockResolvedValue({
      success: true,
      organiser: { id: 'o1', email: 'a@b.co', name: 'O', role: 'ORGANISER' },
    });
    const res = await POST(req({ email: 'a@b.co', password: 'secret' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(createOrganiserSession).toHaveBeenCalledWith('o1', 'ORGANISER');
  });
});
