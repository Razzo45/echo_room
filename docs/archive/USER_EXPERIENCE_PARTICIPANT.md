# Echo Room — Participant (User) Experience

This document describes the **end-to-end user experience** for participants in Echo Room: flows, screens, actions, and data that shape their journey. Use it as context for exploring **gamification** and engagement ideas (e.g. with ChatGPT).

---

## Product positioning

- **Tagline:** *"You don't leave with slides. You leave with a decision map."*
- **Positioning:** AI-Powered Decision Environment — event-based, team decision-making with a shared artifact (decision map) as the outcome.
- **Audience:** Event participants who receive an event code (or join link) from an organiser. They are not “gamers” by default; the experience is professional/collaborative with optional gamification (badges, progress).

---

## High-level user journey

1. **Landing** → Enter event code (or arrive via join link with code pre-filled).
2. **Profile** → One-time profile: name, organisation, role, country, one skill, one curiosity. Terms and data retention explained.
3. **World map** → See event “world”: list of active regions (e.g. City District), each with a count of quests. Navigate to a region.
4. **District** → List of available quests (currently DECISION_ROOM type). Each quest has name, description, duration, “Team quest” indicator. User clicks **Join Quest**.
5. **Room lobby** → Matched into a room (team). Room code shown; team members list; “Waiting for player…” slots until min players. **Async play** message: quest starts when enough have joined; everyone answers at their own pace; results when all have finished.
6. **Quest play** → For each of 3 decisions: read scenario, choose A/B/C, write short justification (max 160 chars), submit. Progress bar “Decision X of 3”. When user has done all 3: “You’re done” — wait for others. When everyone has voted: **Quest complete** screen with vote breakdown and link to **View decision map**.
7. **Decision map (artifact)** → HTML artifact: quest name, team members, each decision with chosen option, vote summary, tradeoffs/risks/outcomes, and justifications. View in-app; can print / Save as PDF.
8. **My Rooms & Artifacts** (/me) → Hub: list of rooms (Open, In Progress, Completed), links to **Continue Quest** or **View Decision Map**. **Your Badges** section. **Delete all my data** option.

---

## Screen-by-screen (participant-facing)

### 1. Landing (home)

- **URL:** `/`
- **Entry:** Direct visit or join link `/?code=XXXX`.
- **UI:** “Echo Room” title, “AI Powered Decision Environment”, tagline. Single input: **Enter Event Code** (placeholder e.g. SMARTCITY26), auto-uppercase. **Remember me (stay logged in for 30 days)**. **Continue**.
- **Behaviour:** Session check on load. If already logged in → redirect to `/profile` (if needs profile) or `/world`. Invalid code → error message. On success, code stored in localStorage for re-entry; redirect to profile or world.
- **Gamification note:** No points or badges here; first touch is utilitarian (code + optional remember me). Opportunity: subtle “event name” or “You’re in” confirmation, or “X participants already joined”.

---

### 2. Profile (one-time)

- **URL:** `/profile`
- **When:** After first successful code validation if profile not yet completed.
- **Fields (all required):** Name, Organisation, Role, Country, One Skill, One Curiosity (max 200 chars, placeholder references “smart cities or AI”). Submit: **Continue to World Map**.
- **Legal:** “By clicking Continue… you agree to our terms of use and data retention policy” (link opens modal with full text: data collected, how used, retention, delete option, GDPR, contact).
- **Gamification note:** Skill + curiosity are **personalisation/segment** inputs. Could drive: “matched with people who share your curiosity”, “skill-based badges”, or “curiosity of the day” later. No progress indicator yet.

---

### 3. World map

- **URL:** `/world`
- **UI:** “Welcome back, {name}”. “World Map” — “Select a region to begin your quest”. List of **active regions** (only those with `isActive` and at least one quest): card per region with display name, description, “X quests available”, “✓ ACTIVE”, “Enter” (navigates to district). Fallback: single City District image with overlay “Tap to Enter” if no dynamic regions. Bottom: **My Rooms & Artifacts** link.
- **Navigation:** Click region → `/district?regionId=…` (or legacy `regionName=city-district`).
- **Gamification note:** No completion %, no “regions unlocked”, no points. Opportunities: “You’ve completed 2/5 quests in this region”, region completion badges, or “First time here” vs “Returning”.

---

### 4. District (quest list)

- **URL:** `/district?regionId=…` or `?regionName=…`
- **UI:** “Back to World Map”. Region display name (e.g. City District). “Choose a quest to begin.” Cards per quest: **Quest name**, duration (e.g. “X min”), “Team quest”, description. **Join Quest** button.
- **Behaviour:** **Join Quest** → POST `/api/room/join` with `questId`. On success → redirect to `/room/{roomId}`. On failure → alert (e.g. “Failed to join quest”).
- **Gamification note:** No “completed” checkmarks, no “Recommended for you”. Opportunities: “You’ve already done this quest”, “New”, “Popular”, difficulty or time estimate, or “Complete 3 quests to unlock next region”.

