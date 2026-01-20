# Echo Room - Production Deployment Guide

## 🚀 Pre-Production Checklist

### 1. Database Migration (SQLite → PostgreSQL)

**Update `prisma/schema.prisma`:**
```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

**Migration Steps:**
```bash
# Generate migration
npx prisma migrate dev --name production_init

# For production deployment
npx prisma migrate deploy
npx prisma generate
```

### 2. Environment Variables

Create `.env.production`:
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/echoroom?sslmode=require"

# Session & Security
SESSION_SECRET="generate-32-character-random-string-here"
ADMIN_PASSWORD="strong-admin-password-change-this"
ORGANISER_PASSWORD="strong-organiser-password-change-this"

# App Configuration
NEXT_PUBLIC_APP_NAME="Echo Room"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"

# Optional: Redis for rate limiting (recommended for production)
REDIS_URL="redis://localhost:6379"
# Or for Redis Cloud/Upstash:
# REDIS_URL="rediss://default:password@host:port"

# Optional: Error tracking (Sentry, etc.)
# SENTRY_DSN="your-sentry-dsn"
```

### 3. Production Dependencies

**Add to `package.json`:**
```json
{
  "dependencies": {
    "ioredis": "^5.3.2"  // For Redis rate limiting
  }
}
```

**Install:**
```bash
npm install ioredis
```

### 4. Rate Limiting Upgrade

The system now supports Redis-based rate limiting. Update `lib/rate-limit.ts` imports to use `lib/rate-limit-redis.ts`:

```typescript
// In files using rate limiting:
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit-redis';
```

### 5. Badges System Setup

**Seed Badge Definitions:**
Create a migration or seed script to initialize badges:

```typescript
// prisma/seed-badges.ts
import { prisma } from './db';
import { getBadgeDefinition } from '../lib/badges';

async function seedBadges() {
  const badgeTypes = [
    'FIRST_QUEST_COMPLETE',
    'TEAM_PLAYER',
    'COLLABORATOR',
    'STORYTELLER',
    'DECISION_MAKER',
    'ARTIFACT_CREATOR',
    'QUEST_MASTER',
    'SOCIAL_CONNECTOR',
    'PERFECT_TEAM',
    'CONSENSUS_BUILDER',
    'DIVERSITY_CHAMPION',
  ];

  for (const badgeType of badgeTypes) {
    const def = getBadgeDefinition(badgeType as any);
    await prisma.badge.upsert({
      where: { badgeType: badgeType as any },
      update: def,
      create: { badgeType: badgeType as any, ...def },
    });
  }
}
```

### 6. Build & Deploy

**Build:**
```bash
npm run build
```

**Start Production Server:**
```bash
npm start
```

**Or with PM2:**
```bash
pm2 start npm --name "echo-room" -- start
```

## 🏗️ Architecture Improvements

### Current Architecture
- ✅ Next.js 14 App Router
- ✅ Prisma ORM
- ✅ SQLite (dev) / PostgreSQL (prod)
- ✅ In-memory rate limiting (dev)
- ✅ httpOnly cookie sessions

### Production Enhancements

1. **Rate Limiting**
   - ✅ Redis support added (`lib/rate-limit-redis.ts`)
   - Falls back to in-memory if Redis unavailable
   - Configurable via `REDIS_URL` env var

2. **Database**
   - ✅ Indexes added for performance
   - ✅ PostgreSQL ready
   - ✅ Connection pooling (via Prisma)

3. **Badges System**
   - ✅ Gamification layer
   - ✅ Automatic badge awarding
   - ✅ User profile integration

4. **Error Handling**
   - Consider adding Sentry or similar
   - Structured error logging

5. **Monitoring**
   - AnalyticsEvent model ready
   - Consider adding metrics dashboard

## 📊 Database Indexes Added

The schema now includes optimized indexes:
- `User.eventId` - Fast user lookups by event
- `Room.eventId, status` - Efficient room queries
- `Vote.roomId, decisionNumber` - Fast vote aggregation
- `UserBadge.userId, badgeId, roomId` - Badge lookups
- `AnalyticsEvent.userId` - User analytics

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Use strong `SESSION_SECRET` (32+ chars)
- [ ] Enable HTTPS in production
- [ ] Set secure cookie flags (already in code)
- [ ] Review CORS settings if needed
- [ ] Rate limit all public endpoints
- [ ] Validate all inputs (Zod already in place)
- [ ] Sanitize user-generated content

## 🚢 Deployment Options

### Vercel (Recommended for Next.js)
```bash
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Railway / Render
- Connect GitHub repo
- Set environment variables
- Deploy automatically

## 📈 Scaling Considerations

1. **Database**
   - Use connection pooling (Prisma handles this)
   - Consider read replicas for analytics
   - Monitor query performance

2. **Rate Limiting**
   - Redis recommended for multi-instance deployments
   - In-memory works for single instance

3. **File Storage**
   - Artifacts stored in `public/artifacts/`
   - Consider S3/Cloud Storage for production
   - Update `lib/artifact.ts` to use cloud storage

4. **Caching**
   - Consider Redis for frequently accessed data
   - Cache badge definitions
   - Cache quest/region data

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Reset database (dev only!)
npx prisma migrate reset
```

### Badge Awarding Not Working
- Check `checkRoomCompletionBadges` is called
- Verify room status is `COMPLETED`
- Check console for errors

### Rate Limiting Issues
- Verify Redis connection if using Redis
- Check `REDIS_URL` format
- Falls back to in-memory automatically

## 📝 Post-Deployment

1. **Monitor**
   - Check error logs
   - Monitor database performance
   - Track badge awarding

2. **Analytics**
   - Review `AnalyticsEvent` data
   - Track user engagement
   - Monitor room completion rates

3. **Badges**
   - Verify badges are being awarded
   - Check badge definitions exist
   - Monitor badge distribution

## 🎯 Next Steps

1. Set up monitoring (Sentry, LogRocket, etc.)
2. Configure CDN for static assets
3. Set up automated backups
4. Create admin analytics dashboard
5. Add more badge types as needed
6. Implement badge sharing/export
