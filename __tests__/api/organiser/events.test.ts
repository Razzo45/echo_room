/**
 * GET/POST /api/organiser/events
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/organiser/events/route';

jest.mock('@/lib/auth-organiser', () => ({
  requireOrganiserAuth: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    event: { findMany: jest.fn(), create: jest.fn() },
  },
}));

const { requireOrganiserAuth } = require('@/lib/auth-organiser');
const prisma = require('@/lib/db').prisma;

describe('GET /api/organiser/events', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    requireOrganiserAuth.mockRejectedValue(new Error('Organiser authentication required'));
    const res = await GET(new Request('http://localhost/api/organiser/events'));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 200 with events when authenticated', async () => {
    requireOrganiserAuth.mockResolvedValue({ id: 'o1', role: 'ORGANISER' });
    prisma.event.findMany.mockResolvedValue([
      { id: 'e1', name: 'Event One', _count: { users: 5, rooms: 2 } },
    ]);
    const res = await GET(new Request('http://localhost/api/organiser/events'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.events).toHaveLength(1);
    expect(data.events[0].name).toBe('Event One');
  });
});

describe('POST /api/organiser/events', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    requireOrganiserAuth.mockRejectedValue(new Error('Organiser authentication required'));
    const res = await POST(
      new Request('http://localhost/api/organiser/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Event' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when name missing', async () => {
    requireOrganiserAuth.mockResolvedValue({ id: 'o1' });
    const res = await POST(
      new Request('http://localhost/api/organiser/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name|required/i);
  });

  it('returns 200 with event when valid', async () => {
    requireOrganiserAuth.mockResolvedValue({ id: 'o1' });
    prisma.event.create.mockResolvedValue({
      id: 'e1',
      name: 'New Event',
      organiserId: 'o1',
    });
    const res = await POST(
      new Request('http://localhost/api/organiser/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Event' }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.event).toBeDefined();
    expect(data.event.name).toBe('New Event');
  });
});
