/**
 * Per-event data segmentation: ensure every organiser read/write is scoped to events
 * they own (or SUPER_ADMIN). Use these helpers in organiser APIs before touching
 * event-scoped resources.
 */
import { prisma } from './db';
import type { Event, Organiser, Region, Quest } from '@prisma/client';

type OrganiserLike = Pick<Organiser, 'id' | 'role'>;

/** Returns event if organiser has access (owns it or SUPER_ADMIN). Throws 404 if not found / no access. */
export async function requireOrganiserEventAccess(
  organiser: OrganiserLike,
  eventId: string
): Promise<Event> {
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      ...(organiser.role === 'SUPER_ADMIN' ? {} : { organiserId: organiser.id }),
    },
  });
  if (!event) {
    const err = new Error('Event not found');
    (err as any).status = 404;
    throw err;
  }
  return event;
}

/** Returns region (district) if organiser has access to its event. Throws 404 if not found / no access. */
export async function requireOrganiserDistrictAccess(
  organiser: OrganiserLike,
  districtId: string
): Promise<Region & { event: Event }> {
  const region = await prisma.region.findFirst({
    where: {
      id: districtId,
      event:
        organiser.role === 'SUPER_ADMIN'
          ? {}
          : { organiserId: organiser.id },
    },
    include: { event: true },
  });
  if (!region) {
    const err = new Error('District not found');
    (err as any).status = 404;
    throw err;
  }
  return region as Region & { event: Event };
}

/** Returns quest if organiser has access to its event (via region). Throws 404 if not found / no access. */
export async function requireOrganiserQuestAccess(
  organiser: OrganiserLike,
  questId: string
): Promise<Quest & { region: Region & { event: Event } }> {
  const quest = await prisma.quest.findFirst({
    where: {
      id: questId,
      region: {
        event:
          organiser.role === 'SUPER_ADMIN'
            ? {}
            : { organiserId: organiser.id },
      },
    },
    include: { region: { include: { event: true } } },
  });
  if (!quest) {
    const err = new Error('Quest not found');
    (err as any).status = 404;
    throw err;
  }
  return quest as Quest & { region: Region & { event: Event } };
}
