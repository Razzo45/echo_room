# Echo Room - AI Powered Decision Environment

> You don't leave with slides. You leave with a decision map.

Echo Room is a mobile-first Progressive Web App that uses AI to generate and structure complex tradeoffs, and immersive design to make teams feel the consequences of their choices before committing.

Built for pre-event engagement and collaborative decision-making.

## 🎯 Overview

Echo Room is a lightweight decision environment where teams of 3 collaborate on complex challenges. Participants vote on structured options with justifications, and generate comprehensive decision maps documenting their choices, tradeoffs, and commitments.

## 🏗️ Architecture

### Modular Monolith Design
- **Next.js 14** with App Router for server-side rendering and API routes
- **TypeScript** for type safety
- **Prisma ORM** with PostgreSQL (production) / SQLite (dev)
- **Tailwind CSS** for mobile-first styling
- **PWA** with offline support for static assets
- **OpenAI API** for AI-powered quest generation

### Key Modules
- **Auth Module**: Event code validation, session management, role-based access control
- **Organiser Module**: Event management, quest editing, code generation
- **Admin Module**: System-wide management, organiser accounts, participant oversight
- **World Module**: Map regions, quest catalog
- **Room Module**: Matchmaking, team formation
- **Quest Module**: Decision flow, voting logic
- **Artifact Module**: Deterministic report generation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (for production) or SQLite (for local dev)

### Local Development

1. **Clone and Install**
```bash
git clone <repository-url>
cd echo-room
npm install
```

2. **Setup Environment**
```bash
cp .env.example .env
# Edit .env and set your values
```

Required environment variables:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"  # or "file:./dev.db" for SQLite
NEXT_PUBLIC_APP_NAME="Echo Room"
SESSION_SECRET="dev-secret-change-in-production-32chars"
ADMIN_PASSWORD="admin123"  # Legacy admin login (optional)
OPENAI_API_KEY="sk-..."  # Required for AI quest generation
```

3. **Initialize Database**
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed demo data (optional)
npm run prisma:seed
```

4. **Create Organiser Accounts**
```bash
# Run the organiser creation script
npx tsx scripts/create-organisers.ts
```

This creates test organisers:
- `organiser@test.com` / `organiser2026` (ORGANISER role)
- `organiser2@test.com` / `organiser22026` (ORGANISER role)

5. **Start Development Server**
```bash
npm run dev
```

6. **Access the Application**
- **Participants:** http://localhost:3000
- **Organisers:** http://localhost:3000/organiser
- **Admin Panel:** http://localhost:3000/admin/login

### Demo Credentials

- **Event Code:** `SMARTCITY26`
- **Organiser Login:** 
  - Email: `organiser@test.com`
  - Password: `organiser2026`
- **Admin Login:** 
  - Password: `admin123` (legacy password-based, or use SUPER_ADMIN organiser account)

## 👥 User Roles & Access

### Participants
- Join events with event codes
- Create profiles
- Form teams and complete quests
- Generate decision map artifacts

### Organisers
- **Role:** `ORGANISER`
- **Access:** `/organiser` portal
- **Capabilities:**
  - Create and manage their own events
  - Generate custom event codes
  - Edit quest scripts manually
  - View event statistics
  - Trigger AI quest generation
  - Revert quests to AI baseline

### Admins
- **Role:** `ADMIN` or `SUPER_ADMIN`
- **Access:** `/admin` panel (requires ADMIN/SUPER_ADMIN role)
- **Capabilities:**
  - View system-wide dashboard
  - Manage all organisers (create, edit, delete, activate/deactivate)
  - View all events across all organisers
  - View all participants
  - Manage rooms (force start, view status)
  - System configuration

### Super Admins
- **Role:** `SUPER_ADMIN`
- **Additional Capabilities:**
  - Access to all events (not just their own)
  - Full system administration
  - Can manage other SUPER_ADMIN accounts

## 📁 Project Structure

