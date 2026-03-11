# Echo Room – Automated Tests

This project uses **Jest** with **React Testing Library** for unit and API tests. All tests live under `__tests__/` and run with `npm run test`.

## What’s covered

| Area | Location | What’s tested |
|------|----------|----------------|
| **Participant** | `__tests__/lib/`, `__tests__/api/`, `__tests__/pages/` | Validation schemas, auth start, world, quests, vote APIs; landing page (form, CTA) |
| **Organiser** | `__tests__/api/organiser/` | Login, events (list + create), insights (by event) |
| **Admin** | `__tests__/api/admin/` | Login, dashboard stats, config, organisers, events, rooms |

## How it tests each flow

### Participant flow

- **Validation** (`lib/validation.test.ts`): `eventCodeSchema`, `profileSchema`, `joinRoomSchema`, `voteSchema`, `adminLoginSchema` — valid inputs pass, invalid/missing fail.
- **Auth start** (`api/auth-start.test.ts`): `POST /api/auth/start` — 400 for bad/missing body, 401 for invalid/inactive code, 200 with `needsProfile`/`userId` when code is valid (DB/auth mocked).
- **World** (`api/world.test.ts`): `GET /api/world` — 401 when unauthenticated, 200 with event + regions when authenticated.
- **Quests** (`api/quests.test.ts`): `GET /api/quests?regionId=...` — 401 when unauthenticated, 200 with quests when authenticated.
- **Vote** (`api/vote.test.ts`): `POST /api/vote` — 401 when unauthenticated, 400 for invalid body (e.g. missing `roomId`, invalid `optionKey`).
- **Landing** (`pages/landing.test.tsx`): Renders “Echo Room”, event-code input, Continue button; button disabled when code empty, enabled when code entered; `/api/auth/me` mocked so form is shown.

### Organiser flow

- **Login** (`api/organiser/login.test.ts`): `POST /api/organiser/login` — 400 when email given but no password, 401 when credentials invalid, 200 when valid (session creation mocked).
- **Events** (`api/organiser/events.test.ts`): `GET` — 401 when not authenticated, 200 with events when authenticated. `POST` — 401 when not authenticated, 400 when name missing, 200 with new event when valid.
- **Insights** (`api/organiser/insights.test.ts`): `GET /api/organiser/insights?eventId=...` — 401 when not authenticated, 400 when `eventId` missing, 404 when event not found, 200 with event/participants/rooms/artifacts/badges when found.

### Admin flow

- **Login** (`api/admin/login.test.ts`): `POST /api/admin/login` — 400 when password missing, 401 when credentials invalid, 403 when user is organiser (not admin), 200 with `organiser` when admin/SUPER_ADMIN.
- **Dashboard** (`api/admin/dashboard.test.ts`): `GET /api/admin/dashboard` — 401 when not authenticated, 200 with `stats` (events, organisers, participants, rooms, activeRooms) and `currentUser`.
- **Config** (`api/admin/config.test.ts`): `GET /api/admin/config` — 403 when not super admin, 200 with `config` (systemName, version, features, limits) when super admin.
- **Organisers** (`api/admin/organisers.test.ts`): `GET /api/admin/organisers` — 401 when not authenticated, 200 with organisers list when authenticated.
- **Events** (`api/admin/events.test.ts`): `GET /api/admin/events` — 401 when not authenticated, 200 with events and `currentUser.role` when authenticated.
- **Rooms** (`api/admin/rooms.test.ts`): `GET /api/admin/rooms` — error when not authenticated, 200 with rooms (roomCode, status, questName, members, etc.) when authenticated.

## How tests are run

- **API and lib tests** use `@jest-environment node` (see docblock at top of each file) so Node provides `Request`/`Response` and no browser is needed.
- **Page test** (landing) uses **jsdom** and mocks `next/navigation` and `fetch`.
- **Mocks**: `@/lib/db` (Prisma), `@/lib/auth`, `@/lib/auth-organiser`, `@/lib/rate-limit` are mocked so tests don’t hit a real DB or auth backend.

## Commands

```bash
cd D:\echo-room-phase1-2
npm run test          # run full suite
npm run test -- --testPathPattern=admin   # admin only
npm run test -- --testPathPattern=organiser  # organiser only
```

## Summary

The suite checks **validation**, **participant auth and world/quests/vote APIs**, **landing page behaviour**, **organiser login and events/insights APIs**, and **admin login, dashboard, config, organisers, events, and rooms APIs** — all without a real database or external services.
