import webPush, { type PushSubscription } from 'web-push';
import { prisma } from '@/lib/db';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

let webPushConfigured = false;

function ensureConfigured() {
  if (webPushConfigured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('Web Push VAPID keys are not fully configured; push notifications will be disabled.');
    return;
  }
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  webPushConfigured = true;
}

type RawPushSubscription = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function savePushSubscription(userId: string, subscription: RawPushSubscription) {
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new Error('Invalid push subscription payload');
  }

  const { endpoint, keys } = subscription;
  const p256dh = keys.p256dh;
  const auth = keys.auth;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      endpoint,
      p256dh,
      auth,
      isActive: true,
    },
    update: {
      userId,
      p256dh,
      auth,
      isActive: true,
    },
  });
}

export async function sendRoomReadyPush(roomId: string) {
  ensureConfigured();
  if (!webPushConfigured) return;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      quest: true,
      event: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!room) return;

  const memberUserIds = room.members.map((m) => m.userId);

  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId: { in: memberUserIds },
      isActive: true,
    },
  });

  if (!subscriptions.length) return;

  const payload = JSON.stringify({
    type: 'room_ready',
    roomId: room.id,
    roomCode: room.roomCode,
    questName: room.quest.name,
    eventName: room.event.name,
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        const pushSub: PushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        await webPush.sendNotification(pushSub, payload);
      } catch (err: unknown) {
        const error = err as { statusCode?: number };
        const statusCode = error.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.update({
            where: { endpoint: sub.endpoint },
            data: { isActive: false },
          });
        } else {
          console.error('Failed to send push notification', err);
        }
      }
    })
  );
}

