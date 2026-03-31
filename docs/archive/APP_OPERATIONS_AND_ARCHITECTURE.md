# Echo Room — App Operations & Architecture (Freeze / Handover)

This document describes **all functionalities**, how they work, how they connect, the **database schema**, and **infrastructure ownership**. Use it as the single source of truth when onboarding new developers or handing over the project.

**Tagline:** *You don't leave with slides. You leave with a decision map.*

Echo Room is an AI-powered decision environment for events: participants join via event codes, complete team quests (structured A/B/C decisions with justifications), and leave with a shared decision-map artifact. Organisers create events and generate or edit quest content; admins manage the platform and data lifecycle.

---

## 1. Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database ORM | Prisma |
| Database | **PostgreSQL** (production: Neon; see §5) |
| Styling | Tailwind CSS |
| Auth (participant) | Session cookie after event-code validation |
| Auth (organiser / admin) | Organiser model + session cookie (bcrypt); same login, role determines access |
| AI | OpenAI API (e.g. gpt-4o) for quest generation |
| PWA | next-pwa (optional) |
| Deployment | **Vercel** (see §6) |
| Repo | **GitHub** (see §7) |

---

## 2. Three panels and how they connect

There are three distinct user surfaces. **All participant data is scoped by event**; organisers only see their own events unless they are SUPER_ADMIN.

### 2.1 Participant (client) flow

**Entry:** Landing page → enter **event code** → validate via `POST /api/auth/start` → create/load **User** and **Session** (cookie). If first time, redirect to **Profile**; else to **World**.

**Core journey:**

1. **Profile** (`/profile`) — Name, organisation, role, country, skill, curiosity, headline, LinkedIn, “show in People directory” (isDiscoverable). Saves to User. Terms/data retention mentioned before “Continue to World Map”.
2. **World** (`/world`) — Event name, identity line (“Today you’re exploring {event} as {role} from {country}. Curious about: {curiosity}”). **Event progress** (X/Y quests completed) and **per-region completion** (Z% explored, A/B quests) from `GET /api/progress` and `GET /api/world`.
3. **District** (`/district`) — Lists regions and their **quests** (DECISION_ROOM, FORM, etc.). User picks a quest.
4. **Room lobby** (`/room/[id]`) — Join via **room code** or “Create room”. `POST /api/room/join` does matchmaking: finds OPEN room with space (respects quest `teamSize` / `minTeamSize`) or creates one. Room **auto-starts** when `minTeamSize` is reached.
5. **Quest play** (`/room/[id]/play`) — For DECISION_ROOM: 3 decisions. For each, user picks A/B/C and a **justification** (120 chars UI, 160 max in API), with optional prompts (risk, benefits, tradeoff). **Async:** each user progresses at their own pace; votes are per-user; room advances when everyone has voted for that decision. After submitting a vote: micro-recognition (“First to vote”, “Matches majority”, “X others voted differently”). When all have voted on all 3: room status → COMPLETED, commits recorded.
6. **Completion** — Each member calls `POST /api/room/[id]/complete` to mark “I’m done”. When **all members** have completed, **artifact** (decision map HTML) is generated once. UI shows “Your Decision Map is ready”, **Decision Style** (Consensus Seeker / Strategic Optimist / Risk-Averse Planner / Bold Innovator from vote vs commit match), vote breakdown, and “View decision map”.
7. **Artifact** (`/artifact/[id]`) — View/download shared decision map (team, decisions, options, tradeoffs, justifications). Optional share token for public link.
8. **My Rooms & Artifacts** (`/me`) — Hub: rooms (Open / In progress / Completed), links to Continue Quest or View Decision Map, **badges**, level (XP), “Delete all my data”.
9. **People** (`/people`) — Networking: search by name/org/role/headline; only users with `isDiscoverable=true`. **Decision Neighbours** from `GET /api/people/neighbours` (agreement % in shared completed rooms). Level and “worked with X people from Y countries”.
10. **Badges** (`/badges`) — BadgeDisplay: earned badges (sorted by rarity + journey), progress hints (“You’re close to …”), next-up hint. In play flow, contextual hint e.g. “You’re close to Storyteller” when justification step is shown.

**How participant data feeds elsewhere:** User, Session, RoomMember, Vote, DecisionCommit, UserBadge, and Artifact are all keyed by event (via Event → User, Event → Room, etc.). Progress and world use completed rooms per event. Insights (organiser) and admin views read the same data, filtered by event.

