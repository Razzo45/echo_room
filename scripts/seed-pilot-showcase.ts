/**
 * Enrich live pilot events with showcase data for demos / exploration.
 * Idempotent: uses externalUserId `pilot:*` and fixed forum titles.
 *
 * Usage: npx tsx scripts/seed-pilot-showcase.ts
 * Optional: EVENT_CODES=TLASMARTCITY26,TEST2
 */
import { PrismaClient, ForumPostType } from '@prisma/client';
import crypto from 'crypto';
import { createInitialStoryState } from '../lib/story-runtime';
import { seedPlayspaceFromForumPost } from '../lib/forum-seed';

const prisma = new PrismaClient();

const EVENT_CODES = (process.env.EVENT_CODES || 'TLASMARTCITY26,TEST2')
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

type Persona = {
  slug: string;
  name: string;
  organisation: string;
  role: string;
  country: string;
  skill: string;
  curiosity: string;
  headline: string;
};

const PERSONAS: Persona[] = [
  {
    slug: 'mei-lin',
    name: 'Mei-Lin Hsu',
    organisation: 'Taipei Smart City Office',
    role: 'Programme Lead',
    country: 'Taiwan',
    skill: 'Civic tech',
    curiosity: 'District sensing',
    headline: 'Shipping sensor pilots that residents actually trust',
  },
  {
    slug: 'arjun',
    name: 'Arjun Mehta',
    organisation: 'Gridwise Labs',
    role: 'Solutions Architect',
    country: 'India',
    skill: 'IoT systems',
    curiosity: 'Building energy',
    headline: 'Turning building telemetry into operator-ready playbooks',
  },
  {
    slug: 'sofia',
    name: 'Sofia Alvarez',
    organisation: 'Urban Futures EU',
    role: 'Policy Designer',
    country: 'Spain',
    skill: 'Governance',
    curiosity: 'Data ethics',
    headline: 'Designing procurement that leaves room for learning',
  },
  {
    slug: 'kenji',
    name: 'Kenji Nakamura',
    organisation: 'Osaka Mobility Co.',
    role: 'Product Manager',
    country: 'Japan',
    skill: 'Mobility',
    curiosity: 'Traffic systems',
    headline: 'Looking for co-builders on corridor-level orchestration',
  },
  {
    slug: 'amara',
    name: 'Amara Okafor',
    organisation: 'Lagos Digital Commons',
    role: 'Community Lead',
    country: 'Nigeria',
    skill: 'Engagement',
    curiosity: 'Inclusive pilots',
    headline: 'Making smart-city pilots feel human on day one',
  },
  {
    slug: 'lena',
    name: 'Lena Vogt',
    organisation: 'Berlin Climate Works',
    role: 'Energy Analyst',
    country: 'Germany',
    skill: 'Analytics',
    curiosity: 'District energy',
    headline: 'Carbon maths meet real building operators',
  },
  {
    slug: 'diego',
    name: 'Diego Morales',
    organisation: 'Santiago Civic Lab',
    role: 'UX Researcher',
    country: 'Chile',
    skill: 'Research',
    curiosity: 'Resident trust',
    headline: 'Interviewing the people sensors forget',
  },
  {
    slug: 'priya',
    name: 'Priya Nair',
    organisation: 'Singapore GovTech',
    role: 'Engineering Manager',
    country: 'Singapore',
    skill: 'Platform',
    curiosity: 'Interop',
    headline: 'APIs that survive three mayor administrations',
  },
  {
    slug: 'noah',
    name: 'Noah Bergman',
    organisation: 'Nordic Sensing AB',
    role: 'Founder',
    country: 'Sweden',
    skill: 'Hardware',
    curiosity: 'Room-level sensing',
    headline: 'Cheap, honest sensors — no vapourware',
  },
  {
    slug: 'hana',
    name: 'Hana Park',
    organisation: 'Seoul Innovation Hub',
    role: 'Partnerships',
    country: 'South Korea',
    skill: 'BD',
    curiosity: 'Cross-border pilots',
    headline: 'Matching Taiwan builders with Seoul operators',
  },
];

type ForumSeed = {
  type: ForumPostType;
  title: string;
  body: string;
  pinned?: boolean;
  seedPlayspace?: boolean;
};