---

### 5. Room lobby

- **URL:** `/room/[id]`
- **UI:** Quest name and description. **Room code** (large, monospace). **Team members:** list of joined members (name, role at organisation) with “Ready”; empty slots as “Waiting for player…” with pulse. Info: “The quest will start automatically when at least {minPlayersToStart} player(s) have joined. Once it starts, the room is locked and everyone can answer the three decisions at their own pace. Results and the decision map appear when everyone has finished.” **Leave Room** (back to world).
- **Behaviour:** Poll room every 3s. If status becomes IN_PROGRESS → redirect to `/room/[id]/play`. If COMPLETED and has artifact → redirect to artifact page.
- **Gamification note:** No “first to join” or “room full in 30s” callouts. Opportunities: “You’re player 2 of 3”, “Room will start when 1 more joins”, or light “Room formed” celebration.

---

### 6. Quest play (decision flow)

- **URL:** `/room/[id]/play`
- **States (conceptually):**
  - **Loading / error:** “Loading quest”, or “Disconnected from room” / “You are no longer a member…” with “Back to City District”.
  - **Completed (all voted):** “Quest complete” — short intro, then for each decision (1–3): “Decision N: {title}”, “Majority: Option X”, list of “Name: Option X — justification”. Then **View decision map** (link to `/artifact/{id}`). If artifact not ready yet: “Preparing your decision map…” spinner.
  - **User done, waiting for others:** “You’re done” — “You’ve answered all three decisions. Results and the decision map will appear once everyone in the room has finished.” “X of Y have completed all decisions”. “This page updates every few seconds.”
  - **Current decision (1, 2, or 3):** Progress bar “Your progress: Decision X of 3”, optional “Y of Z in room”. Card: decision **title** and **description**. Three options as big buttons (A, B, C) with **label** and **tradeoffs** text. On select: **Why did you choose this option?** textarea (max 160 chars, counter). **Submit vote**.
- **Behaviour:** Vote → POST `/api/vote` (roomId, decisionNumber, optionKey, justification). Room polled every 3s. Progress is per-user: “next decision I need to vote for” derived from existing votes.
- **Gamification note:** Progress bar is the only strong “progress” signal. No points per vote, no “streak”, no “your vote matched the majority”. Opportunities: “Decision 2 of 3” with a clearer “quest step” feel, “Your justification was the longest”, “Unanimous choice” callout, or XP per decision / completion.

---

### 7. Decision map (artifact)

- **URL:** `/artifact/[id]`
- **Access:** From quest-complete screen (“View decision map”), or from **My Rooms & Artifacts** (“View Decision Map” for completed rooms with artifact). Organisers can also open from Insights (different back link).
- **Content (HTML):** Quest name; optional thumbnail; “City Decision Map” style. **Team:** name, organisation, role per member. **Decisions:** for each of 3: title, chosen option (e.g. “Option B”), vote summary (e.g. “2 chose A, 1 chose B”), tradeoffs, risks, outcomes, and **justifications** (who chose what and why). Timestamp (completed at). Styled for readability and print (page-break rules).
- **UI in app:** “Back to My Rooms” (or “Back to Insights” if from organiser). Artifact HTML rendered in a container. No explicit “Print” in participant view in code referenced; organisers have PDF/print in Insights. Participants could use browser Print from this page.
- **Gamification note:** Artifact is the **tangible outcome** — “you leave with a decision map”. Opportunities: “Share your map” (link), “Download PDF”, “Compare with another room’s map”, or “Unlock Artifact Creator badge” (already awarded on completion).

---

### 8. My Rooms & Artifacts (/me)

- **URL:** `/me`
- **UI:** “Back to World Map”. “My Rooms & Artifacts” — “Your quest history and decision maps.” If no rooms: “You haven’t joined any quests yet” + **Explore World Map**. If rooms: card per room — quest name, room code, “X / Y in room”, status (Open, In Progress, Completed, Full). Actions: **View Decision Map** (if completed and has artifact), **Continue Quest** (if in progress), **View Room** (if open/full). Then **Your Badges** (BadgeDisplay). Then **Privacy** — “You can delete all your data…” and **Delete All My Data**.
- **BadgeDisplay:** Fetches `/api/badges`. Shows total badges, counts by rarity (common, rare, epic, legendary), grid of badges: icon, name, description, earned date. Rarity styling (e.g. common=gray, rare=blue, epic=purple, legendary=yellow). If none: “No badges earned yet — Complete quests to earn badges!”
- **Gamification note:** This is the main **gamification hub** today: rooms as “history” and badges as achievements. Delete data is prominent (trust/privacy).