### 2.2 Organiser flow

**Entry:** `/organiser` → login (Organiser email + password) → session cookie. **Scoping:** organisers see only events where `event.organiserId = organiser.id`; SUPER_ADMIN sees all.

**Core features:**

1. **Dashboard** (`/organiser/dashboard`) — List events (with codes count). Links to event detail and Insights.
2. **Events** — Create event (`/organiser/events/new`). Event detail (`/organiser/events/[id]`): name, description, dates, **event codes** (generate random or **custom codes** with validation, 4–20 chars, unique). **Activate/deactivate** codes (PATCH); **delete** unused codes (DELETE). **AI brief** + “Generate Rooms”: calls `POST /api/organiser/events/[id]/generate` → OpenAI (or mock if `event.debugMode`) → status GENERATING → DRAFT. **Re-generate confirmation** modal (“content will be lost and replaced”). **Commit** reviewed/edited draft: `POST /api/organiser/events/[id]/generate/commit` — validates ≥2 quests, **nulls UserBadge.roomId** for affected rooms (so badges are retained), **archives** existing room artifacts to EventArtifactArchive, then deletes old AI-generated quests/rooms and writes new regions/quests.
3. **Districts (regions)** — Create/edit regions; delete only if no quests. Quest list per region.
4. **Quests** — Create/edit quests (name, type, duration, teamSize, minTeamSize, decisions/options or form fields). **Delete** quest only if no active rooms. **Revert** to AI baseline when quest was AI-generated (from EventGeneration.output).
5. **Insights** (`/organiser/insights`) — Per-event: **participants**, **rooms** (with members = “who joined who”), **badge stats**, **artifacts** (live + **archived**). Archived list links to `/organiser/archived-artifact/[id]` (EventArtifactArchive). Download/explore artifact HTML.
6. **Archived artifact** — View archived decision map by id (event-scoped).

**How organiser actions feed the system:** Event codes create Sessions/Users. Generate/commit creates Regions, Quests, QuestDecision, QuestOption (and Rooms when participants join). Edits to quests/regions affect what participants see on World/District and in rooms. EventArtifactArchive is written on commit (and optionally on room close) so organisers never lose past decision maps.

### 2.3 Admin flow

**Entry:** `/admin/login` — same Organiser table; **ADMIN** or **SUPER_ADMIN** role required. Session cookie.

**Sections (dashboard `/admin`):**

1. **Events** — List events; toggle **debug mode** (uses debug clone event so production data is untouched); set **retention override** (“keep longer”); view/edit event.
2. **Organisers** — List organisers, create/update/deactivate, reset password. Events linked to organiser.
3. **Participants** — Per-event (or global) list; **remove participant** (delete user + cascade: sessions, room members, votes, badges, etc.) with confirmation.
4. **Rooms** — List rooms; **close single room**; **“Close inactive (1 week)”** — rooms IN_PROGRESS with `lastActivityAt` (or `updatedAt`) older than 7 days → status CLOSED, `closedAt` set. (Artifact archiving on close can be added here.)
5. **Data lifecycle** (`/admin/retention`) — **Eligibility**: events with `endDate + 2 weeks` in the past and no `retentionOverride`. **Run cleanup** per event: deletes Sessions, Votes, DecisionCommits, Artifacts, UserBadges, RoomMembers, Rooms, Users, AnalyticsEvents for that event; writes **RetentionCleanupLog**. **Override** per event: “Keep data longer” (retentionOverride + audit).
6. **Audit log** — Admin/SuperAdmin actions (participant.remove, retention.override, organiser.create, etc.) with resourceType, resourceId, details.
7. **System config** — App-level limits (e.g. max event codes, max rooms per event).

**How admin feeds the system:** Retention keeps DB size and compliance under control. Room close frees “stuck” rooms. Organiser and participant management support multi-tenant and GDPR-style workflows.

---

## 3. How everything feeds into everything else (high level)