function forumForEvent(eventName: string, code: string): ForumSeed[] {
  const isTla = code === 'TLASMARTCITY26';
  if (isTla) {
    return [
      {
        type: 'NEWSLETTER',
        title: 'Welcome — your pre-event companion is live',
        pinned: true,
        body: `Welcome to ${eventName}.

Before you arrive, use Echo Room as your companion:

1. Make your profile discoverable (People) so others can find you.
2. Send a connection request to someone you’d like to meet on site.
3. Optional: play a 15-minute story together — leave with a named companion and a shared artifact.

This is not another booth-points app. It’s how cold outreach becomes a warm “I already know you.”`,
      },
      {
        type: 'SPEAKER',
        title: 'Speaker note: Room-level sensing that residents trust',
        body: `Mei-Lin Hsu (Taipei Smart City Office) opens with a blunt question: what does “comfort” mean when sensors disagree with how people feel?

Bring one story from your own building or district. In Echo Room, the Room-Level Sensing missions mirror this tension — privacy vs accuracy, pilot vs scale.`,
        seedPlayspace: true,
      },
      {
        type: 'PANEL',
        title: 'Panel preview: Who owns the district data layer?',
        body: `Friday panel with operators, founders, and city staff.

Themes to chew on before you sit down:
• Who pays for the data plane when vendors change?
• What must stay open for residents?
• How do we timebox pilots so nobody is stuck in eternal PoC?

Tip: find someone on People who disagrees with you — then optional play invite.`,
      },
      {
        type: 'UPDATE',
        title: 'Build jam logistics — arrive already knowing two people',
        body: `Doors open 09:00. Wi-Fi SSID will be posted at registration.

Success metric for this companion: by the time you walk in, you can point to 2–3 people you’ve already messaged or played with.

Companions page → print or screenshot your intro card if useful on site.`,
      },
      {
        type: 'NEWSLETTER',
        title: 'Digest: three playable themes this week',
        body: `New open rooms / missions from organiser updates:

• Optimizing Comfort — room-level tradeoffs (~15 min)
• Smart Building Integration — operator vs vendor incentives
• Traffic Management System — corridor orchestration under pressure

Already-open rooms keep their original story. New content opens new rooms only.`,
      },
    ];
  }

  return [
    {
      type: 'NEWSLETTER',
      title: 'Welcome — your pre-event companion is live',
      pinned: true,
      body: `Welcome to ${eventName} (code ${code}).

Explore the triple layer:
• People + Messages — professional networking
• This feed — speakers, panels, updates
• Echo Room — collaborative story play → companions + artifacts

Make yourself discoverable, connect with 2 peers, optionally play once.`,
    },
    {
      type: 'SPEAKER',
      title: 'Speaker note: Trust before the demo',
      body: `AI Governance track opener: frameworks are easy; trust is earned in small decisions.

Try the “Building AI Trust” mission with someone you’d normally only LinkedIn-message.`,
      seedPlayspace: true,
    },
    {
      type: 'PANEL',
      title: 'Panel: MedTech privacy vs diagnostic speed',
      body: `Patient Data Privacy quest mirrors the panel stakes. Arrive with one concrete tradeoff you want challenged.`,
    },
    {
      type: 'UPDATE',
      title: 'How to use Echo Room in 12 minutes',
      body: `1. Profile → discoverable on
2. People → connect
3. Messages → one real sentence
4. Echo Room → private play invite or open room
5. Companions → you’re set for the event`,
    },
  ];
}

