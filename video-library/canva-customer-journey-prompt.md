# Canva Video Prompt: Echo Room – Full Customer Journey

Use this prompt in Canva Video (or as a storyboard brief) to generate a customer journey video showcasing the Echo Room webapp. The content is based on the video library index and E2E test coverage from this project.

---

## Master prompt (paste into Canva)

**Create a 2–3 minute customer journey video for a web application called Echo Room, tagline: “AI Powered Decision Environment.”**

**Source footage:** Use the pre-recorded clips in the `video-library/mp4/` folder when building the walkthrough. Each clip is named by step (e.g. `01-landing-page-shows-echo-room-and-event-code-form.mp4` through `38-unauthenticated-admin-dashboard-redirects-to-login.mp4`). See the “Source clips” section below for the full list and what each clip shows. Assemble these in the order given for each act; add titles, transitions, and voiceover as needed.

The video should show three user types in order: **Organiser (event creator)** → **Participant (attendee)** → **Admin (platform operator)**. Style: modern, clean, product-demo. Tone: professional but approachable. Show a fictional event called “Smart City Hackathon” with event code SMARTCITY26.

---

### Act 1 – Organiser journey (event creator)  
*~45–60 seconds*

- **Opening:** Organiser lands on Echo Room and logs in (email/password). Dashboard appears with “Echo Room” and cards for Insights and Create event.
- **Create event:** Clicks “Create event,” fills event name (e.g. “Smart City Hackathon”), and saves. Event detail page loads with AI Room Generation: a text area for an “AI brief” (e.g. “smart city hackathon focused on urban sustainability, decisions about renewable energy, public transport, waste management”).
- **Generate rooms:** Clicks “Generate Rooms” or “Generate.” Success message: “Rooms generated! Participants can now join quests.” Event detail shows Quick Stats (Participants, Rooms, Quests, Event Codes), Event Details, and regions/districts with quests.
- **Event code:** Show the event code (e.g. SMARTCITY26) and copy/share moment. Mention “Share the event code with participants.”
- **Insights:** Navigate to Insights. Show event picker, then scroll through: Participants table (names, organisations, roles), Room compositions, Badge stats, and Artifacts section with filter tabs (All, Archived, Past generations). Optional: click “View” on an artifact to open a decision map/artifact view.
- **Edit quest:** From event detail, open a quest (e.g. “City District”). Quest edit page shows “Edit Quest Script,” Quest name, Quest description, Room size (min/max players), and decision/option content. Show “Save script” or “Revert to AI baseline.”
- **Archived artifact:** From Insights, open an “Archived” or “Past generation” artifact; show the archived artifact page with back to Insights.

---

### Act 2 – Participant journey (attendee)  
*~45–60 seconds*

- **Landing:** Participant sees Echo Room landing: “Echo Room – AI Powered Decision Environment,” event code input, and Continue button.
- **Event code:** Enter code SMARTCITY26 (or similar), click Continue. Either go to profile or straight to world.
- **Profile:** If profile is needed: form with full name, company, job title, location, key skill, “curious about” (e.g. smart cities). Save and continue.
- **World map:** World map with regions; show “City District” or similar. Click district.
- **District:** District page with quest list and “Join quest” button. Click Join quest.
- **Room:** After joining: room lobby with room code and team section, or (if room already started) play screen with “Decision 1 of 3,” “Choose one,” and options A/B/C. Show “Submit vote” and progress (e.g. “2/3 in room”).
- **Me / People / Badges:** Quick cuts: “My rooms” (Me), People list, Badges page. Convey: participants see their rooms, who’s in the event, and badges earned.

---

### Act 3 – Admin journey (platform operator)  
*~25–35 seconds*

- **Login:** Admin login page (email e.g. admin@echo-room.local, password). Click Log in.
- **Dashboard:** Admin dashboard with stats (events, organisers, rooms, participants) and cards: Config, Organisers, Events, Rooms, Participants, Data lifecycle (retention), Audit log, System Config.
- **Key pages (short cuts):** Config (system settings), Organisers list, Events (with retention/event codes), Rooms (active rooms by quest), Participants list, Data lifecycle & retention (cleanup, “Keep data longer,” cleanup audit log), Audit log (Admin and SuperAdmin action history for compliance).

---

### End frame

- Final screen: Echo Room logo and “AI Powered Decision Environment.”
- Optional subtitle: “From event creation to room play to platform governance – one platform.”

---

## Source clips: use the MP4 library

After running `npm run video:webm-to-mp4`, use the named clips in **`video-library/mp4/`**. Each file is one step; number prefix = order in the journey. Reference these when building the walkthrough:

### Participant (clips 01–15)