- **Event** is the root: EventCode → Session → User (all for one event). Event has Regions → Quests; Quests have Rooms. So: **Event → Regions → Quests → Rooms → RoomMembers, Votes, DecisionCommits, Artifact**. User and Room are always event-scoped.
- **Badges** are awarded on room completion (`checkRoomCompletionBadges`), keyed by User and optionally Room. When organisers **remake** content (generate/commit), **UserBadge.roomId** is nulled for removed rooms so **badges are retained**.
- **Progress** (quests completed, region %) is derived from RoomMember + Room.status COMPLETED per event.
- **XP / level** (Explorer, City Contributor, Decision Architect) from `lib/xp.ts`: votes, completed rooms, unanimous rooms. Returned by `/api/me` and `/api/auth/me`; shown on World, Profile, /me, People.
- **Artifact** is created once per room when status is COMPLETED and **all** RoomMembers have `completedAt` set (POST `/api/room/[id]/complete`). Artifact HTML is stored; optional PDF (base64 in cloud). **EventArtifactArchive** stores a copy when event content is replaced (generate/commit) so Insights always has history.
- **Organiser** owns Events (`event.organiserId`). **requireOrganiserEventAccess** ensures every organiser API only touches their events (or all if SUPER_ADMIN). **Debug mode**: event has `debugMode`; admin turns it on → clone event created, organiser/participant traffic uses clone; original unchanged.

---

## 4. Database schema (summary and ownership)

**Database:** PostgreSQL. **Production:** hosted on **Neon** (freemium tier). **Ownership and access:** under **Super Admin credentials** (the same Neon account that owns the project).

### 4.1 Core entities

| Model | Purpose |
|-------|--------|
| **Event** | One event (name, dates, organiserId, aiBrief, aiGenerationStatus, retentionOverride, debugMode, debug clone pointer). Root for event-scoped data. |
| **EventCode** | Unique code (e.g. SMARTCITY26). eventId, active, maxUses, usedCount. Used at participant login. |
| **User** | Participant: eventId, name, organisation, role, country, skill, curiosity, headline, linkedinUrl, isDiscoverable. One per event participation. |
| **Session** | Participant session: token (cookie), userId, eventCodeId, expiresAt. |
| **Region** | “District”: eventId, name, displayName, sortOrder, isActive. Groups quests. |
| **Quest** | regionId, name, description, questType (DECISION_ROOM/FORM/SURVEY), durationMinutes, teamSize, minTeamSize, sortOrder, eventGenerationId (if AI). |
| **QuestDecision** | questId, decisionNumber, title, context. One per decision (e.g. 3 per quest). |
| **QuestOption** | decisionId, optionKey (A/B/C), title, description, impact, tradeoff. |
| **QuestField** | For FORM quests: questId, fieldKey, label, fieldType, options, etc. |
| **QuestResponse** | Form submissions: questId, userId, responses JSON. |
| **Room** | eventId, questId, roomCode (unique), status (OPEN/FULL/IN_PROGRESS/COMPLETED/CLOSED), currentDecision, startedAt, completedAt, lastActivityAt, closedAt. |
| **RoomMember** | roomId, userId, joinedAt, completedAt (set when user “completes” after room is COMPLETED). |
| **Vote** | roomId, userId, decisionNumber, optionKey, justification. One per user per decision. |
| **DecisionCommit** | roomId, decisionNumber, committedOption (final A/B/C for that decision). |
| **Artifact** | roomId (1:1), htmlContent, pdfPath/pdfContent, shareToken. |
| **EventArtifactArchive** | eventId, roomCode, questName, htmlContent. Snapshot when event content is replaced (and can be used when closing inactive rooms). |

### 4.2 Gamification and AI

| Model | Purpose |
|-------|--------|
| **Badge** | BadgeType (enum), name, description, icon, rarity. One row per badge type. |
| **UserBadge** | userId, badgeId, roomId (nullable), metadata, earnedAt. roomId nulled when room is removed so badge is kept. |
| **EventGeneration** | eventId, status (IDLE/GENERATING/DRAFT/READY/FAILED), input/output JSON, model, error. Tracks AI run; commit turns DRAFT into DB regions/quests. |

### 4.3 Organiser and admin

| Model | Purpose |
|-------|--------|
| **Organiser** | email, name, passwordHash, role (ORGANISER/ADMIN/SUPER_ADMIN), isActive. |
| **OrganiserSession** | token, organiserId, expiresAt. |
| **RetentionCleanupLog** | eventId, runAt, counts of deleted sessions/votes/rooms/users/…, triggeredBy. |
| **AdminAuditLog** | organiserId, action, resourceType, resourceId, details, createdAt. |

