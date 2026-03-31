import { prisma } from '@/lib/db';
import { normalizeStoryState, stripInternalStoryState } from '@/lib/story-runtime';
import { withAuth, jsonOk, jsonError } from '@/lib/api-helpers';

export const GET = withAuth(async (user, _req, { params }) => {
  const roomId = params.id;
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: true },
  });

  if (!room) return jsonError('Room not found', 404);
  if (!room.members.some((m) => m.userId === user.id)) {
    return jsonError('Not a member of this room', 403);
  }

  const playerIds = room.members.map((m) => m.userId);
  const storyState = normalizeStoryState(room.storyState, playerIds);

  return jsonOk({
    roomId: room.id,
    status: room.status,
    storyState: stripInternalStoryState(storyState),
  });
});