---

## Badges (current gamification)

Badges are awarded automatically (e.g. on room completion and in background checks). No in-flow “You earned X” toast was found in the participant flow; they appear on `/me`.

### Badge definitions (name, description, icon, rarity)

| Type                 | Name              | Description                                      | Icon | Rarity   |
|----------------------|-------------------|--------------------------------------------------|------|----------|
| FIRST_QUEST_COMPLETE | First Steps       | Completed your first quest                       | 🎯   | common   |
| TEAM_PLAYER          | Team Player       | Completed a collaborative decision room          | 🤝   | common   |
| COLLABORATOR         | Collaborator      | Voted in all decisions of a room                 | 💬   | common   |
| STORYTELLER          | Storyteller       | Provided detailed justifications in 3+ decisions | 📖   | rare     |
| DECISION_MAKER       | Decision Maker    | Committed to the final decision in a room        | ⚡   | common   |
| ARTIFACT_CREATOR     | Artifact Creator  | Generated a decision map artifact                | 🗺️   | common   |
| QUEST_MASTER         | Quest Master      | Completed 5+ quests                             | 🏆   | epic     |
| SOCIAL_CONNECTOR    | Social Connector  | Teamed with 10+ different people                 | 🌐   | rare     |
| PERFECT_TEAM         | Perfect Team      | All team members voted and committed             | ✨   | rare     |
| EARLY_BIRD           | Early Bird        | Joined within first hour of event                | 🌅   | common   |
| NIGHT_OWL            | Night Owl         | Active during late hours                         | 🦉   | common   |
| CONSENSUS_BUILDER    | Consensus Builder | Team reached unanimous votes                     | 🎯   | rare     |
| DIVERSITY_CHAMPION   | Diversity Champion| Teamed with people from 3+ different countries  | 🌍   | epic     |

### When badges are awarded

- **On room completion** (e.g. after last vote triggers commit/artifact): first quest, team player, collaborator, storyteller (justification length), decision maker, artifact creator, perfect team, consensus builder, diversity champion.
- **Global checks** (e.g. when viewing badges or in background): Quest Master (5+ quests), Social Connector (10+ teammates), Early Bird, Night Owl.

---

## Data that exists about the user (for gamification ideas)

- **Profile:** name, organisation, role, country, skill, curiosity, createdAt.
- **Participation:** eventId; rooms joined (roomId, roomCode, questId, status, joinedAt, completedAt); membership in each room with other members (user ids, names, etc.).
- **Votes:** per room: decisionNumber, optionKey, justification, timestamp.
- **Commits:** per room: which option was “final” per decision (majority or similar).
- **Artifacts:** generated per room when completed; user can view and (via browser) print.
- **Badges:** which badges earned, per badge type and optionally roomId, earnedAt, metadata (e.g. unanimous decision number).
- **Timing:** join time (for Early Bird), session/activity time (for Night Owl), completion order (who finished first in room — if stored).

---

## Flows that are NOT (or barely) in the participant UI today

- **FORM / SURVEY quests:** Data model exists; only DECISION_ROOM quests are shown and playable. No form-filling flow for participants yet.
- **Notifications:** No in-app or email “Room is full, quest started” or “Your team has finished — view map”.
- **Badge notifications:** Badges are awarded but there’s no “You earned: Storyteller” popup or toast in the play flow.
- **Leaderboards / social:** No “top justifiers”, “most quests”, or “teammates you’ve had”.
- **Explicit “levels” or XP:** No level or experience points; only badges and completion state.
- **Event-level progress:** No “Event progress: 3/7 quests” or “Region completed”.
- **Sharing:** No share link for artifact or “Share your map” CTA in the participant journey (organisers have share/export in Insights).

---

## Summary for gamification exploration

- **Current:** Event code → profile → world → district → join quest → lobby → 3 decisions (with justification) → wait for all → view decision map. Central hub: **My Rooms & Artifacts** with **Your Badges**. Badges are the main gamification layer (common/rare/epic/legendary), awarded automatically on completion and via global rules.
- **Rich context for ideas:** Profile (skill, curiosity), team composition (org, role, country), vote and justification content, timing, artifact as “proof of work”, and full badge set. Use this doc plus the badge table and data list above to brainstorm: progress systems, social/competitive elements, personalisation, and narrative or “journey” framing (e.g. “Your decision map”, “Your team’s story”, “Complete all City District quests”).
