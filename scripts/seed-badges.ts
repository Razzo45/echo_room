import { PrismaClient } from '@prisma/client';
import { getBadgeDefinition } from '../lib/badges';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding badge definitions...');

  const badgeTypes = [
    'FIRST_CHAPTER',
    'NATURAL_TWENTY',
    'FUMBLE',
    'HOT_STREAK',
    'RISING_PHOENIX',
    'UNITED_FRONT',
    'SEASONED_ADVENTURER',
    'SOCIAL_BUTTERFLY',
    'ARTIFACT_COLLECTOR',
    'LEGENDARY_CAMPAIGN',
  ] as const;

  for (const badgeType of badgeTypes) {
    const def = getBadgeDefinition(badgeType);
    await prisma.badge.upsert({
      where: { badgeType },
      update: {
        name: def.name,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity,
      },
      create: {
        badgeType,
        name: def.name,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity,
      },
    });
    console.log(`✅ Badge: ${def.name} (${badgeType})`);
  }

  console.log('\n🎉 Badge definitions seeded successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
