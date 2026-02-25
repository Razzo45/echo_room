/**
 * POST /api/admin/login
 * @jest-environment node
 */
import { POST } from '@/app/api/admin/login/route';

jest.mock('@/lib/auth-organiser', () => ({
  verifyOrganiserCredentials: jest.fn(),
  createOrganiserSession: jest.fn().mockResolvedValue(undefined),
}));

const { verifyOrganiserCredentials } = require('@/lib/auth-organiser');

function req(body: unknown) {
  return new Request('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when password missing', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/password|required/i);
  });

  it('returns 401 when credentials invalid', async () => {
    verifyOrganiserCredentials.mockResolvedValue({ success: false });
    const res = await POST(req({ email: 'admin@x.co', password: 'wrong' }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid|credentials/i);
  });

  it('returns 403 when user is organiser not admin', async () => {
    verifyOrganiserCredentials.mockResolvedValue({
      success: true,
      organiser: { id: 'o1', email: 'o@b.co', name: 'O', role: 'ORGANISER' },
    });
    const res = await POST(req({ email: 'o@b.co', password: 'secret' }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/admin|required/i);
  });

  it('returns 200 when admin credentials valid', async () => {
    verifyOrganiserCredentials.mockResolvedValue({
      success: true,
      organiser: { id: 'a1', email: 'admin@b.co', name: 'Admin', role: 'SUPER_ADMIN' },
    });
    const res = await POST(req({ email: 'admin@b.co', password: 'secret' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.organiser).toBeDefined();
    expect(data.organiser.role).toBe('SUPER_ADMIN');
  });
});
