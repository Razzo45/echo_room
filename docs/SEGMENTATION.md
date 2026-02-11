# Per-event data segmentation

All reads and writes that touch event-scoped data must be filtered by event ownership (organiser) or explicitly scoped (admin).

## Schema: event-scoped resources

- **Event** – has `organiserId`. Only the owning organiser (or SUPER_ADMIN) may access.
- **EventCode**, **User**, **Room**, **Region**, **AnalyticsEvent**, **EventGeneration**, **RetentionCleanupLog** – all have `eventId`. Access must be constrained to events the caller is allowed to see.

## Organiser APIs

- **Rule:** Every organiser API that takes an `eventId` (path or query/body) must call `requireOrganiserEventAccess(organiser, eventId)` before any read/write. APIs that take a resource id (e.g. district id, quest id) must use `requireOrganiserDistrictAccess` or `requireOrganiserQuestAccess` so the resource’s event is owned by the organiser (or SUPER_ADMIN).
- **Helpers:** `lib/event-access.ts`
  - `requireOrganiserEventAccess(organiser, eventId)` → Event or throw 404
  - `requireOrganiserDistrictAccess(organiser, districtId)` → Region or throw 404
  - `requireOrganiserQuestAccess(organiser, questId)` → Quest or throw 404
- **Where used:** organiser events/[id], events/[id]/codes, events/[id]/generate, events/[id]/generate/commit, districts (GET/POST/PUT), districts/[id] DELETE, quests (GET/POST), quests/[id] (GET/PUT/DELETE), insights (GET).

## Admin APIs

- **Rule:** Admin can see all events. When listing event-scoped data (participants, rooms), support an optional `eventId` filter and always apply it when provided so responses are segmented by event.
- **move_user:** When moving a user between rooms, enforce that source and target room belong to the same event (no cross-event moves).

## Checklist for new routes

1. If the route is organiser and uses `eventId` or event-scoped resource id → use the appropriate `requireOrganiser*Access` at the start.
2. If the route is admin and returns event-scoped lists → accept optional `eventId` and add `where: eventId ? { eventId } : undefined` (or equivalent).
3. If the route mutates a resource by id (e.g. room, participant) → ensure the resource’s event is allowed for the caller (organiser) or that admin actions don’t cross event boundaries where it matters (e.g. move_user).