### 4.4 Analytics

| Model | Purpose |
|-------|--------|
| **AnalyticsEvent** | eventId, userId?, eventType (e.g. ROOM_COMPLETED, ARTIFACT_VIEWED), metadata. |

Important relations: **User**, **Room**, **Vote**, **RoomMember**, **Artifact**, etc. are all tied to **Event** (directly or via Room/Quest/Region). Deleting an Event would cascade; in practice retention cleanup deletes participant data per event but keeps Event structure (and optionally archived artifacts).

---

## 5. Database hosting (Neon)

- **Provider:** Neon (PostgreSQL).
- **Tier:** Freemium (or current plan in use).
- **Connection:** `DATABASE_URL` in environment (Vercel + local `.env`).
- **Ownership:** Database and Neon project are under **Super Admin** credentials. Migrations and schema changes are applied via Prisma (`prisma migrate deploy` on deploy or manually). No other parties have direct DB access unless explicitly granted.

---

## 6. Deployment (Vercel)

- **Platform:** Vercel. Build: `prisma generate && next build`. Start: `next start`.
- **Ownership:** Vercel project and account are under **Super Admin** credentials. Production and preview deployments are tied to the GitHub repo (see §7). Environment variables (e.g. `DATABASE_URL`, `OPENAI_API_KEY`, `SESSION_SECRET`) are set in Vercel dashboard.

---

## 7. GitHub

- **Repository:** Hosted on GitHub. Used for source control and as the connected repo for Vercel.
- **Access:** **Super Admin** is the owner (or has full access). **Platform owner** is a **contributor**. No other roles are assumed in this document; add/change as needed.

---

## 8. Key environment variables

| Variable | Purpose |
|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string (Neon in production). |
| `SESSION_SECRET` | Used for signing/verifying session cookies (participant). |
| `OPENAI_API_KEY` | Required for AI quest generation (non-debug events). |
| `NEXT_PUBLIC_APP_NAME` | App name in UI. |
| `ADMIN_PASSWORD` | Legacy fallback (optional); prefer Organiser accounts with ADMIN/SUPER_ADMIN. |
| `ORGANISER_PASSWORD` | Legacy single shared password (optional); prefer Organiser records with hashed passwords. |

---

## 9. Important code locations (quick reference)

| Concern | Location |
|--------|----------|
| Participant auth | `lib/auth.ts`, `app/api/auth/start/route.ts`, `app/api/auth/me/route.ts` |
| Organiser/Admin auth | `lib/auth-organiser.ts`, role checks and event access in `lib/event-access.ts` |
| Quest generation (AI) | `lib/ai/generateEventRooms.ts`, `app/api/organiser/events/[id]/generate/route.ts`, `generate/commit/route.ts` |
| Badges | `lib/badges.ts`, `app/api/badges/route.ts`, `app/api/badges/progress/route.ts`, `components/BadgeDisplay.tsx` |
| XP / levels | `lib/xp.ts`, used in `/api/me` and `/api/auth/me` |
| Progress / World | `app/api/progress/route.ts`, `app/api/world/route.ts`, `app/world/page.tsx` |
| Room join / start | `app/api/room/join/route.ts`, `app/api/room/[id]/start/route.ts` |
| Vote / complete | `app/api/vote/route.ts`, `app/api/commit/route.ts`, `app/api/room/[id]/complete/route.ts` |
| Artifact | `lib/artifact.tsx`, `app/api/room/[id]/complete/route.ts` (generation trigger) |
| Data retention | `lib/data-retention.ts`, `app/api/admin/retention/eligibility/route.ts`, `run/route.ts`, `app/api/admin/events/[id]/retention/route.ts` |
| Room close | `app/api/admin/rooms/route.ts` (close_room), `app/api/admin/rooms/close-inactive/route.ts` |
| Insights | `app/api/organiser/insights/route.ts`, `app/organiser/insights/page.tsx` |

---

## 10. Document purpose and maintenance

This file is a **freeze/handover** snapshot so that anyone joining the project can understand:

- What the app does and for whom (participant, organiser, admin).
- How the main flows work and how data flows between them.
- Where the database is, who owns it, and what the main tables represent.
- Where the app is deployed and who owns deployment and repo.

Update this document when you add major features, change ownership, or move infrastructure (e.g. DB or deployment provider).
