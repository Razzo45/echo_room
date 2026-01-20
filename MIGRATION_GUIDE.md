# Database Migrations for Echo Room

## Phase 2: Data-Driven Quests

### Models Added:
1. **QuestType** enum (DECISION_ROOM, FORM, SURVEY)
2. **QuestDecision** - Individual decisions within a quest
3. **QuestOption** - Options for each decision (A, B, C)
4. **QuestField** - Form fields for FORM-type quests
5. **FieldType** enum (TEXT, TEXTAREA, SELECT, MULTI_SELECT, DATE, NUMBER)
6. **QuestResponse** - Stores user responses to FORM quests
7. **AnalyticsEvent** - Tracks user actions
8. **AnalyticsEventType** enum

### Quest Model Updates:
- Added `questType` field (default: DECISION_ROOM)
- Added `sortOrder` field
- Added `isActive` field
- Made `decisionsData` optional (deprecated in favor of QuestDecision)

### Event Model Updates (Phase 1):
- Added `timezone` field
- Added `brandColor` field
- Added `logoUrl` field
- Added `sponsorLogos` field (JSON)

### Artifact Model Updates:
- Added `shareToken` field for public sharing

## Running Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema changes to database
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma db push

# Run seed to create demo data
npm run prisma:seed
```

## Seed Data Created

The seed creates:
- 1 Event: "Smart City Hackathon March 2026"
- 1 Event Code: SMARTCITY26
- 5 Districts (1 active: City District, 4 locked)
- 3 Quests in City District:
  1. Arrival and Intent (FORM) - 3 fields
  2. The City Traffic Dilemma (DECISION_ROOM) - 3 decisions
  3. Follow-up Plan (FORM) - 4 fields

## Verification

After running migrations and seed:

```bash
# Check database
npx prisma studio

# Verify tables exist
# Verify seed data is present
```
