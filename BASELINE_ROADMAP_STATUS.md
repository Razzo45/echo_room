# Echo Room – Baseline roadmap status (source of truth)

**Generated:** 2026-02-04  
**Purpose:** Purity test vs suggested execution order. All entries are verified against the current codebase under `d:\echo-room-phase1-2`.

---

## 1) Organiser panel

| Roadmap item | Status | Evidence in codebase |
|--------------|--------|----------------------|
| **Event code management overhaul** | ✅ **DONE** | |
| → Custom codes (organiser-supplied, validation + uniqueness) | ✅ | `app/api/organiser/events/[id]/codes/route.ts`: POST accepts `customCodes` array; 4–20 chars, A–Z/0-9/_-; unique in request and in DB. |
| → Code deletion / deactivate | ✅ | Same file: PATCH with `codeId` + `active`; event ownership checked. `app/organiser/events/[id]/page.tsx`: "Add Custom" input + "Deactivate" / "Activate" per code, Copy Code, Copy Join Link. |
| **Room / generation status clarity + UX tune-up** | ❌ Not done | |
| → Finer-grained generation status (IDLE/QUEUED/GENERATING/READY/FAILED) + polling | ❌ | Only `Event.aiGenerationStatus` exists; no per-room status; no dedicated polling UX for “in progress”. |
| → Room text reduction (lobby + play ~70%) | ❌ | Not audited/trimmed. |
| → Minimum quest per room before artifact (e.g. 2–3 decisions) | ❌ | `app/api/commit/route.ts`: completion is hardcoded to “decision 3”; no validation of min decisions/quests. |
| **Manual room / artifact editing (post-submission)** | ❌ Not done | No “Edit room scripts” or override decisions/justifications; no separate manual vs AI version store. |
| **Organiser accounts + permissions** | ✅ **DONE** | |
| → Organiser model (email, name, passwordHash, role, flags) | ✅ | `prisma/schema.prisma`: Organiser, OrganiserSession; roles ORGANISER | ADMIN | SUPER_ADMIN; isActive. |
| → Admin management UI (create/update/delete, reset password) | ✅ | `app/api/admin/organisers/route.ts`: GET list, POST create (SuperAdmin), PATCH (name, password, role, isActive). `app/admin/organisers/page.tsx`: list, Create Organiser, toggle active. No DELETE organiser; deactivate via isActive. |
| → Per-organiser scoping (events by organiserId, SUPER_ADMIN global) | ✅ | `app/api/organiser/events/route.ts`: `organiserId` filter unless SUPER_ADMIN. Same pattern in events/[id], insights, etc. |
| **Data exploration (Insights)** | ✅ **DONE** | |
| → Participants per event, room compositions, badge stats, artifacts + links | ✅ | `app/api/organiser/insights/route.ts` + `app/organiser/insights/page.tsx`: event selector; participants table; room compositions (who joined who); badge stats; artifacts table. |
| → Artifact download (HTML + PDF) | ✅ | Export: `app/api/artifact/[id]/export/route.ts` (inlined images). Insights: View (→ artifact page), PDF (opens print dialog → Save as PDF). Back from artifact view: `?from=insights` → “Back to Insights”. |

---

## 2) Admin panel

| Roadmap item | Status | Evidence in codebase |
|--------------|--------|----------------------|
| **Harden and extend admin panel** | ✅ **DONE** | |
| → Full dashboard: Events, Organisers, Participants, Rooms, System config | ✅ | `app/admin/page.tsx`: sections Events, Organisers, Participants, Rooms, System Config with counts. |
| → RBAC (ADMIN, SUPER_ADMIN, ORGANISER) | ✅ | Organiser model + auth-organiser; admin routes use requireAdminAuth / requireSuperAdminAuth. |
| **Admin visibility: organisers + events, participants, controls** | ⚠️ **Partial** | |
| → List organisers + their events | ⚠️ | Organisers list exists; admin events API does **not** include `organiser`/owner. So “their events” not shown on organiser rows. |
| → List participants per event, rooms, artifacts | ✅ | `app/api/admin/participants/route.ts`: GET with `eventId` filter, pagination; includes event, _count (roomMembers, votes, badges). UI: table with event name. |
| → Deactivate organisers / reset password | ✅ | PATCH organisers: isActive, password (hashed). UI: toggle active. |
| → Remove participants (like organisers) | ❌ | No DELETE or “remove” in `app/api/admin/participants/route.ts`; no remove button on admin participants page. |
| **Data lifecycle & deprecation rules** | ❌ Not done | No endDate-driven cleanup; no 2-week post-event delete/soft-delete; no admin retention override or audit. |
| **Per-event data segmentation validation** | ⚠️ **Partial** | Organiser APIs consistently use eventId + organiserId. Admin reads are global (events, participants with optional eventId filter). No formal “defensive checks” doc or central enforcement. |
| **Debug / test mode** | ❌ Not done | No DEBUG flag per event; no shorter timers, test badges, or rate-limit bypass. |

