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
- **Prisma ORM** with SQLite (dev) / PostgreSQL (production)
- **Tailwind CSS** for mobile-first styling
- **React PDF** for artifact generation
- **PWA** with offline support for static assets

### Key Modules
- **Auth Module**: Event code validation, session management
- **World Module**: Map regions, quest catalog
- **Room Module**: Matchmaking, team formation
- **Quest Module**: Decision flow, voting logic
- **Artifact Module**: Deterministic report generation
- **Admin Module**: Room management, overrides

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

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

Default environment variables:
```bash
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_NAME="Echo Room"
SESSION_SECRET="dev-secret-change-in-production-32chars"
ADMIN_PASSWORD="admin123"
ORGANISER_PASSWORD="organiser2026"
```

3. **Initialize Database**
```bash
# Generate Prisma Client
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate

# Push schema to database
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma db push

# Seed demo data
npm run prisma:seed
```

4. **Start Development Server**
```bash
npm run dev
```

5. **Access the Application**
- **Participants:** http://localhost:3000
- **Organisers:** http://localhost:3000/organiser
- **Admins:** http://localhost:3000/admin/login

### Demo Credentials

- **Event Code:** `SMARTCITY26`
- **Organiser Password:** `organiser2026`
- **Admin Password:** `admin123`
```

This will:
- Install dependencies
- Generate Prisma client
- Run migrations
- Seed test data

4. **Start Development Server**
```bash
npm run dev
```

Visit http://localhost:3000

### Test Credentials
- **Event Code**: `SMARTCITY26`
- **Admin Password**: `admin123` (change in production!)

## 📁 Project Structure

```
micro-mmo-mvp/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── room/          # Room management
│   │   ├── vote/          # Voting
│   │   ├── commit/        # Decision commits
│   │   ├── artifact/      # Artifact generation
│   │   └── admin/         # Admin endpoints
│   ├── profile/           # Profile creation
│   ├── world/             # World map
│   ├── district/          # Quest list
│   ├── room/              # Room lobby & quest play
│   ├── artifact/          # Artifact viewer
│   ├── me/                # User's rooms
│   └── admin/             # Admin interface
├── lib/                   # Core utilities
│   ├── db.ts              # Prisma client
│   ├── auth.ts            # Session management
│   ├── validation.ts      # Zod schemas
│   ├── artifact.ts        # PDF/HTML generation
│   └── rate-limit.ts      # Rate limiting
├── prisma/
│   ├── schema.prisma      # Data model
│   └── seed.ts            # Seed script
├── public/
│   ├── manifest.json      # PWA manifest
│   └── artifacts/         # Generated PDFs
└── package.json
```

## 🗄️ Data Model

### Core Entities
- **Event**: Hackathon event container
- **EventCode**: Access codes for events
- **User**: Player profiles
- **Session**: Authentication tokens
- **Region**: Map regions (districts)
- **Quest**: Challenges within regions
- **Room**: 3-player team instances
- **RoomMember**: Room membership
- **Vote**: Individual votes on decisions
- **DecisionCommit**: Final team choices
- **Artifact**: Generated decision maps

### Key Relationships
- User → Event (many-to-one)
- Room → Quest + Event (many-to-one)
- RoomMember → Room + User (enforces max 3)
- Vote → Room + User + Decision
- Artifact → Room (one-to-one)

## 🎮 User Flow

1. **Landing**: Enter event code
2. **Profile**: Create player profile
3. **World Map**: View regions (City District active, others locked)
4. **Quest List**: See available challenges
5. **Room Matching**: Join existing room or create new (auto-matchmaking)
6. **Room Lobby**: Wait for 3 members
7. **Quest Play**: Three decision points:
   - Each member votes (A/B/C) with justification
   - Team sees all votes
   - Team commits to final choice
8. **Artifact**: View/download decision map PDF

## 🔐 Security Features

- **httpOnly cookies** for session tokens
- **Rate limiting** on event code attempts
- **Input validation** with Zod
- **No email required** (privacy-first)
- **Data deletion** endpoint
- **Admin password** via environment variable

## 📱 PWA Features

- **Installable** on mobile devices
- **Offline caching** for static assets
- **Mobile-first** responsive design
- **Fast loading** on slow networks

## 🛠️ Development Commands

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run migrations
npm run prisma:seed       # Seed database
npm run prisma:studio     # Open Prisma Studio
```

## 🐳 Docker Deployment

### Build Image
```bash
docker build -t micro-mmo:latest .
```

### Run Container
```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="file:./prod.db" \
  -e ADMIN_PASSWORD="your-secure-password" \
  -e SESSION_SECRET="your-32-char-secret" \
  --name micro-mmo \
  micro-mmo:latest
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/micrommo
      - ADMIN_PASSWORD=admin123
      - SESSION_SECRET=change-this-secret
      - NEXT_PUBLIC_APP_URL=https://yourdomain.com
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=yourpassword
      - POSTGRES_DB=micrommo
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🚢 Production Deployment

### Environment Variables
```env
DATABASE_URL="postgresql://user:pass@host:5432/db"
SESSION_SECRET="generate-a-32-character-random-string"
ADMIN_PASSWORD="strong-password-here"
NEXT_PUBLIC_APP_NAME="Echo Room"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### Database Setup
For PostgreSQL in production:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Run migrations:
```bash
npx prisma migrate deploy
npx prisma db seed
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Event code validation works
- [ ] Profile saves correctly
- [ ] Room join creates/joins appropriately
- [ ] Room starts with 3 members
- [ ] Voting flow works for all members
- [ ] Commit locks decision
- [ ] Artifact generates with correct data
- [ ] PDF downloads successfully
- [ ] Admin can force start rooms
- [ ] Data deletion works
- [ ] PWA installs on mobile

## 📊 Admin Tools

Access admin panel at `/admin/login`

**Capabilities:**
- View all rooms and statuses
- Force start rooms (bypass 3-member requirement)
- Mark rooms as completed
- View generated artifacts

## 🎨 Customization

### Adding New Quests
Edit `prisma/seed.ts` to add quest definitions with decisions and options.

### Styling
Modify `tailwind.config.js` and `app/globals.css` for theme changes.

### Decision Templates
Update artifact generation templates in `lib/artifact.ts`.

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database Issues
```bash
# Reset database
rm prisma/dev.db
npm run setup
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Credits

Built for Smart City Hackathon March 2026