```
echo-room/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Participant authentication
│   │   ├── organiser/     # Organiser API endpoints
│   │   │   ├── login/     # Organiser login
│   │   │   ├── events/    # Event management
│   │   │   ├── quests/    # Quest management & editing
│   │   │   └── districts/ # Region management
│   │   ├── admin/         # Admin API endpoints
│   │   │   ├── login/     # Admin login
│   │   │   ├── dashboard/ # Dashboard stats
│   │   │   ├── organisers/ # Organiser CRUD
│   │   │   ├── events/    # Event management
│   │   │   ├── participants/ # Participant management
│   │   │   ├── rooms/     # Room management
│   │   │   └── config/    # System configuration
│   │   ├── room/          # Room management
│   │   ├── vote/          # Voting
│   │   ├── artifact/      # Artifact generation
│   │   └── ...
│   ├── organiser/         # Organiser portal
│   │   ├── page.tsx       # Login page
│   │   ├── dashboard/     # Event dashboard
│   │   ├── events/        # Event management
│   │   └── quests/        # Quest script editor
│   ├── admin/             # Admin panel
│   │   ├── login/         # Admin login
│   │   ├── page.tsx       # Dashboard
│   │   ├── organisers/    # Organiser management
│   │   ├── events/        # Event management
│   │   ├── participants/  # Participant management
│   │   ├── rooms/         # Room management
│   │   └── config/        # System config
│   ├── profile/           # Profile creation
│   ├── world/             # World map
│   ├── district/          # Quest list
│   ├── room/              # Room lobby & quest play
│   └── artifact/          # Artifact viewer
├── lib/                   # Core utilities
│   ├── db.ts              # Prisma client
│   ├── auth.ts            # Participant session management
│   ├── auth-organiser.ts  # Organiser authentication & RBAC
│   ├── validation.ts      # Zod schemas
│   ├── artifact.ts        # PDF/HTML generation
│   ├── ai/                # AI generation logic
│   └── rate-limit.ts      # Rate limiting
├── prisma/
│   ├── schema.prisma      # Data model
│   ├── migrations/        # Database migrations
│   └── seed.ts            # Seed script
├── scripts/
│   └── create-organisers.ts # Create test organiser accounts
└── package.json
```

## 🗄️ Data Model

### Core Entities
- **Event**: Event container with organiser ownership
- **EventCode**: Access codes for events (custom or auto-generated)
- **Organiser**: Organiser accounts with roles (ORGANISER, ADMIN, SUPER_ADMIN)
- **OrganiserSession**: Database-backed organiser sessions
- **User**: Participant profiles
- **Session**: Participant authentication tokens
- **Region**: Map regions (districts)
- **Quest**: Challenges within regions (AI-generated or manual)
- **QuestDecision**: Decisions within quests
- **QuestOption**: Options for each decision
- **Room**: 3-player team instances
- **RoomMember**: Room membership
- **Vote**: Individual votes on decisions
- **DecisionCommit**: Final team choices
- **Artifact**: Generated decision maps
- **EventGeneration**: AI generation tracking and baselines

### Key Relationships
- Organiser → Event (one-to-many, with ownership)
- Event → EventCode (one-to-many)
- User → Event (many-to-one)
- Room → Quest + Event (many-to-one)
- RoomMember → Room + User (enforces max 3)
- Vote → Room + User + Decision
- Artifact → Room (one-to-one)
- Quest → EventGeneration (optional, for AI-generated quests)

## 🎮 User Flow

### Participant Flow
1. **Landing**: Enter event code
2. **Profile**: Create player profile
3. **World Map**: View regions (districts)
4. **Quest List**: See available challenges
5. **Room Matching**: Join existing room or create new (auto-matchmaking)
6. **Room Lobby**: Wait for 3 members
7. **Quest Play**: Three decision points:
   - Each member votes (A/B/C) with justification
   - Team sees all votes
   - Team commits to final choice
8. **Artifact**: View/download decision map

### Organiser Flow
1. **Login**: Email/password authentication
2. **Dashboard**: View all owned events
3. **Create Event**: Set up new event with branding
4. **Generate Codes**: Create custom or random event codes
5. **AI Generation**: Trigger AI quest generation from brief
6. **Edit Quests**: Manually edit quest scripts
7. **Monitor**: View participant stats and room status

### Admin Flow
1. **Login**: Use SUPER_ADMIN organiser account or legacy password
2. **Dashboard**: System-wide statistics
3. **Manage Organisers**: Create, edit, activate/deactivate organiser accounts
4. **View Events**: See all events across all organisers
5. **Manage Participants**: View and manage participant data
6. **Room Management**: Force start rooms, view status

## 🔐 Authentication & Security

### Participant Authentication
- Event code validation
- httpOnly cookie sessions
- No email required (privacy-first)

### Organiser Authentication
- **Email/password** authentication
- **Database-backed sessions** (stored in `OrganiserSession` table)
- **Role-based access control** (ORGANISER, ADMIN, SUPER_ADMIN)
- **Per-organiser event scoping** (organisers only see their own events unless SUPER_ADMIN)
- **Password hashing** with bcrypt

### Admin Authentication
- **Legacy:** Password-based via `ADMIN_PASSWORD` env var
- **Modern:** SUPER_ADMIN organiser accounts (recommended)
- Database-backed sessions for SUPER_ADMIN accounts