| Clip file | Step shown |
|-----------|------------|
| `01-landing-page-shows-echo-room-and-event-code-form.mp4` | Landing: Echo Room title and event code form |
| `02-participant-can-enter-event-code-and-enable-continue.mp4` | Enter event code and enable Continue |
| `03-participant-submits-event-code-and-reaches-profile-or-world.mp4` | Submit event code → profile or world |
| `04-profile-page-shows-create-or-edit-profile-form.mp4` | Profile: create/edit form |
| `05-participant-can-fill-and-save-profile-then-reach-world.mp4` | Fill and save profile → world |
| `06-world-map-shows-regions-and-welcome.mp4` | World map: regions and welcome |
| `07-district-page-shows-quest-list.mp4` | District: quest list |
| `08-participant-can-join-a-quest-and-see-room-lobby.mp4` | Join quest → room lobby |
| `09-participant-can-open-room-play-page-voting-or-waiting-state.mp4` | Room play: voting or waiting state |
| `10-room-lobby-shows-room-code-and-team-section.mp4` | Room lobby: room code and team |
| `11-participant-me-page-shows-rooms-or-empty-state.mp4` | Me page: rooms or empty state |
| `12-participant-people-page-loads.mp4` | People page |
| `13-participant-badges-page-loads.mp4` | Badges page |
| `14-organiser-login-page-shows-form.mp4` | Organiser login page (participant view) |
| `15-back-to-participant-link-on-organiser-page.mp4` | Back to participant link |

### Organiser (clips 16–27)

| Clip file | Step shown |
|-----------|------------|
| `16-organiser-login-page-has-email-and-password.mp4` | Organiser login (email + password) |
| `17-organiser-can-log-in-and-reach-dashboard.mp4` | Login and reach dashboard |
| `18-dashboard-shows-insights-and-create-event-links.mp4` | Dashboard: Insights + Create event |
| `19-create-event-page-has-form-fields.mp4` | Create event form |
| `20-event-detail-page-loads-for-first-event.mp4` | Event detail (first event) |
| `21-insights-page-loads-and-shows-event-picker.mp4` | Insights: event picker and sections |
| `22-insights-scroll-through-participants-and-rooms-sections.mp4` | Insights: scroll participants and rooms |
| `23-insights-artifacts-section-and-filter-tabs.mp4` | Insights: artifacts and filter tabs |
| `24-organiser-can-view-an-artifact-from-insights.mp4` | View artifact from insights |
| `25-quest-edit-page-loads-and-shows-quest-content.mp4` | Quest edit: load and show content |
| `26-organiser-can-edit-quest-text-decision-title.mp4` | Edit quest text (decision title) |
| `27-archived-artifact-page-loads.mp4` | Archived artifact page |

### Admin (clips 28–38)

| Clip file | Step shown |
|-----------|------------|
| `28-admin-login-page-shows-password-field.mp4` | Admin login page |
| `29-admin-can-log-in-with-email-and-password.mp4` | Admin login |
| `30-admin-dashboard-shows-stats-and-section-links.mp4` | Dashboard: stats and section links |
| `31-admin-config-page-loads.mp4` | Config page |
| `32-admin-organisers-page-loads.mp4` | Organisers page |
| `33-admin-events-page-loads.mp4` | Events page |
| `34-admin-rooms-page-loads.mp4` | Rooms page |
| `35-admin-participants-page-loads.mp4` | Participants page |
| `36-admin-retention-page-loads.mp4` | Retention (data lifecycle) page |
| `37-admin-audit-log-page-loads.mp4` | Audit log page |
| `38-unauthenticated-admin-dashboard-redirects-to-login.mp4` | Unauthenticated redirect to login |

---

## Scene checklist (for storyboard)

Use this to align the walkthrough with the clips above:

| Role       | Scenes to include (clip numbers) |
|-----------|-----------------------------------|
| Participant | 01–02 (landing, event code) → 03–05 (profile/world) → 06–07 (world, district) → 08–10 (join quest, room lobby/play) → 11–13 (Me, People, Badges) |
| Organiser   | 16–17 (login, dashboard) → 18–20 (create event, event detail) → 21–24 (Insights, view artifact) → 25–26 (quest edit) → 27 (archived artifact) |
| Admin       | 28–30 (login, dashboard) → 31–37 (Config, Organisers, Events, Rooms, Participants, Retention, Audit log) |

---

## Technical notes for production

- **Source clips:** Use the **named MP4s in `video-library/mp4/`**. Generate them with `npm run video:webm-to-mp4` from the latest E2E run. File names match the step (e.g. `09-...` = room play). See the tables above for clip → step mapping.
- **Credentials (for real recording):** Event code `SMARTCITY26`; Organiser `organiser@test.com` / `organiser2026`; Admin `admin@echo-room.local` / `admin123`. Seed DB with `npm run prisma:seed` before recording.
- **Narration:** Optional voiceover per act: “Organisers create events and generate AI-powered rooms…” / “Participants enter the event code, complete their profile, and join quests to make decisions together…” / “Admins manage the platform and compliance…”

---

## Short version (for Canva AI text-to-video)

**Echo Room – AI Powered Decision Environment. A 2-minute product demo: 1) Organiser creates a Smart City Hackathon event, writes an AI brief, generates rooms and quests, shares the event code, checks Insights and edits a quest. 2) Participant enters the event code, completes profile, explores the world map, joins a quest, sees the room lobby and voting screen (Decision 1 of 3, Choose one, Submit vote), and visits Me, People, and Badges. 3) Admin logs in, sees the dashboard with stats, and opens Config, Organisers, Events, Rooms, Participants, Data lifecycle, and Audit log. End on Echo Room logo and tagline. Modern, clean, professional.**

**When editing with real footage:** Use the 38 named MP4 clips in `video-library/mp4/` (files `01-...mp4` to `38-...mp4`); each filename describes the step (e.g. `09-participant-can-open-room-play-page-voting-or-waiting-state.mp4`). Assemble in number order for each act (Participant 01–15, Organiser 16–27, Admin 28–38).
