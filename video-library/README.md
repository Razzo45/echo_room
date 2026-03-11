# Video library – Echo Room capabilities

This folder holds **recorded videos** from E2E tests. Each test demonstrates one or more app capabilities so you can review behaviour and build a library of “what the app can do”.

## First-time setup

From project root (`D:\echo-room-phase1-2`):

```bash
npm install
npx playwright install
```

**Important:** E2E tests use seeded credentials. Run the seed so login and data exist:

```bash
npm run prisma:seed
```

Then start the app and generate the videos below.

## How to generate the videos

1. **Start the app** (from project root `D:\echo-room-phase1-2`):
   ```bash
   npm run dev
   ```

2. **Run E2E tests with Playwright** (videos recorded for every test):
   ```bash
   npm run test:e2e
   ```

3. **Find the videos**  
   - In `video-library/test-results/` (each test has its own folder with `video.webm`).  
   - Or open `video-library/playwright-report/index.html` for the report and links to videos.

## Convert WebM to MP4

To convert all `.webm` recordings to `.mp4` (e.g. for editing or sharing):

1. Install **ffmpeg** and add it to your PATH ([download](https://ffmpeg.org/download.html); on Windows: `winget install ffmpeg` or [gyan.dev builds](https://www.gyan.dev/ffmpeg/builds/)).
2. From project root run:
   ```bash
   npm run video:webm-to-mp4
   ```
   Or: `node video-library/convert-webm-to-mp4.js`

   Script scans `video-library/` recursively and writes all MP4s into **`video-library/mp4/`** with step-based names (e.g. `01-landing-page-shows-echo-room-and-event-code-form.mp4`, `09-participant-can-open-room-play-page-voting-or-waiting-state.mp4`). Skips files that already exist in `mp4/`.

## Stitch all clips into one video

After converting to MP4, you can stitch every clip in order into a single walkthrough video:

```bash
npm run video:stitch
```

- **Input:** All `NN-*.mp4` files in `video-library/mp4/` (sorted by number 01, 02, … 38).
- **Output:** `video-library/echo-room-full-journey.mp4` (copy stream, no re-encode; fast).

Requires ffmpeg on PATH. Run `npm run video:webm-to-mp4` first so `mp4/` is populated.

## Index: what each test shows

Use this list to map “each small thing the app can do” to the test (and thus the video) that shows it.

### Participant (`e2e/participant.spec.ts`)

| # | Capability | Test name |
|---|------------|-----------|
| 1 | Landing: Echo Room title and event code form | landing page shows Echo Room and event code form |
| 2 | Enter event code (SMARTCITY26) and enable Continue | participant can enter event code and enable Continue |
| 3 | Submit event code → profile or world | participant submits event code and reaches profile or world |
| 4 | Profile page: create/edit form | profile page shows create or edit profile form |
| 5 | Fill and save profile → world | participant can fill and save profile then reach world |
| 6 | World map: regions and welcome | world map shows regions and welcome |
| 7 | District: quest list | district page shows quest list |
| 8 | Join quest → room lobby | participant can join a quest and see room lobby |
| 9 | Room play: voting or waiting state | participant can open room play page (voting or waiting state) |
| 10 | Room lobby: room code and team | room lobby shows room code and team section |
| 11 | Me page: rooms or empty state | participant me page shows rooms or empty state |
| 12 | People page | participant people page loads |
| 13 | Badges page | participant badges page loads |
| 14 | Organiser login page | organiser login page shows form |
| 15 | Back to participant link | back to participant link on organiser page |

### Organiser (`e2e/organiser.spec.ts`)

| # | Capability | Test name |
|---|------------|-----------|
| 16 | Organiser login (email + password) | organiser login page has email and password |
| 17 | Login and reach dashboard | organiser can log in and reach dashboard |
| 18 | Dashboard: Insights + Create event | dashboard shows insights and create event links |
| 19 | Create event form | create event page has form fields |
| 20 | Event detail (first event) | event detail page loads for first event |
| 21 | Insights: event picker and sections | insights page loads and shows event picker |
| 22 | Insights: scroll participants and rooms | insights scroll through participants and rooms sections |
| 23 | Insights: artifacts and filter tabs | insights artifacts section and filter tabs |
| 24 | View artifact from insights | organiser can view an artifact from insights |
| 25 | Quest edit: load and show content | quest edit page loads and shows quest content |
| 26 | Edit quest text (decision title) | organiser can edit quest text (decision title) |
| 27 | Archived artifact page | archived artifact page loads |

### Admin (`e2e/admin.spec.ts`)

| # | Capability | Test name |
|---|------------|-----------|
| 28 | Admin login page | admin login page shows password field |
| 29 | Admin login (email + password) | admin can log in with email and password |
| 30 | Dashboard: stats and section links | admin dashboard shows stats and section links |
| 31 | Config page | admin config page loads |
| 32 | Organisers page | admin organisers page loads |
| 33 | Events page | admin events page loads |
| 34 | Rooms page | admin rooms page loads |
| 35 | Participants page | admin participants page loads |
| 36 | Retention (data lifecycle) page | admin retention page loads |
| 37 | Audit log page | admin audit log page loads |
| 38 | Unauthenticated redirect to login | unauthenticated admin dashboard redirects to login |

## Test credentials (from seed)

- **Event code:** `SMARTCITY26`
- **Organiser:** `organiser@test.com` / `organiser2026`
- **Admin:** `admin@echo-room.local` / `admin123`

If you see login or “Invalid credentials” errors, run `npm run prisma:seed` and try again.

## Verify work with artifacts

After each run you get:

- **Videos** – one per test in `video-library/test-results/` (or via the HTML report).
- **Screenshots** – on failure (if configured).
- **Playwright report** – `video-library/playwright-report/index.html` (links to videos and traces).

Use these to quickly review changes and build your library of “each small thing the app can do”.
