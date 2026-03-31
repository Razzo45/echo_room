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
import { POST as advancePost } from '@/app/api/room/[id]/runtime/advance/route';

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
  const merged = {
    ...room,
    quest: room.quest ?? { decisions: [] },
  };
  return {
    $executeRaw: jest.fn(),
    room: {
      findUnique: jest.fn().mockResolvedValue(merged),
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
              '4': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '5': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
            },
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
              '4': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '5': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
            },
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
              '4': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '5': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
            },
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

  it('start adminOverride succeeds for admin even when not room member', async () => {
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn(
        txForRoom({
          id: 'r1',
          status: 'OPEN',
          members: [{ userId: 'u2' }, { userId: 'u3' }],
          _count: { members: 2 },
          quest: { minTeamSize: 2 },
          storyState: null,
        })
      )
    );

    const res = await startPost(req('http://localhost/api/room/r1/start', { adminOverride: true }) as any, {
      params: { id: 'r1' },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('consequence adminOverride succeeds for admin even when not room member', async () => {
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn(
        txForRoom({
          id: 'r1',
          members: [{ userId: 'u2' }, { userId: 'u3' }],
          storyState: {
            phase: 'beat_consequence',
            currentBeat: 1,
            readyCheck: { startedAt: null, deadlineAt: null, readyByPlayerId: { u2: true, u3: true } },
            beats: {
              '1': {
                submissions: { u2: 'a', u3: 'b' },
                revealed: true,
                rolls: {
                  u2: { value: 10, band: 'mixed', rolledAt: '2026-03-24T00:00:00.000Z' },
                  u3: { value: 12, band: 'mixed', rolledAt: '2026-03-24T00:00:00.000Z' },
                },
                consequence: null,
                resolved: false,
              },
              '2': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '3': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '4': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '5': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
            },
            finalSynthesis: { status: 'idle', text: '', mode: '' },
          },
        })
      )
    );

    const res = await consequencePost(
      req('http://localhost/api/room/r1/runtime/consequence', { beat: 1, text: 'admin persisted', mode: 'admin', adminOverride: true }) as any,
      { params: { id: 'r1' } }
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.consequence.text).toBe('admin persisted');
  });

  it('advance moves beat_consequence to next beat input when consequence exists', async () => {
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn(
        txForRoom({
          id: 'r1',
          members: [{ userId: 'u1' }],
          storyState: {
            phase: 'beat_consequence',
            currentBeat: 1,
            readyCheck: { startedAt: null, deadlineAt: null, readyByPlayerId: { u1: true } },
            beats: {
              '1': {
                submissions: { u1: 'a' },
                revealed: true,
                rolls: {
                  u1: { value: 10, band: 'mixed', rolledAt: '2026-03-24T00:00:00.000Z' },
                },
                consequence: { text: 'ready', mode: 'auto', generatedAt: '2026-03-24T00:00:00.000Z' },
                resolved: true,
              },
              '2': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '3': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '4': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '5': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
            },
            finalSynthesis: { status: 'idle', text: '', mode: '' },
          },
        })
      )
    );

    const res = await advancePost(req('http://localhost/api/room/r1/runtime/advance', {}) as any, {
      params: { id: 'r1' },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.advanced).toBe(true);
    expect(json.storyState.phase).toBe('beat_input');
    expect(json.storyState.currentBeat).toBe(2);
  });

  it('advance after consequence waits until every player has continued', async () => {
    const storyState = {
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
          consequence: { text: 'ready', mode: 'auto', generatedAt: '2026-03-24T00:00:00.000Z' },
          resolved: true,
        },
        '2': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
        '3': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
        '4': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
        '5': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
      },
      finalSynthesis: { status: 'idle', text: '', mode: '' },
      consequenceContinue: {
        beat: 1,
        byPlayerId: { u1: false, u2: false },
      },
    };

    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn(
        txForRoom({
          id: 'r1',
          members: [{ userId: 'u1' }, { userId: 'u2' }],
          storyState: JSON.parse(JSON.stringify(storyState)),
        })
      )
    );

    const res1 = await advancePost(req('http://localhost/api/room/r1/runtime/advance', {}) as any, {
      params: { id: 'r1' },
    });
    const json1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(json1.advanced).toBe(false);
    expect(json1.continueAck).toEqual({ ready: 1, total: 2 });

    requireAuth.mockResolvedValue({ id: 'u2' });
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn(
        txForRoom({
          id: 'r1',
          members: [{ userId: 'u1' }, { userId: 'u2' }],
          storyState: {
            ...storyState,
            consequenceContinue: { beat: 1, byPlayerId: { u1: true, u2: false } },
          },
        })
      )
    );

    const res2 = await advancePost(req('http://localhost/api/room/r1/runtime/advance', {}) as any, {
      params: { id: 'r1' },
    });
    const json2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(json2.advanced).toBe(true);
    expect(json2.storyState.phase).toBe('beat_input');
    expect(json2.storyState.currentBeat).toBe(2);
  });

  it('advance returns 409 when consequence is missing in beat_consequence', async () => {
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn(
        txForRoom({
          id: 'r1',
          members: [{ userId: 'u1' }, { userId: 'u2' }],
          storyState: {
            phase: 'beat_consequence',
            currentBeat: 2,
            readyCheck: { startedAt: null, deadlineAt: null, readyByPlayerId: { u1: true, u2: true } },
            beats: {
              '1': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '2': {
                submissions: { u1: 'a', u2: 'b' },
                revealed: true,
                rolls: {
                  u1: { value: 9, band: 'fail', rolledAt: '2026-03-24T00:00:00.000Z' },
                  u2: { value: 11, band: 'mixed', rolledAt: '2026-03-24T00:00:00.000Z' },
                },
                consequence: null,
                resolved: false,
              },
              '3': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '4': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '5': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
            },
            finalSynthesis: { status: 'idle', text: '', mode: '' },
          },
        })
      )
    );

    const res = await advancePost(req('http://localhost/api/room/r1/runtime/advance', {}) as any, {
      params: { id: 'r1' },
    });
    expect(res.status).toBe(409);
  });

  it('advance is idempotent outside beat_consequence phase', async () => {
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn(
        txForRoom({
          id: 'r1',
          members: [{ userId: 'u1' }, { userId: 'u2' }],
          storyState: {
            phase: 'final_panel',
            currentBeat: 5,
            totalBeats: 5,
            readyCheck: { startedAt: null, deadlineAt: null, readyByPlayerId: { u1: true, u2: true } },
            beats: {
              '1': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '2': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '3': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '4': { submissions: {}, revealed: false, rolls: {}, consequence: null, resolved: false },
              '5': {
                submissions: { u1: 'a', u2: 'b' },
                revealed: true,
                rolls: {
                  u1: { value: 18, band: 'success', rolledAt: '2026-03-24T00:00:00.000Z' },
                  u2: { value: 19, band: 'critical_success', rolledAt: '2026-03-24T00:00:00.000Z' },
                },
                consequence: { text: 'done', mode: 'auto', generatedAt: '2026-03-24T00:00:00.000Z' },
                resolved: true,
              },
            },
            finalSynthesis: { status: 'done', text: 'summary', mode: 'ai' },
          },
        })
      )
    );

    const res = await advancePost(req('http://localhost/api/room/r1/runtime/advance', {}) as any, {
      params: { id: 'r1' },
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.advanced).toBe(false);
    expect(json.storyState.phase).toBe('final_panel');
  });
});
