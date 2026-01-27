# Quick Fix for Login Issue

Based on the diagnostic output, here's how to fix it:

## Step 1: Create .env File

Copy `.env.example` to `.env`:

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

**Windows CMD:**
```cmd
copy .env.example .env
```

**Linux/Mac:**
```bash
cp .env.example .env
```

## Step 2: Verify .env File Contents

Open `.env` and make sure it has these lines:

```env
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="admin123"
ORGANISER_PASSWORD="organiser2026"
```

**Note:** If you're using PostgreSQL instead of SQLite, change `DATABASE_URL` to your PostgreSQL connection string, e.g.:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/echo_room"
```

## Step 3: Apply Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate deploy
# OR if that fails:
npx prisma db push
```

## Step 4: Restart Dev Server

**Important:** After creating/updating `.env`, you MUST restart your dev server:

1. Stop the current server (Ctrl+C)
2. Start it again:
```bash
npm run dev
```

## Step 5: Test Login

1. Go to: `http://localhost:3000/admin/login`
2. Leave email field **empty**
3. Enter password: `admin123`
4. Click "Login"

## Step 6: Verify Setup

Run the diagnostic again to confirm everything is fixed:

```bash
npx tsx scripts/check-admin-setup.ts
```

You should see:
- ✅ ADMIN_PASSWORD is set
- ✅ DATABASE_URL is set
- ✅ Database connection successful
- ✅ Organiser table exists

## Troubleshooting

### If DATABASE_URL still shows as not set:
- Make sure `.env` file is in the root directory (same folder as `package.json`)
- Restart your dev server after creating `.env`
- Check for typos in `.env` file (no spaces around `=`)

### If migration fails:
- Make sure your database is running (if using PostgreSQL)
- Try `npx prisma db push` instead of `migrate deploy`
- Check that `DATABASE_URL` is correct

### If login still fails:
- Check browser console (F12) for error messages
- Check server terminal for error messages
- Make sure you restarted the dev server after creating `.env`
