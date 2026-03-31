# SQLite Migration Issue

Your schema uses PostgreSQL-specific features (enums, Json) that SQLite doesn't support.

## Quick Solution: Use PostgreSQL Instead

**Option 1: Use Neon (Free PostgreSQL Cloud)**
1. Sign up at https://neon.tech (free tier available)
2. Create a database
3. Copy the connection string
4. Update your `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host/database"
   ```
5. Change `schema.prisma` back to:
   ```prisma
   provider = "postgresql"
   ```

**Option 2: Install PostgreSQL Locally**
1. Install PostgreSQL on your machine
2. Create a database
3. Update `.env` with connection string

## Alternative: Convert Schema to SQLite

If you really want SQLite, I can convert the schema, but it requires:
- Converting all enums to String fields
- Converting Json fields to String fields  
- Updating code that uses these types

This is more complex and may break existing functionality.

## Recommendation

**Use PostgreSQL** - it's what your schema was designed for, and Neon offers a free tier that's perfect for development.
