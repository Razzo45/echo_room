import bcrypt from 'bcryptjs';
import { PrismaClient, OrganiserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Creating organiser accounts...');

  const toCreate = [
    {
      email: 'organiser@test.com',
      name: 'Organiser One',
      password: 'organiser2026',
      role: OrganiserRole.ORGANISER as const,
    },
    {
      email: 'organiser2@test.com',
      name: 'Organiser Two',
      password: 'organiser22026',
      role: OrganiserRole.ORGANISER as const,
    },
  ];

  for (const entry of toCreate) {
    const existing = await prisma.organiser.findUnique({
      where: { email: entry.email },
    });

    if (existing) {
      console.log(`⚠️  Organiser with email ${entry.email} already exists, skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(entry.password, 10);

    const organiser = await prisma.organiser.create({
      data: {
        email: entry.email,
        name: entry.name,
        passwordHash,
        role: entry.role,
        isActive: true,
      },
    });

    console.log(`✅ Created organiser ${organiser.email} with role ${organiser.role}`);
  }

  // Assign first two events (by creation time) to each organiser for testing
  const organisers = await prisma.organiser.findMany({
    where: {
      email: {
        in: ['organiser@test.com', 'organiser2@test.com'],
      },
      isActive: true,
    },
    orderBy: { email: 'asc' },
  });

  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'asc' },
    take: 2,
  });

  if (organisers.length >= 2 && events.length >= 2) {
    const [org1, org2] = organisers;

    await prisma.event.update({
      where: { id: events[0].id },
      data: { organiserId: org1.id },
    });
    await prisma.event.update({
      where: { id: events[1].id },
      data: { organiserId: org2.id },
    });

    console.log(
      `✅ Assigned event "${events[0].name}" to ${org1.email} and "${events[1].name}" to ${org2.email}`
    );
  } else {
    console.log('⚠️ Not enough organisers or events to assign one event each.');
  }

  console.log('✨ Done.');
}

main()
  .catch((e) => {
    console.error('❌ Failed to create organisers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

