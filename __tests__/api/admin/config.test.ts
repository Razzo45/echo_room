/**
 * GET /api/admin/config (requires SuperAdmin)
 * @jest-environment node
 */
import { GET } from '@/app/api/admin/config/route';

jest.mock('@/lib/auth-organiser', () => ({
  requireSuperAdminAuth: jest.fn(),
}));

const { requireSuperAdminAuth } = require('@/lib/auth-organiser');

describe('GET /api/admin/config', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when not super admin', async () => {
    requireSuperAdminAuth.mockRejectedValue(new Error('Super admin access required'));
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns 200 with config when super admin', async () => {
    requireSuperAdminAuth.mockResolvedValue(undefined);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.config).toBeDefined();
    expect(data.config.systemName).toBeDefined();
    expect(data.config.features).toBeDefined();
    expect(data.config.limits).toBeDefined();
  });
});
