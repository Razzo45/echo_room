# Echo Room - Application Architecture & Current State Documentation

**Version:** 1.0  
**Last Updated:** January 2025  
**Purpose:** Comprehensive technical documentation for understanding current implementation and planning future modifications

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Data Model & Database Schema](#data-model--database-schema)
5. [Core Modules & Features](#core-modules--features)
6. [User Flows & Authentication](#user-flows--authentication)
7. [API Endpoints](#api-endpoints)
8. [Frontend Structure](#frontend-structure)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Current Limitations & Known Issues](#current-limitations--known-issues)
11. [Gamification System (Badges)](#gamification-system-badges)

---

## Executive Summary

**Echo Room** is a collaborative decision-making platform designed for team-based problem-solving sessions, particularly for hackathons and workshops. Teams of 3 participants work through structured decision points, vote on options with justifications, and generate HTML decision maps documenting their choices.

### Key Characteristics:
- **Mobile-first Progressive Web App (PWA)**
- **Team-based collaboration** (exactly 3 members per room)
- **Structured decision flow** (typically 3 sequential decisions per quest)
- **HTML artifact generation** (decision maps with team choices, tradeoffs, and outcomes)
- **Event-based access control** (event codes for participation)
- **Gamification** (badge system for engagement)
- **Multi-role system** (Participants, Organisers, Admins)

### Current Deployment:
- **Production:** Vercel (Next.js serverless functions)
- **Database:** Neon PostgreSQL (serverless Postgres)
- **Status:** Fully functional, HTML artifacts only (PDF generation removed)

---

## Technology Stack

### Core Framework
- **Next.js 14** with App Router (React Server Components, API Routes)
- **TypeScript** for type safety
- **React 18.3** for UI components

### Database & ORM
- **Prisma ORM** (v5.22.0) for database access
- **PostgreSQL** (Neon) for production
- **SQLite** supported for local development (currently using PostgreSQL)

### Styling & UI
- **Tailwind CSS** for utility-first styling
- **Mobile-first responsive design**
- **Custom component library** (buttons, cards, forms)

### Authentication & Security
- **httpOnly cookies** for session management
- **Zod** for input validation
- **In-memory rate limiting** (local dev)
- **Redis-based rate limiting** (production-ready, via `ioredis`)

### PWA & Offline Support
- **next-pwa** for Progressive Web App features
- **Service worker** for offline static asset caching
- **Web manifest** for installability

### Additional Libraries
- **ioredis** (v5.9.2) - Redis client for production rate limiting
- **zod** (v3.23.0) - Schema validation

### Removed Dependencies
- ~~`@react-pdf/renderer`~~ - PDF generation removed, HTML artifacts only

---

## Application Architecture

### Modular Monolith Design

The application follows a **modular monolith** pattern, organized by functional domains:

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │   Auth   │  │  World   │  │   Room   │  │  Quest   │ │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Artifact │  │  Admin   │  │Organiser │  │  Badges  │ │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  Prisma ORM      │
              └─────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  PostgreSQL      │
              │  (Neon)          │
              └─────────────────┘
```

### Key Modules

1. **Auth Module** (`lib/auth.ts`, `lib/auth-organiser.ts`)
   - Event code validation
   - Session management (httpOnly cookies)
   - Remember me functionality (30-day sessions)
   - Rate limiting

2. **World Module** (`app/world/`, `app/api/world/`)
   - Region/Map display
   - Quest catalog
   - District navigation

3. **Room Module** (`app/room/`, `app/api/room/`)
   - Auto-matchmaking (join existing or create new)
   - Team formation (exactly 3 members)
   - Room status management (OPEN → FULL → IN_PROGRESS → COMPLETED)
   - Real-time room state

4. **Quest Module** (`app/district/`, `app/api/quests/`)
   - Quest listing and filtering
   - Decision flow management
   - Voting and commitment logic

5. **Artifact Module** (`lib/artifact.tsx`, `app/artifact/`)
   - HTML decision map generation
   - Artifact storage and retrieval
   - Public sharing (via shareToken)

6. **Admin Module** (`app/admin/`, `app/api/admin/`)
   - Room management
   - Force start capabilities
   - Override controls

7. **Organiser Module** (`app/organiser/`, `app/api/organiser/`)
   - Event creation and management
   - Event code generation
   - District/Region management
   - Quest creation and editing

8. **Badges Module** (`lib/badges.ts`, `app/api/badges/`)
   - Badge definitions and awarding logic
   - User badge tracking
   - Gamification incentives

---

## Data Model & Database Schema

### Core Entities

#### Event & Access Control
- **Event**: Container for hackathons/workshops
  - Fields: `name`, `description`, `startDate`, `endDate`, `timezone`, `brandColor`, `logoUrl`, `sponsorLogos`
  - Relations: `eventCodes[]`, `users[]`, `rooms[]`, `regions[]`

- **EventCode**: Access codes for events
  - Fields: `code` (unique), `active`, `maxUses`, `usedCount`
  - Relations: `event`, `sessions[]`

#### User & Session Management
- **User**: Participant profiles
  - Fields: `name`, `organisation`, `role`, `country`, `skill`, `curiosity`
  - Relations: `event`, `sessions[]`, `roomMembers[]`, `votes[]`, `badges[]`

- **Session**: Authentication tokens
  - Fields: `token` (unique), `expiresAt`
  - Relations: `user`, `eventCode`
  - **Security**: httpOnly cookies, 7-day default expiry (30 days with "remember me")

#### World & Quest Structure
- **Region**: Map regions/districts
  - Fields: `name`, `displayName`, `description`, `isActive`, `sortOrder`
  - Relations: `event`, `quests[]`

- **Quest**: Challenges within regions
  - Fields: `name`, `description`, `questType` (DECISION_ROOM, FORM, SURVEY), `durationMinutes`, `teamSize` (default: 3), `isActive`, `decisionsData` (DEPRECATED)
  - Relations: `region`, `rooms[]`, `decisions[]`, `fields[]`
  - **Note**: `decisionsData` is deprecated; use `QuestDecision` and `QuestOption` tables instead

- **QuestDecision**: Decisions within a quest
  - Fields: `decisionNumber` (1, 2, 3...), `title`, `context`
  - Relations: `quest`, `options[]`

- **QuestOption**: Options for each decision
  - Fields: `optionKey` (A, B, C), `title`, `description`, `impact`, `tradeoff`
  - Relations: `decision`

- **QuestField**: Form fields for FORM-type quests
  - Fields: `fieldKey`, `label`, `fieldType` (TEXT, TEXTAREA, SELECT, etc.), `required`, `options` (JSON)
  - Relations: `quest`

- **QuestResponse**: User form submissions
  - Fields: `responses` (JSON), `completedAt`
  - Relations: `questId`, `userId` (unique constraint)

#### Room & Collaboration
- **Room**: Team instances (exactly 3 members)
  - Fields: `roomCode` (unique), `status` (OPEN, FULL, IN_PROGRESS, COMPLETED), `currentDecision` (1-3), `startedAt`, `completedAt`
  - Relations: `event`, `quest`, `members[]`, `votes[]`, `commits[]`, `artifact`, `badges[]`
  - **Indexes**: `[status, questId]`, `[eventId, status]`, `[completedAt]`

- **RoomMember**: Room membership (enforces max 3)
  - Fields: `joinedAt`
  - Relations: `room`, `user`
  - **Constraint**: `@@unique([roomId, userId])`

- **Vote**: Individual votes on decisions
  - Fields: `decisionNumber`, `optionKey` (A/B/C), `justification`
  - Relations: `room`, `user`
  - **Constraint**: `@@unique([roomId, userId, decisionNumber])` (one vote per decision per user)

- **DecisionCommit**: Final team choices
  - Fields: `decisionNumber`, `committedOption` (A/B/C)
  - Relations: `room`
  - **Constraint**: `@@unique([roomId, decisionNumber])` (one commit per decision)

#### Artifacts
- **Artifact**: Generated decision maps
  - Fields: `htmlContent` (full HTML), `pdfPath` (legacy, optional), `pdfContent` (legacy, optional), `shareToken` (unique, for public sharing)
  - Relations: `room` (one-to-one)
  - **Current State**: Only HTML artifacts are generated; PDF fields are legacy and unused

#### Gamification
- **Badge**: Badge definitions
  - Fields: `badgeType` (enum), `name`, `description`, `icon` (emoji), `rarity` (common, rare, epic, legendary)
  - Relations: `userBadges[]`

- **UserBadge**: User badge awards
  - Fields: `roomId` (optional, badge earned in specific room), `metadata` (JSON, additional context), `earnedAt`
  - Relations: `user`, `badge`, `room?`
  - **Constraint**: `@@unique([userId, badgeId, roomId])`

#### Analytics
- **AnalyticsEvent**: Event tracking
  - Fields: `eventType` (enum), `metadata` (JSON)
  - Relations: `eventId`, `userId?`
  - **Indexes**: `[eventId, eventType]`, `[createdAt]`, `[userId]`

### Key Relationships Summary

```
Event
├── EventCode[] (1:N)
├── User[] (1:N)
├── Room[] (1:N)
└── Region[] (1:N)

Region
└── Quest[] (1:N)

Quest
├── QuestDecision[] (1:N)
├── QuestOption[] (via QuestDecision, 1:N)
├── QuestField[] (1:N, for FORM quests)
└── Room[] (1:N)

Room
├── RoomMember[] (1:N, max 3)
├── Vote[] (1:N)
├── DecisionCommit[] (1:N)
├── Artifact (1:1)
└── UserBadge[] (1:N, badges earned in this room)

User
├── Session[] (1:N)
├── RoomMember[] (1:N)
├── Vote[] (1:N)
└── UserBadge[] (1:N)
```

---

## Core Modules & Features

### 1. Authentication Module

**Files:** `lib/auth.ts`, `lib/auth-organiser.ts`, `app/api/auth/`

#### Participant Authentication
- **Entry Point**: `/api/auth/start` (POST)
- **Flow**:
  1. User enters event code (rate limited: 5 attempts per 15 minutes per IP)
  2. System validates event code (checks `active`, `maxUses`)
  3. Creates temporary user with default values
  4. Creates session with httpOnly cookie
  5. Returns user data and profile status
- **Session Management**:
  - Default: 7 days
  - "Remember me": 30 days
  - Token stored in `Session` table
  - Cookie: `echo-room-session` (httpOnly, secure in production)

#### Auto-Login
- **File**: `app/page.tsx`
- **Behavior**: On landing page load, checks `/api/auth/me` for existing session
- **Redirects**: 
  - If authenticated and profile complete → `/world`
  - If authenticated but profile incomplete → `/profile`
- **Remember Me**: Stores event code in `localStorage` for convenience

#### Organiser Authentication
- **Entry Point**: `/api/organiser/login` (POST)
- **Flow**: Password-based (from `ORGANISER_PASSWORD` env var)
- **Session**: Separate from participant sessions

#### Admin Authentication
- **Entry Point**: `/api/admin/login` (POST)
- **Flow**: Password-based (from `ADMIN_PASSWORD` env var)

### 2. Profile Management

**Files:** `app/profile/page.tsx`, `app/api/profile/route.ts`

- **Fields**: `name`, `organisation`, `role`, `country`, `skill`, `curiosity`
- **Validation**: Zod schemas
- **Update**: PATCH endpoint for profile updates

### 3. World & Quest Navigation

**Files:** `app/world/page.tsx`, `app/district/page.tsx`, `app/api/world/route.ts`, `app/api/quests/route.ts`

#### World Map
- Displays all regions for the current event
- Shows active/inactive status
- Links to district/quest lists

#### Quest Listing
- **Endpoint**: `/api/quests?regionName=city-district` or `?regionId=...`
- **Filtering**: Only shows `questType === 'DECISION_ROOM'` quests
- **Display**: Quest name, description, team size, duration

### 4. Room System

**Files:** `app/room/[id]/page.tsx`, `app/api/room/join/route.ts`, `app/api/room/[id]/route.ts`

#### Room Matching
- **Auto-Matchmaking**: 
  - User clicks "Join Quest"
  - System finds OPEN room for that quest with < 3 members
  - If none exists, creates new room
  - Adds user as `RoomMember`

#### Room States
1. **OPEN**: 1-2 members, waiting for more
2. **FULL**: 3 members, ready to start
3. **IN_PROGRESS**: Quest started, decisions in progress
4. **COMPLETED**: All decisions committed, artifact generated

#### Room Lobby
- Shows current members (name, organisation, role)
- Shows room status
- "Start Quest" button (only when FULL, or admin override)

### 5. Quest Play Flow

**Files:** `app/room/[id]/play/page.tsx`, `app/api/vote/route.ts`, `app/api/commit/route.ts`

#### Decision Flow
1. **Room Start**: 
   - Sets `status = 'IN_PROGRESS'`
   - Sets `currentDecision = 1`
   - Sets `startedAt = now()`

2. **Voting Phase** (per decision):
   - Each member votes (A, B, or C) with justification
   - **Endpoint**: `/api/vote` (POST)
   - **Validation**: One vote per decision per user
   - **UI**: Shows all votes once submitted (real-time via polling)

3. **Commit Phase**:
   - Once all 3 members have voted, team commits to final choice
   - **Endpoint**: `/api/commit` (POST)
   - **Validation**: All members must have voted
   - **Action**: 
     - Creates `DecisionCommit` record
     - If `currentDecision < 3`, increments `currentDecision`
     - If `currentDecision === 3`, sets `status = 'COMPLETED'`, triggers artifact generation

4. **Completion**:
   - Room status → `COMPLETED`
   - `completedAt` timestamp set
   - Artifact generation triggered
   - Redirect to artifact page

#### Decision Data Source
- **Primary**: `QuestDecision` and `QuestOption` tables (recommended)
- **Fallback**: `Quest.decisionsData` JSON field (deprecated, but still supported)
- **API Logic**: `app/api/room/[id]/route.ts` builds `decisionsData` from tables if JSON is missing

### 6. Artifact Generation

**Files:** `lib/artifact.tsx`, `app/api/artifact/generate/route.ts`, `app/artifact/[id]/page.tsx`

#### HTML Artifact Generation
- **Trigger**: Automatically when room status → `COMPLETED`
- **Content**:
  - Quest name and completion timestamp
  - Team members (name, organisation, role)
  - All 3 decisions:
    - Decision title
    - Selected option (A/B/C) and label
    - Tradeoffs accepted
    - Key risks (list)
    - Predicted outcomes (list)
    - Team perspectives (all votes with justifications)
- **Storage**: `Artifact.htmlContent` (full HTML string)
- **Display**: Rendered via `dangerouslySetInnerHTML` in artifact page

#### Artifact Sharing
- **Public Sharing**: `shareToken` field (unique, optional)
- **Access Control**: Only room members can view artifacts (checked in API)

#### PDF Generation (REMOVED)
- **Status**: Completely removed from codebase
- **Reason**: Vercel serverless limitations with file streams
- **Legacy Fields**: `pdfPath` and `pdfContent` still in schema but unused

### 7. Badges System

**Files:** `lib/badges.ts`, `app/api/badges/route.ts`, `app/api/badges/[userId]/route.ts`, `components/BadgeDisplay.tsx`

#### Badge Types
- **FIRST_QUEST_COMPLETE**: Completed first quest/room
- **TEAM_PLAYER**: Completed a team decision room
- **COLLABORATOR**: Voted in all decisions of a room
- **STORYTELLER**: Provided detailed justifications (3+ decisions)
- **DECISION_MAKER**: Committed to final decision in a room
- **ARTIFACT_CREATOR**: Generated an artifact
- **QUEST_MASTER**: Completed 5+ quests
- **SOCIAL_CONNECTOR**: Teamed with 10+ different people
- **PERFECT_TEAM**: All 3 members voted and committed
- **CONSENSUS_BUILDER**: Team reached unanimous votes on all decisions
- **DIVERSITY_CHAMPION**: Teamed with people from 3+ different countries

#### Badge Awarding
- **Trigger**: `checkRoomCompletionBadges()` called in `/api/commit` when room completes
- **Logic**: Checks various criteria (vote counts, team composition, etc.)
- **Storage**: Creates `UserBadge` records with optional `roomId` and `metadata`

#### Badge Display
- **Component**: `BadgeDisplay.tsx`
- **Location**: `/me` page (user's personal page)
- **Features**: Shows earned badges with icons, names, descriptions, rarity colors

### 8. Admin Module

**Files:** `app/admin/`, `app/api/admin/`

#### Capabilities
- **Room Management**: View all rooms, filter by status
- **Force Start**: Start rooms with < 3 members (bypass requirement)
- **Mark Completed**: Manually mark rooms as completed
- **Move User**: Remove user from room (not fully implemented)

### 9. Organiser Module

**Files:** `app/organiser/`, `app/api/organiser/`

#### Event Management
- **Create Events**: Name, description, dates, timezone, branding
- **Edit Events**: Update all fields
- **Delete Events**: Cascade deletes all related data

#### Event Code Generation
- **Bulk Generation**: Generate 1-100 codes per event
- **Code Prefix**: Configurable prefix (e.g., "SMART")
- **Max Uses**: Optional limit per code
- **Usage Stats**: View `usedCount` per code

#### District/Region Management
- **CRUD Operations**: Create, read, update, delete regions
- **Activation**: Toggle `isActive` status
- **Sort Order**: Control display order

#### Quest Management
- **CRUD Operations**: Create, read, update, delete quests
- **Quest Types**: DECISION_ROOM, FORM, SURVEY
- **Decision Management**: Add/edit decisions and options
- **Form Fields**: Configure fields for FORM-type quests

---

## User Flows & Authentication

### Participant Flow

```
1. Landing Page (/)
   ├─ Enter event code
   ├─ Rate limiting check (5 attempts / 15 min)
   ├─ Create temporary user
   └─ Create session (httpOnly cookie)

2. Profile Creation (/profile)
   ├─ Fill: name, organisation, role, country, skill, curiosity
   └─ Update user record

3. World Map (/world)
   ├─ View regions for event
   └─ Navigate to district

4. Quest List (/district?regionName=city-district)
   ├─ See available DECISION_ROOM quests
   └─ Click "Join Quest"

5. Room Matching (API: /api/room/join)
   ├─ Find OPEN room with < 3 members
   ├─ Or create new room
   └─ Add user as RoomMember

6. Room Lobby (/room/[id])
   ├─ See current members (1-3)
   ├─ Wait for 3 members (or admin force start)
   └─ Click "Start Quest"

7. Quest Play (/room/[id]/play)
   ├─ Decision 1:
   │  ├─ Vote (A/B/C) with justification
   │  ├─ See all team votes
   │  └─ Commit final choice
   ├─ Decision 2: (same flow)
   ├─ Decision 3: (same flow)
   └─ On completion:
      ├─ Status → COMPLETED
      ├─ Generate artifact
      └─ Redirect to /artifact/[id]

8. Artifact View (/artifact/[id])
   ├─ View HTML decision map
   └─ Navigate back to /me

9. My Rooms (/me)
   ├─ List all rooms user joined
   ├─ View artifacts
   └─ See earned badges
```

### Organiser Flow

```
1. Organiser Login (/organiser)
   ├─ Enter password (ORGANISER_PASSWORD)
   └─ Create organiser session

2. Dashboard (/organiser/dashboard)
   ├─ View all events
   ├─ See stats (participants, rooms, codes)
   └─ Create new event

3. Event Management (/organiser/events/[id])
   ├─ Edit event details
   ├─ Generate event codes
   ├─ Manage districts/regions
   └─ Manage quests
```

### Admin Flow

```
1. Admin Login (/admin/login)
   ├─ Enter password (ADMIN_PASSWORD)
   └─ Create admin session

2. Room Management (/admin/rooms)
   ├─ View all rooms
   ├─ Filter by status
   ├─ Force start rooms
   └─ Mark rooms as completed
```

---

## API Endpoints

### Authentication
- `POST /api/auth/start` - Validate event code, create session
- `GET /api/auth/me` - Get current user and profile status
- `POST /api/auth/logout` - Clear session

### Profile
- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update user profile

### World & Quests
- `GET /api/world` - Get regions for current event
- `GET /api/quests?regionName=...` - Get quests for region

### Rooms
- `POST /api/room/join` - Join or create room for quest
- `GET /api/room/[id]` - Get room details with decisions data
- `POST /api/room/[id]/start` - Start quest (requires 3 members or admin)

### Voting & Decisions
- `POST /api/vote` - Submit vote for decision
- `POST /api/commit` - Commit team choice for decision

### Artifacts
- `POST /api/artifact/generate` - Generate artifact for room
- `GET /api/artifact/[id]` - Get artifact details

### Badges
- `GET /api/badges` - Get all badge definitions
- `GET /api/badges/[userId]` - Get badges earned by user

### Admin
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/rooms` - List all rooms
- `POST /api/admin/rooms` - Force start room, mark completed, etc.

### Organiser
- `POST /api/organiser/login` - Organiser authentication
- `GET /api/organiser/events` - List events
- `POST /api/organiser/events` - Create event
- `GET /api/organiser/events/[id]` - Get event
- `PATCH /api/organiser/events/[id]` - Update event
- `DELETE /api/organiser/events/[id]` - Delete event
- `POST /api/organiser/events/[id]/codes` - Generate event codes
- `GET /api/organiser/districts` - List regions
- `POST /api/organiser/districts` - Create region
- `GET /api/organiser/quests` - List quests
- `POST /api/organiser/quests` - Create quest
- `GET /api/organiser/quests/[id]` - Get quest
- `PATCH /api/organiser/quests/[id]` - Update quest
- `DELETE /api/organiser/quests/[id]` - Delete quest

### Data Management
- `POST /api/data/delete` - Delete all user data (GDPR compliance)

---

## Frontend Structure

### Page Routes (App Router)

```
app/
├── page.tsx                    # Landing page (event code entry)
├── profile/page.tsx            # Profile creation/editing
├── world/page.tsx              # World map view
├── district/page.tsx           # Quest list for region
├── room/
│   ├── [id]/page.tsx           # Room lobby
│   └── [id]/play/page.tsx      # Quest play (voting/committing)
├── artifact/[id]/page.tsx      # Artifact viewer
├── me/page.tsx                 # User's rooms and badges
├── badges/page.tsx             # Badge showcase
├── admin/
│   ├── login/page.tsx          # Admin login
│   └── rooms/page.tsx          # Room management
└── organiser/
    ├── page.tsx                # Organiser login
    ├── dashboard/page.tsx      # Event dashboard
    └── events/
        ├── new/page.tsx        # Create event
        └── [id]/page.tsx       # Event details & codes
```

### Components

```
components/
└── BadgeDisplay.tsx            # Badge display component
```

### Utilities

```
lib/
├── db.ts                       # Prisma client singleton
├── auth.ts                     # Participant auth utilities
├── auth-organiser.ts           # Organiser auth utilities
├── validation.ts               # Zod schemas
├── artifact.tsx                # HTML artifact generation
├── badges.ts                   # Badge definitions and logic
├── rate-limit.ts               # In-memory rate limiting
└── rate-limit-redis.ts         # Redis-based rate limiting
```

---

## Deployment & Infrastructure

### Current Production Setup

- **Platform**: Vercel (Next.js serverless functions)
- **Database**: Neon PostgreSQL (serverless Postgres)
- **Environment Variables**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `SESSION_SECRET` - 32+ character random string
  - `ADMIN_PASSWORD` - Admin login password
  - `ORGANISER_PASSWORD` - Organiser login password
  - `NEXT_PUBLIC_APP_NAME` - App name
  - `NEXT_PUBLIC_APP_URL` - Public URL (for PWA)

### Build Process

1. **Prisma Generate**: `prisma generate` (generates Prisma Client)
2. **Next.js Build**: `next build` (creates optimized production bundle)
3. **Vercel Deploy**: Automatic on git push to main branch

### PWA Configuration

- **Status**: Enabled (but disabled on Vercel builds to avoid conflicts)
- **Manifest**: `public/manifest.json`
- **Service Worker**: Auto-generated by `next-pwa`
- **Offline Support**: Static assets cached

### Database Migrations

- **Local Dev**: `npx prisma migrate dev`
- **Production**: `npx prisma migrate deploy` (run in Vercel build or manually)

### Rate Limiting

- **Development**: In-memory (`lib/rate-limit.ts`)
- **Production**: Redis-based (`lib/rate-limit-redis.ts`, requires Redis instance)
- **Current**: Using in-memory (Redis not configured in Vercel)

---

## Current Limitations & Known Issues

### Technical Limitations

1. **PDF Generation Removed**
   - **Reason**: Vercel serverless functions have read-only filesystem
   - **Impact**: Only HTML artifacts available
   - **Workaround**: None (HTML is sufficient for current use case)

2. **Real-Time Updates**
   - **Current**: Polling-based (client polls API every few seconds)
   - **Limitation**: Not true real-time; slight delay in updates
   - **Future**: Could implement WebSockets or Server-Sent Events

3. **Rate Limiting**
   - **Current**: In-memory (resets on server restart)
   - **Limitation**: Not shared across Vercel serverless instances
   - **Future**: Requires Redis for production-grade rate limiting

4. **Session Management**
   - **Current**: Database-backed sessions
   - **Limitation**: No session invalidation on password change (not applicable for event codes)
   - **Note**: Works well for current use case

5. **Quest Data Structure**
   - **Legacy**: `Quest.decisionsData` JSON field (deprecated)
   - **Current**: `QuestDecision` and `QuestOption` tables (recommended)
   - **Status**: API supports both, but new quests should use tables

### Feature Limitations

1. **Team Size Fixed**
   - **Current**: Exactly 3 members per room
   - **Limitation**: Cannot configure team size per quest (though `Quest.teamSize` field exists)
   - **Future**: Could make team size configurable

2. **Decision Count Fixed**
   - **Current**: Typically 3 decisions per quest
   - **Limitation**: No dynamic decision count (though schema supports it)
   - **Future**: Could make decision count configurable per quest

3. **No Form Quest Support**
   - **Schema**: Supports `QuestType.FORM` and `QuestField`
   - **Status**: Schema exists, but UI/API not implemented
   - **Future**: Could implement form quest flow

4. **No Survey Quest Support**
   - **Schema**: Supports `QuestType.SURVEY`
   - **Status**: Not implemented
   - **Future**: Could implement survey quest flow

5. **Badge System**
   - **Status**: Fully implemented and functional
   - **Limitation**: Badge awarding logic is hardcoded in `lib/badges.ts`
   - **Future**: Could make badge definitions more configurable

6. **Analytics**
   - **Schema**: `AnalyticsEvent` model exists
   - **Status**: Not actively used in codebase
   - **Future**: Could implement analytics tracking

### Security Considerations

1. **Event Code Security**
   - **Current**: Simple string codes
   - **Limitation**: No brute-force protection beyond rate limiting
   - **Future**: Could add code complexity requirements

2. **Session Security**
   - **Current**: httpOnly cookies, secure in production
   - **Status**: Good security practices followed

3. **Input Validation**
   - **Current**: Zod schemas for all inputs
   - **Status**: Comprehensive validation

4. **SQL Injection**
   - **Current**: Prisma ORM prevents SQL injection
   - **Status**: Safe

---

## Gamification System (Badges)

### Badge Definitions

Located in `lib/badges.ts`, badges are defined with:
- **Type**: Enum value (e.g., `FIRST_QUEST_COMPLETE`)
- **Name**: Display name (e.g., "First Steps")
- **Description**: What the badge represents
- **Icon**: Emoji (e.g., "🚶")
- **Rarity**: `common`, `rare`, `epic`, `legendary`

### Badge Awarding Logic

**Trigger**: `checkRoomCompletionBadges()` called in `/api/commit` when room completes

**Checks Performed**:
1. **FIRST_QUEST_COMPLETE**: User's first completed room
2. **TEAM_PLAYER**: Completed a team decision room (always awarded)
3. **COLLABORATOR**: Voted in all 3 decisions
4. **STORYTELLER**: Provided justifications for 3+ decisions
5. **DECISION_MAKER**: Committed to final decision (always awarded)
6. **ARTIFACT_CREATOR**: Artifact generated (always awarded)
7. **QUEST_MASTER**: User completed 5+ quests
8. **SOCIAL_CONNECTOR**: Teamed with 10+ different people
9. **PERFECT_TEAM**: All 3 members voted and committed
10. **CONSENSUS_BUILDER**: Team reached unanimous votes on all decisions
11. **DIVERSITY_CHAMPION**: Teamed with people from 3+ different countries

### Badge Storage

- **Badge**: Master badge definitions (seeded via `scripts/seed-badges.ts`)
- **UserBadge**: User badge awards with optional `roomId` and `metadata`

### Badge Display

- **Component**: `BadgeDisplay.tsx`
- **Location**: `/me` page
- **Features**: 
  - Grid layout with icons
  - Rarity-based color coding
  - Tooltips with descriptions

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npm run prisma:seed
npm run seed-badges  # If badges script exists

# Start dev server
npm run dev
```

### Testing Multi-User Scenarios

**Important**: Chrome incognito windows share the same cookie jar. To test with multiple users:
- Use different browser profiles
- Use different browsers (Chrome, Firefox, Edge)
- Use different devices

### Database Management

```bash
# View database
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name migration_name
```

---

## Future Modification Considerations

### Areas for Enhancement

1. **Real-Time Collaboration**
   - WebSocket integration for live updates
   - Server-Sent Events as alternative

2. **PDF Generation Microservice**
   - Separate service for PDF generation
   - API integration from main app

3. **Form & Survey Quest Types**
   - Implement UI/API for FORM quests
   - Implement UI/API for SURVEY quests

4. **Configurable Team Sizes**
   - Make team size dynamic per quest
   - Update room matching logic

5. **Dynamic Decision Counts**
   - Support variable number of decisions per quest
   - Update UI to handle N decisions

6. **Analytics Dashboard**
   - Implement analytics tracking
   - Create dashboard for organisers

7. **Advanced Badge System**
   - Configurable badge definitions via UI
   - Badge progress tracking
   - Badge categories/collections

8. **Public Artifact Sharing**
   - Implement `shareToken` functionality
   - Public artifact viewing page

9. **Redis Integration**
   - Configure Redis for rate limiting
   - Session storage in Redis (optional)

10. **Email Notifications**
    - Optional email for artifact completion
    - Event reminders

---

## Conclusion

Echo Room is a fully functional collaborative decision-making platform with a solid foundation. The modular architecture, comprehensive data model, and clear separation of concerns make it well-suited for future enhancements. The removal of PDF generation simplifies the deployment while maintaining core functionality through HTML artifacts.

This document should serve as a comprehensive reference for understanding the current state and planning future modifications.
