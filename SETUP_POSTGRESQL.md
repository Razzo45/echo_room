# Quick PostgreSQL Setup Guide

Your schema requires PostgreSQL (it uses enums and Json types that SQLite doesn't support).

## Option 1: Use Neon (Free Cloud PostgreSQL) - RECOMMENDED

1. **Sign up**: Go to https://neon.tech and create a free account
2. **Create database**: Create a new project/database
3. **Copy connection string**: It will look like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Update `.env`**:
   ```env
   DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ADMIN_PASSWORD="admin123"
   ORGANISER_PASSWORD="organiser2026"
   ```
5. **Apply migrations**:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
6. **Restart dev server**: `npm run dev`

## Option 2: Local PostgreSQL

1. **Install PostgreSQL**: Download from https://www.postgresql.org/download/
2. **Create database**:
   ```bash
   createdb echo_room
   ```
3. **Update `.env`**:
   ```env
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/echo_room"
   ```
4. **Apply migrations**:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

## After Setup

1. Run diagnostic: `npx tsx scripts/check-admin-setup.ts`
2. Test login at: `http://localhost:3000/admin/login`
   - Leave email empty
   - Password: `admin123`
