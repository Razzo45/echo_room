# Badges System Migration Guide

## Overview

The badges system adds gamification to Echo Room, rewarding users for:
- Completing quests and rooms
- Collaborating with teams
- Providing detailed justifications
- Building consensus
- Connecting with diverse teams

## Database Migration

### Step 1: Update Schema

The schema has been updated with:
- `Badge` model - Badge definitions
- `UserBadge` model - User badge awards
- `BadgeType` enum - All badge types
- Additional indexes for performance

### Step 2: Run Migration

```bash
# Generate migration
npx prisma migrate dev --name add_badges_system

# Or for production
npx prisma migrate deploy
npx prisma generate
```

### Step 3: Seed Badge Definitions

Create a seed script or run manually:

```typescript
// scripts/seed-badges.ts
import { PrismaClient } from '@prisma/client';
import { getBadgeDefinition } from '../lib/badges';

const prisma = new PrismaClient();

async function main() {
  const badgeTypes = [
    'FIRST_QUEST_COMPLETE',
    'TEAM_PLAYER',
    'COLLABORATOR',
    'STORYTELLER',
    'DECISION_MAKER',
    'ARTIFACT_CREATOR',
    'QUEST_MASTER',
    'SOCIAL_CONNECTOR',
    'PERFECT_TEAM',
    'CONSENSUS_BUILDER',
    'DIVERSITY_CHAMPION',
  ];

  for (const badgeType of badgeTypes) {
    const def = getBadgeDefinition(badgeType as any);
    await prisma.badge.upsert({
      where: { badgeType: badgeType as any },
      update: def,
      create: { badgeType: badgeType as any, ...def },
    });
  }

  console.log('✅ Badge definitions seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run:
```bash
tsx scripts/seed-badges.ts
```

## Code Changes

### 1. Badge Service (`lib/badges.ts`)

New service handles:
- Badge awarding logic
- Room completion checks
- Global badge checks
- User badge retrieval

### 2. API Routes

- `GET /api/badges` - Get current user's badges
- `GET /api/badges/[userId]` - Get specific user's badges (public)

### 3. UI Components

- `components/BadgeDisplay.tsx` - Badge display component
- `app/badges/page.tsx` - Badges page
- Updated `app/me/page.tsx` - Shows badges section

### 4. Automatic Badge Awarding

Badges are automatically awarded when:
- Room is completed (via `checkRoomCompletionBadges`)
- Called from `app/api/commit/route.ts` when final decision is committed

## Badge Types

### Common Badges
- **First Steps** 🎯 - Completed first quest
- **Team Player** 🤝 - Completed a collaborative decision room
- **Collaborator** 💬 - Voted in all decisions of a room
- **Decision Maker** ⚡ - Committed to final decision
- **Artifact Creator** 🗺️ - Generated a decision map

### Rare Badges
- **Storyteller** 📖 - Provided detailed justifications in 3+ decisions
- **Social Connector** 🌐 - Teamed with 10+ different people
- **Perfect Team** ✨ - All team members voted and committed
- **Consensus Builder** 🎯 - Team reached unanimous votes

### Epic Badges
- **Quest Master** 🏆 - Completed 5+ quests
- **Diversity Champion** 🌍 - Teamed with people from 3+ different countries

## Testing

### Manual Testing

1. **Complete a room:**
   - Join a room with 3 members
   - Vote on all decisions
   - Commit to final decision
   - Check badges are awarded

2. **Check badge display:**
   - Visit `/me` page
   - Visit `/badges` page
   - Verify badges appear correctly

3. **Test badge API:**
   ```bash
   curl http://localhost:3000/api/badges
   ```

### Automated Testing (Future)

Consider adding:
- Unit tests for badge logic
- Integration tests for badge awarding
- E2E tests for badge display

## Backfilling Existing Data

If you have existing completed rooms, you can backfill badges:

```typescript
// scripts/backfill-badges.ts
import { PrismaClient } from '@prisma/client';
import { checkRoomCompletionBadges } from '../lib/badges';

const prisma = new PrismaClient();

async function main() {
  const completedRooms = await prisma.room.findMany({
    where: { status: 'COMPLETED' },
  });

  for (const room of completedRooms) {
    await checkRoomCompletionBadges(room.id);
    console.log(`Processed room ${room.id}`);
  }

  console.log(`✅ Backfilled badges for ${completedRooms.length} rooms`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Production Considerations

1. **Performance:**
   - Badge checks run asynchronously (don't block room completion)
   - Indexes added for fast badge queries
   - Consider caching badge definitions

2. **Scalability:**
   - Badge awarding is idempotent (safe to retry)
   - Can be moved to background job queue if needed

3. **Monitoring:**
   - Track badge award rates
   - Monitor badge distribution
   - Alert on badge awarding errors

## Future Enhancements

- Badge sharing/export
- Badge leaderboards
- Custom badge creation (organiser feature)
- Badge notifications (real-time)
- Badge progress tracking
- Badge categories/themes
