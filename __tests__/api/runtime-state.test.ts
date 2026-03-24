/**
 * Runtime state API safety tests:
 * - idempotent action/roll/consequence behavior
 * - adminOverride authorization
 * @jest-environment node
 */
import { POST as actionPost } from '@/app/api/room/[id]/runtime/action/route';
import { POST as rollPost } from '@/app/api/room/[id]/runtime/roll/route';
import { POST as consequencePost } from '@/app/api/room/[id]/runtime/consequence/route';
import { POST as startPost } from '@/app/api/room/[id]/start/route';

jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth-organiser', () => ({
  requireAdminAuth: jest.fn(),
}));

const { prisma } = require('@/lib/db');
const { requireAuth } = require('@/lib/auth');
const { requireAdminAuth } = require('@/lib/auth-organiser');

function req(url: string, body: unknown) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function txForRoom(room: any) {
  return {
    $executeRaw: jest.fn(),
    room: {
      findUnique: jest.fn().mockResolvedValue(room),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('runtime-state endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAuth.mockResolvedValue({ id: 'u1' });
    requireAdminAuth.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
  });

  it('action submit is idempotent for same player/beat', async () => {
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn(
        txForRoom({
          id: 'r1',
          members: [{ userId: 'u1' }, { userId: 'u2' }],
          storyState: {
            phase: 'beat_input',
            currentBeat: 1,
            readyCheck: { startedAt: null, deadlineAt: null, readyByPlayerId: { u1: true, u2: true } },
            beats: {
              '1': { submissions: { u1: 'already' }, revealed: false, rolls: {}, consequence: null, resolved: false },
              '2': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '3': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
            },
            scoreboard: { playerTotals: { u1: 0, u2: 0 }, teamAverage: 0, teamBand: 'critical_fail' },
            finalSynthesis: { status: 'idle', text: '', mode: '' },
          },
        })
      )
    );

    const res = await actionPost(req('http://localhost/api/room/r1/runtime/action', { beat: 1, actionText: 'new' }) as any, {
      params: { id: 'r1' },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.idempotent).toBe(true);
    expect(json.actionText).toBe('already');
  });

  it('roll submit is idempotent for same player/beat', async () => {
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn(
        txForRoom({
          id: 'r1',
          members: [{ userId: 'u1' }, { userId: 'u2' }],
          storyState: {
            phase: 'roll_reveal',
            currentBeat: 1,
            readyCheck: { startedAt: null, deadlineAt: null, readyByPlayerId: { u1: true, u2: true } },
            beats: {
              '1': {
                submissions: { u1: 'a', u2: 'b' },
                revealed: false,
                rolls: { u1: { value: 12, band: 'mixed', rolledAt: '2026-03-24T00:00:00.000Z' } },
                consequence: null,
                resolved: false,
              },
              '2': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '3': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
            },
            scoreboard: { playerTotals: { u1: 0, u2: 0 }, teamAverage: 0, teamBand: 'critical_fail' },
            finalSynthesis: { status: 'idle', text: '', mode: '' },
          },
        })
      )
    );

    const res = await rollPost(
      req('http://localhost/api/room/r1/runtime/roll', { beat: 1, value: 15, band: 'success' }) as any,
      { params: { id: 'r1' } }
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.idempotent).toBe(true);
    expect(json.roll.value).toBe(12);
  });

  it('consequence is idempotent without override', async () => {
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn(
        txForRoom({
          id: 'r1',
          members: [{ userId: 'u1' }, { userId: 'u2' }],
          storyState: {
            phase: 'beat_consequence',
            currentBeat: 1,
            readyCheck: { startedAt: null, deadlineAt: null, readyByPlayerId: { u1: true, u2: true } },
            beats: {
              '1': {
                submissions: { u1: 'a', u2: 'b' },
                revealed: true,
                rolls: {
                  u1: { value: 10, band: 'mixed', rolledAt: '2026-03-24T00:00:00.000Z' },
                  u2: { value: 12, band: 'mixed', rolledAt: '2026-03-24T00:00:00.000Z' },
                },
                consequence: { text: 'persisted', mode: 'auto', generatedAt: '2026-03-24T00:00:00.000Z' },
                resolved: true,
              },
              '2': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '3': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
            },
            scoreboard: { playerTotals: { u1: 10, u2: 12 }, teamAverage: 11, teamBand: 'critical_fail' },
            finalSynthesis: { status: 'idle', text: '', mode: '' },
          },
        })
      )
    );

    const res = await consequencePost(
      req('http://localhost/api/room/r1/runtime/consequence', { beat: 1, text: 'new', mode: 'auto' }) as any,
      { params: { id: 'r1' } }
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.idempotent).toBe(true);
    expect(json.consequence.text).toBe('persisted');
  });

  it('consequence adminOverride is rejected for non-admin', async () => {
    requireAdminAuth.mockRejectedValueOnce(new Error('Admin access required'));
    const res = await consequencePost(
      req('http://localhost/api/room/r1/runtime/consequence', { beat: 1, text: 'x', mode: 'auto', adminOverride: true }) as any,
      { params: { id: 'r1' } }
    );
    expect(res.status).toBe(403);
  });

  it('start adminOverride is rejected for non-admin', async () => {
    requireAdminAuth.mockRejectedValueOnce(new Error('Admin access required'));
    const res = await startPost(req('http://localhost/api/room/r1/start', { adminOverride: true }) as any, {
      params: { id: 'r1' },
    });
    expect(res.status).toBe(403);
  });
});
