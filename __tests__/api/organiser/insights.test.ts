/**
 * GET /api/organiser/insights?eventId=xxx
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/organiser/insights/route';

jest.mock('@/lib/auth-organiser', () => ({
  requireOrganiserAuth: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    event: { findFirst: jest.fn() },
    user: { findMany: jest.fn() },
    room: { findMany: jest.fn() },
    artifact: { findMany: jest.fn() },
    eventArtifactArchive: { findMany: jest.fn() },
    userBadge: { groupBy: jest.fn() },
    badge: { findMany: jest.fn() },
  },
}));

const { requireOrganiserAuth } = require('@/lib/auth-organiser');
const prisma = require('@/lib/db').prisma;

function req(url: string) {
  return new NextRequest(url);
}

describe('GET /api/organiser/insights', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    requireOrganiserAuth.mockRejectedValue(new Error('Organiser authentication required'));
    const res = await GET(req('http://localhost/api/organiser/insights?eventId=e1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when eventId missing', async () => {
    requireOrganiserAuth.mockResolvedValue({ id: 'o1', role: 'ORGANISER' });
    const res = await GET(req('http://localhost/api/organiser/insights'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/eventId|required/i);
  });

  it('returns 404 when event not found', async () => {
    requireOrganiserAuth.mockResolvedValue({ id: 'o1', role: 'ORGANISER' });
    prisma.event.findFirst.mockResolvedValue(null);
    const res = await GET(req('http://localhost/api/organiser/insights?eventId=bad'));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  it('returns 200 with event data when found', async () => {
    requireOrganiserAuth.mockResolvedValue({ id: 'o1', role: 'ORGANISER' });
    prisma.event.findFirst.mockResolvedValue({ id: 'e1', name: 'My Event' });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.room.findMany.mockResolvedValue([]);
    prisma.artifact.findMany.mockResolvedValue([]);
    prisma.eventArtifactArchive.findMany.mockResolvedValue([]);
    prisma.userBadge.groupBy.mockResolvedValue([]);
    prisma.badge.findMany.mockResolvedValue([]);
    const res = await GET(req('http://localhost/api/organiser/insights?eventId=e1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.event).toEqual({ id: 'e1', name: 'My Event' });
    expect(data.participants).toEqual([]);
  });
});