function artifactHtml(opts: {
  questName: string;
  members: string[];
  summary: string;
}) {
  const team = opts.members.join(' · ');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${opts.questName}</title>
<style>body{font-family:IBM Plex Sans,system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;color:#0B1F3A;background:#F3F6FA}
h1{font-size:1.5rem;margin-bottom:.25rem}.meta{color:#4B5565;font-size:.875rem;margin-bottom:1.5rem}
.card{background:#fff;border:1px solid #C5CED9;border-radius:8px;padding:1.25rem;margin-bottom:1rem}
.tag{display:inline-block;font-size:.7rem;text-transform:uppercase;letter-spacing:.06em;color:#1D4ED8;margin-bottom:.5rem}</style></head>
<body>
<p class="tag">Shared story artifact</p>
<h1>${opts.questName}</h1>
<p class="meta">Cohort: ${team}</p>
<div class="card"><p>${opts.summary}</p></div>
<p class="meta">Generated for pilot exploration — Echo Room companions</p>
</body></html>`;
}

async function upsertPersonas(eventId: string) {
  const users = [];
  for (const p of PERSONAS) {
    const externalUserId = `pilot:${p.slug}`;
    const existing = await prisma.user.findFirst({
      where: { eventId, externalUserId },
    });
    const data = {
      name: p.name,
      organisation: p.organisation,
      role: p.role,
      country: p.country,
      skill: p.skill,
      curiosity: p.curiosity,
      headline: p.headline,
      isDiscoverable: true,
      externalUserId,
    };
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data })
      : await prisma.user.create({ data: { eventId, ...data } });
    users.push(user);
  }
  return users;
}

async function polishExistingUsers(eventId: string) {
  const incomplete = await prisma.user.findMany({
    where: {
      eventId,
      externalUserId: null,
      OR: [
        { isDiscoverable: false },
        { headline: null },
        { name: 'Unnamed' },
      ],
    },
  });

  // Only polish clearly incomplete profiles — skip joke/test personas with wild headlines
  for (const u of incomplete) {
    if (u.name === 'Unnamed' || u.organisation === 'Not set') continue;
    if (u.headline && /jesus|brother|bdjs|best human/i.test(u.headline)) continue;

    await prisma.user.update({
      where: { id: u.id },
      data: {
        isDiscoverable: true,
        headline:
          u.headline?.trim() ||
          `${u.role.trim()} at ${u.organisation.trim()} — open to pre-event companions`,
      },
    });
  }
}

async function ensureForum(
  eventId: string,
  organiserId: string,
  code: string,
  eventName: string
) {
  const seeds = forumForEvent(eventName, code);
  const posts: Awaited<ReturnType<typeof prisma.eventForumPost.create>>[] = [];
  for (const s of seeds) {
    const existing = await prisma.eventForumPost.findFirst({
      where: { eventId, title: s.title },
    });
    const post: Awaited<ReturnType<typeof prisma.eventForumPost.create>> = existing
      ? await prisma.eventForumPost.update({
          where: { id: existing.id },
          data: {
            type: s.type,
            body: s.body,
            pinned: Boolean(s.pinned),
            published: true,
            seedPlayspace: Boolean(s.seedPlayspace),
            publishedAt: existing.publishedAt ?? new Date(),
          },
        })
      : await prisma.eventForumPost.create({
          data: {
            eventId,
            organiserId,
            type: s.type,
            title: s.title,
            body: s.body,
            pinned: Boolean(s.pinned),
            published: true,
            seedPlayspace: Boolean(s.seedPlayspace),
            publishedAt: new Date(Date.now() - posts.length * 3600_000),
          },
        });

    if (s.seedPlayspace && !post.seededQuestId) {
      await seedPlayspaceFromForumPost(post);
    }
    posts.push(post);
  }
  return posts;
}

async function ensureSocialGraph(eventId: string, users: { id: string; name: string }[]) {
  // Accepted pairs
  const pairs: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [5, 7],
    [6, 8],
    [7, 9],
    [0, 5],
  ];

  for (const [a, b] of pairs) {
    const from = users[a];
    const to = users[b];
    if (!from || !to) continue;
    await prisma.networkRequest.upsert({
      where: {
        eventId_fromUserId_toUserId: {
          eventId,
          fromUserId: from.id,
          toUserId: to.id,
        },
      },
      create: {
        eventId,
        fromUserId: from.id,
        toUserId: to.id,
        status: 'ACCEPTED',
        note: 'Looking forward to meeting on site',
      },
      update: { status: 'ACCEPTED' },
    });
  }

  // One pending request into the first persona (so inbox feels alive)
  if (users[8] && users[0]) {
    await prisma.networkRequest.upsert({
      where: {
        eventId_fromUserId_toUserId: {
          eventId,
          fromUserId: users[8].id,
          toUserId: users[0].id,
        },
      },
      create: {
        eventId,
        fromUserId: users[8].id,
        toUserId: users[0].id,
        status: 'PENDING',
        note: 'Loved your headline on resident trust — connect?',
      },
      update: {},
    });
  }

  // Sample DMs
  const threads: Array<[number, number, string[]]> = [
    [
      0,
      1,
      [
        'Hey Arjun — saw you’re on building energy. Want to compare notes before Friday?',
        'Absolutely. I just finished a story room on comfort vs efficiency — artifact was useful.',
        'Nice. I’ll find you after the sensing panel.',
      ],
    ],
    [
      2,
      4,
      [
        'Amara — your inclusive-pilots angle resonates. Coffee before doors open?',
        'Yes. Companions card printed ✨',
      ],
    ],
  ];

  for (const [ai, bi, messages] of threads) {
    const a = users[ai];
    const b = users[bi];
    if (!a || !b) continue;
    const existing = await prisma.directMessage.count({
      where: {
        eventId,
        OR: [
          { senderId: a.id, recipientId: b.id },
          { senderId: b.id, recipientId: a.id },
        ],
      },
    });
    if (existing > 0) continue;
    let t = Date.now() - 86_400_000;
    for (let i = 0; i < messages.length; i++) {
      const sender = i % 2 === 0 ? a : b;
      const recipient = i % 2 === 0 ? b : a;
      await prisma.directMessage.create({
        data: {
          eventId,
          senderId: sender.id,
          recipientId: recipient.id,
          body: messages[i],
          createdAt: new Date(t),
          readAt: i < messages.length - 1 ? new Date(t + 60_000) : null,
        },
      });
      t += 15 * 60_000;
    }
  }
}

async function ensureRoomsAndArtifacts(
  eventId: string,
  eventCode: string,
  users: { id: string; name: string; organisation: string }[],
  questId: string,
  questName: string
) {
  const tag = eventCode.replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase() || 'PILOT';

  // Completed open cohort
  const openCode = `${tag}-O1`;
  let openRoom = await prisma.room.findUnique({ where: { roomCode: openCode } });
  if (!openRoom) {
    const members = users.slice(0, 3);
    const playerIds = members.map((m) => m.id);
    const completedAt = new Date(Date.now() - 2 * 86_400_000);
    const storyState = createInitialStoryState(playerIds, 5);
    storyState.phase = 'completed';
    storyState.currentBeat = 5;
    storyState.finalSynthesis = {
      status: 'done',
      text: 'The cohort chose transparency over speed, then staged a resident-visible pilot before vendor lock-in.',
      mode: 'pilot',
    };
    openRoom = await prisma.room.create({
      data: {
        eventId,
        questId,
        roomCode: openCode,
        status: 'COMPLETED',
        isPrivate: false,
        storyState: storyState as object,
        startedAt: new Date(completedAt.getTime() - 20 * 60_000),
        completedAt,
        lastActivityAt: completedAt,
        members: { create: members.map((m) => ({ userId: m.id, completedAt })) },
        artifact: {
          create: {
            htmlContent: artifactHtml({
              questName,
              members: members.map((m) => `${m.name} (${m.organisation})`),
              summary:
                'Shared decision map: start with resident-visible metrics, delay exclusive vendor contracts, publish a one-page trust note before scaling sensors.',
            }),
            shareToken: crypto.randomBytes(8).toString('hex'),
          },
        },
      },
    });
  }

  // Completed private 1:1
  const privCode = `${tag}-P1`;
  let privRoom = await prisma.room.findUnique({ where: { roomCode: privCode } });
  if (!privRoom) {
    const members = users.slice(3, 5);
    const completedAt = new Date(Date.now() - 86_400_000);
    const storyState = createInitialStoryState(
      members.map((m) => m.id),
      5
    );
    storyState.phase = 'completed';
    storyState.finalSynthesis = {
      status: 'done',
      text: 'Two builders aligned on a 15-minute trust ritual before any hardware PoC.',
      mode: 'pilot',
    };
    privRoom = await prisma.room.create({
      data: {
        eventId,
        questId,
        roomCode: privCode,
        status: 'COMPLETED',
        isPrivate: true,
        storyState: storyState as object,
        startedAt: new Date(completedAt.getTime() - 15 * 60_000),
        completedAt,
        lastActivityAt: completedAt,
        members: { create: members.map((m) => ({ userId: m.id, completedAt })) },
        artifact: {
          create: {
            htmlContent: artifactHtml({
              questName: `${questName} (private)`,
              members: members.map((m) => `${m.name} (${m.organisation})`),
              summary:
                'Private play outcome: meet on site at registration, bring one hard constraint each, skip the slide deck.',
            }),
            shareToken: crypto.randomBytes(8).toString('hex'),
          },
        },
      },
    });

    await prisma.playInvite.create({
      data: {
        eventId,
        fromUserId: members[0].id,
        toUserId: members[1].id,
        questId,
        roomId: privRoom.id,
        status: 'ACCEPTED',
        note: '15-min story before the panel?',
      },
    });
  }

  // Joinable open room
  const liveCode = `${tag}-LIVE`;
  let live = await prisma.room.findUnique({ where: { roomCode: liveCode } });
  if (!live) {
    const host = users[5];
    const storyState = createInitialStoryState([host.id], 5);
    live = await prisma.room.create({
      data: {
        eventId,
        questId,
        roomCode: liveCode,
        status: 'OPEN',
        isPrivate: false,
        storyState: storyState as object,
        lastActivityAt: new Date(),
        members: { create: [{ userId: host.id }] },
      },
    });
  }

  // Pending play invite for exploration
  const pendingExists = await prisma.playInvite.findFirst({
    where: {
      eventId,
      fromUserId: users[6]?.id,
      toUserId: users[7]?.id,
      status: 'PENDING',
    },
  });
  if (!pendingExists && users[6] && users[7]) {
    await prisma.playInvite.create({
      data: {
        eventId,
        fromUserId: users[6].id,
        toUserId: users[7].id,
        questId,
        status: 'PENDING',
        note: 'Want a 15-min story on resident trust?',
      },
    });
  }

  return { openRoom, privRoom, live };
}

async function enrichEvent(code: string) {
  const eventCode = await prisma.eventCode.findUnique({
    where: { code },
    include: { event: true },
  });
  if (!eventCode || !eventCode.active) {
    console.log(`⏭  Skip ${code} (missing or inactive)`);
    return;
  }
  const event = eventCode.event;
  if (!event.organiserId) {
    console.log(`⏭  Skip ${code} (no organiser)`);
    return;
  }

  console.log(`\n▶ Enriching ${code} — ${event.name}`);

  await prisma.event.update({
    where: { id: event.id },
    data: {
      startDate: event.startDate ?? new Date(),
      endDate: event.endDate ?? new Date(Date.now() + 14 * 86_400_000),
      offerPrivateRoomOnAccept: true,
      brandColor: event.brandColor === '#0ea5e9' ? '#0B1F3A' : event.brandColor,
    },
  });

  const users = await upsertPersonas(event.id);
  console.log(`  ✓ ${users.length} discoverable pilot personas`);

  await polishExistingUsers(event.id);
  console.log('  ✓ Polished incomplete existing profiles (where safe)');

  await ensureForum(event.id, event.organiserId, code, event.name);
  console.log('  ✓ Forum / newsletter posts');

  await ensureSocialGraph(event.id, users);
  console.log('  ✓ Network graph + sample DMs');

  const quest = await prisma.quest.findFirst({
    where: {
      isActive: true,
      questType: 'DECISION_ROOM',
      region: { eventId: event.id, isActive: true },
    },
    orderBy: { sortOrder: 'asc' },
  });
  if (!quest) {
    console.log('  ⚠ No decision quest — skip rooms');
    return;
  }

  await ensureRoomsAndArtifacts(event.id, code, users, quest.id, quest.name);
  console.log(`  ✓ Rooms + artifacts (quest: ${quest.name})`);
}

async function main() {
  console.log('Pilot showcase seed');
  console.log('Events:', EVENT_CODES.join(', '));
  for (const code of EVENT_CODES) {
    await enrichEvent(code);
  }
  console.log('\nDone. Explore with codes:', EVENT_CODES.join(', '));
  console.log('Organiser: organiser@test.com / organiser2026 → Insights + Forum');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
