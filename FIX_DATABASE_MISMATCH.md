# Fix Database Mismatch Issue

## Problem
Your `schema.prisma` was set to `postgresql` but your `.env` has SQLite format (`file:./dev.db`).

## Solution Applied
I've updated `schema.prisma` to use `sqlite` for local development.

## Next Steps

### 1. Regenerate Prisma Client
```bash
npx prisma generate
```

### 2. Apply Database Schema
```bash
npx prisma db push
```

This will create/update your SQLite database file (`prisma/dev.db`).

### 3. Verify Setup
Run the diagnostic again:
```bash
npx tsx scripts/check-admin-setup.ts
```

You should now see:
- ✅ Database connection successful
- ✅ Organiser table exists

### 4. Test Login
1. Make sure your dev server is running: `npm run dev`
2. Go to: `http://localhost:3000/admin/login`
3. Leave email empty
4. Enter password: `admin123`
5. Click Login

## For Production

When deploying to production with PostgreSQL, change `schema.prisma` back to:
```prisma
provider = "postgresql"
```

And update your production `.env` with a PostgreSQL connection string:
```env
DATABASE_URL="postgresql://user:password@host:5432/database"
```