### Security Features
- httpOnly cookies for all sessions
- Rate limiting on event code attempts
- Input validation with Zod
- Database-backed sessions (more secure than cookie-only)
- Role-based access control
- Per-organiser data isolation

## 📱 PWA Features

- **Installable** on mobile devices
- **Offline caching** for static assets
- **Mobile-first** responsive design
- **Fast loading** on slow networks

## 🛠️ Development Commands

```bash
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Run migrations (dev)
npm run prisma:migrate:deploy  # Deploy migrations (production)
npm run prisma:seed            # Seed database
npm run prisma:studio          # Open Prisma Studio
```

## 🚢 Production Deployment

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Security
SESSION_SECRET="generate-a-32-character-random-string"
ADMIN_PASSWORD="strong-password-here"  # Optional, legacy admin login

# App Configuration
NEXT_PUBLIC_APP_NAME="Echo Room"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# AI Generation
OPENAI_API_KEY="sk-..."  # Required for AI quest generation
```

### Database Setup

1. **Run migrations:**
```bash
npx prisma migrate deploy
```

2. **Create initial organiser accounts:**
```bash
# Edit scripts/create-organisers.ts with production credentials
npx tsx scripts/create-organisers.ts
```

Or create via admin panel after first SUPER_ADMIN login.

### Vercel Deployment

The build script automatically runs migrations:
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

Ensure `DATABASE_URL` is set in Vercel environment variables.

## 🧪 Testing

### Manual Testing Checklist

**Participant Features:**
- [ ] Event code validation works
- [ ] Profile saves correctly
- [ ] Room join creates/joins appropriately
- [ ] Room starts with 3 members
- [ ] Voting flow works for all members
- [ ] Commit locks decision
- [ ] Artifact generates with correct data
- [ ] PDF downloads successfully
- [ ] PWA installs on mobile

**Organiser Features:**
- [ ] Email/password login works
- [ ] Can create events
- [ ] Can generate custom event codes
- [ ] Can edit quest scripts
- [ ] Can revert to AI baseline
- [ ] Can trigger AI generation
- [ ] Only sees own events (unless SUPER_ADMIN)

**Admin Features:**
- [ ] SUPER_ADMIN can access admin panel
- [ ] Can create/edit/delete organisers
- [ ] Can view all events
- [ ] Can view all participants
- [ ] Can manage rooms
- [ ] Dashboard shows correct stats

## 📊 Admin Panel Features

Access admin panel at `/admin/login` (requires ADMIN or SUPER_ADMIN role)

**Dashboard:**
- System-wide statistics (events, organisers, participants, rooms)
- Active room count
- Quick navigation to all sections

**Organiser Management:**
- Create new organiser accounts
- Edit organiser details (email, name, role)
- Activate/deactivate accounts
- View last login times
- Assign roles (ORGANISER, ADMIN, SUPER_ADMIN)

**Event Management:**
- View all events across all organisers
- See event ownership
- View event statistics

**Participant Management:**
- View all participants
- Filter by event
- View participant profiles

**Room Management:**
- View all rooms and statuses
- Force start rooms (bypass 3-member requirement)
- Mark rooms as completed
- View generated artifacts

**System Configuration:**
- System settings
- Configuration management

## 🎨 Customization

### Creating Organiser Accounts

**Via Script:**
```bash
# Edit scripts/create-organisers.ts
npx tsx scripts/create-organisers.ts
```

**Via Admin Panel:**
1. Login as SUPER_ADMIN
2. Navigate to `/admin/organisers`
3. Click "Create Organiser"
4. Fill in email, name, password, and role

### Adding New Quests

**AI Generation:**
1. Create event as organiser
2. Add AI brief
3. Click "Generate Rooms" in event detail page
4. Review and commit generated content

**Manual Creation:**
1. Create regions (districts) for event
2. Create quests within regions
3. Add decisions and options manually
4. Or edit AI-generated quests

### Styling

Modify `tailwind.config.js` and `app/globals.css` for theme changes.

### Decision Templates

Update artifact generation templates in `lib/artifact.ts`.

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Database Issues
```bash
# Reset database (dev only!)
npx prisma migrate reset
npm run prisma:seed
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Organiser Login Issues
- Ensure organiser account exists in database
- Check password hash is set correctly
- Verify `OrganiserSession` table exists
- Check database connection

### Migration Issues
If migrations fail:
1. Check database connection
2. Verify schema matches database state
3. Use `npx prisma migrate resolve --applied <migration-name>` if migration was applied manually

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Credits

Built for Smart City Hackathon March 2026