---

## 3) Client (participant) panel

| Roadmap item | Status | Evidence |
|--------------|--------|----------|
| Flexible team size (2–5), minTeamSize, GDPR popup, matchmaking/completion rules | ❌ | Quest.teamSize exists but room logic assumes 3; no minTeamSize; no terms/GDPR popup on profile. |
| Async play flow (per-user progression, reveal rules) | ❌ | Not implemented. |
| Majority display per question | ❌ | Vote counts not shown as distribution in play UI/artifact. |
| Refine LLM output & artifact quality / prompt versioning | ❌ | Not done. |
| Badges refinement (thresholds, BadgeDisplay, progress hints) | ❌ | Not done. |
| Participant directory & networking search (/people, isDiscoverable) | ❌ | Not done. |
| Profile change UX (public vs private, confirmation) | ❌ | Not done. |

---

## 4) Suggested execution order – current truth

| # | Item | Phase | Status |
|---|------|--------|--------|
| 1 | Organiser: custom codes + deletion | 1 | ✅ **DONE** (custom codes + PATCH active; UI: Add Custom, Deactivate/Activate) |
| 2 | Organiser: room status/generation UX + minimum quests per room | 1 | ❌ Not done |
| 3 | Admin: harden admin panel + per-event segmentation checks | 1 | ✅ Dashboard + RBAC done; segmentation not fully formalised |
| 4 | Admin: data deprecation rules (2-week cleanup) | 1 | ❌ Not done |
| 5 | Organiser accounts + per-event scoping | 2 | ✅ **DONE** |
| 6 | Admin: organiser/user visibility & controls | 2 | ⚠️ Partial: list organisers + participants (with eventId); reset password + deactivate. Missing: “organiser’s events” on organisers list, **remove participant** |
| 7 | Organiser: data/insights menu + artifact HTML/PDF | 2 | ✅ **DONE** |

---

## 5) Gaps to close (priority order)

1. **Phase 1 #2** – Room/generation status UX + minimum quests per room (validation before COMPLETED/artifact).
2. **Phase 1 #4** – Data deprecation: endDate-based cleanup (e.g. 2 weeks after event end) + admin retention override.
3. **Phase 2 #6** – Admin: add “remove participant” (DELETE or soft-delete); optionally include event owner (organiser) in admin events so “list organisers + their events” is visible.
4. **Phase 1** – Per-event segmentation: document and add defensive eventId/organiserId checks where needed.
5. **Debug/test mode** – Optional; lower priority.

---

## 6) File reference (key implementations)

- **Custom codes + deactivate:** `app/api/organiser/events/[id]/codes/route.ts` (POST/GET/PATCH), `app/organiser/events/[id]/page.tsx` (custom input, toggle active).
- **Organiser scoping:** `lib/auth-organiser.ts`, `app/api/organiser/events/route.ts`, `app/api/organiser/insights/route.ts`, `app/api/organiser/events/[id]/route.ts`.
- **Admin dashboard:** `app/admin/page.tsx`, `app/api/admin/dashboard/route.ts`.
- **Admin organisers:** `app/api/admin/organisers/route.ts`, `app/admin/organisers/page.tsx`.
- **Admin participants:** `app/api/admin/participants/route.ts`, `app/admin/participants/page.tsx` (no delete).
- **Insights + artifact export:** `app/api/organiser/insights/route.ts`, `app/organiser/insights/page.tsx`, `app/api/artifact/[id]/export/route.ts`, `app/artifact/[id]/page.tsx` (from=insights back link).
- **Room completion (no min-quest check):** `app/api/commit/route.ts`.

This file is the **baseline of truth** for what is done vs the suggested execution order. Update it when implementing or changing roadmap items.
