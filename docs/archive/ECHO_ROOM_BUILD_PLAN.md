# Echo Room - Implementation Build Plan

## Current State
✅ Next.js 14 + TypeScript + Prisma + SQLite  
✅ Event code auth, profiles, world map  
✅ Quest flow with 3 decisions  
✅ Room matchmaking, voting, artifacts  
✅ City district visual integration  
✅ Admin panel  

## Implementation Phases

### Phase 1: Organiser Mode (3hrs)
- Add ORGANISER_PASSWORD env var
- Organiser login + dashboard
- Event CRUD (name, date, timezone, brandColor, logoUrl, sponsorLogos)
- Event code generator
- Join link display

### Phase 2: Data-Driven Quests (4hrs)
- Add QuestType, QuestField models
- Organiser UI for districts + quests
- Seed 3 quests: Arrival, Traffic Dilemma, Follow-up
- Refactor quest player to be data-driven

### Phase 3: World Map ✅ DONE
- Already completed! City visual integrated

### Phase 4: Facilitation Controls (2hrs)
- Force start, advance decision, end quest buttons
- Enhanced admin panel

### Phase 5: Premium Artifacts (3hrs)
- Enhanced decision map with event branding
- Share links with tokens
- "My Artifacts" page

### Phase 6: Analytics (4hrs)
- AnalyticsEvent model + tracking
- Dashboard with metrics
- Pilot summary PDF export

## Total Estimate: 16 hours
Ready to begin!
