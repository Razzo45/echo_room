# Admin Panel Testing Guide

This guide will help you test the new admin panel locally.

## Prerequisites

1. **Environment Setup**
   - Copy `.env.example` to `.env` if you haven't already
   - Ensure you have the required environment variables:
     ```env
     DATABASE_URL="file:./dev.db"  # or your PostgreSQL connection string
     ADMIN_PASSWORD="admin123"
     ORGANISER_PASSWORD="organiser2026"
     ```

## Step-by-Step Testing

### 1. Run Database Migration

First, apply the new migration to create the Organiser tables:

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations (if using PostgreSQL)
npx prisma migrate deploy

# OR if using SQLite (dev)
npx prisma migrate dev
```

**Note:** If you get permission errors, you may need to run:
```bash
npx prisma db push
```

### 2. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 3. Test Admin Login

#### Option A: Password-Only Login (Backward Compatible)

1. Navigate to: `http://localhost:3000/admin/login`
2. Leave the email field **empty**
3. Enter password: `admin123` (from your `.env` file)
4. Click "Login"

**What happens:**
- System checks `ADMIN_PASSWORD` env var
- If no admin account exists, it auto-creates one:
  - Email: `admin@echo-room.local`
  - Role: `SUPER_ADMIN`
  - Password: Hashed version of your `ADMIN_PASSWORD`

#### Option B: Email + Password Login (New Method)

1. Navigate to: `http://localhost:3000/admin/login`
2. Enter email: `admin@echo-room.local` (or any admin email you've created)
3. Enter password: `admin123`
4. Click "Login"

### 4. Explore Admin Dashboard

After logging in, you'll be redirected to `/admin` with:

- **Stats Overview**: Shows counts for Events, Organisers, Participants, Rooms
- **Navigation Cards**: Click to access different sections

### 5. Test Each Admin Section

#### Events (`/admin/events`)
- View all events in the system
- See event details, participant counts, room counts
- **Expected:** Should show any events from your seed data

#### Organisers (`/admin/organisers`)
- View all organiser accounts
- **Create New Organiser:**
  1. Click "+ Create Organiser"
  2. Fill in:
     - Email: `test@example.com`
     - Name: `Test Organiser`
     - Password: `testpass123` (min 8 chars)
     - Role: `ADMIN` or `ORGANISER`
  3. Click "Create"
- **Toggle Active Status:** Click "Activate/Deactivate" buttons
- **Note:** Only SUPER_ADMIN can create/update organisers

#### Participants (`/admin/participants`)
- View all participant accounts
- See participant details: name, organisation, event, stats
- Pagination available (50 per page)
- **Filter by Event:** Add `?eventId=xxx` to URL

#### Rooms (`/admin/rooms`)
- View all rooms in the system
- See room status, member counts, vote counts
- **Force Start:** Click "Force Start" on OPEN/FULL rooms
- **Expected:** Should show rooms from seed data if available

#### System Config (`/admin/config`)
- View system configuration
- See enabled features, system limits
- **Note:** Only SUPER_ADMIN can access this page
- **Expected:** Shows current system settings

### 6. Test RBAC (Role-Based Access Control)

#### Test SUPER_ADMIN Access
- Login with the auto-created admin account (SUPER_ADMIN)
- Should be able to:
  - ✅ Access all sections
  - ✅ Create/update organisers
  - ✅ Access System Config

#### Test ADMIN Access
1. Create an ADMIN account via `/admin/organisers`
2. Logout: Click "Logout" in top right
3. Login with the new ADMIN account
4. Should be able to:
  - ✅ View all sections
  - ✅ View organisers (but not create/update)
  - ❌ Cannot access System Config (403 error)

#### Test ORGANISER Access
1. Create an ORGANISER account via `/admin/organisers`
2. Try to login at `/admin/login` with ORGANISER account
3. Should get: "Admin access required" error
4. ORGANISER accounts should use `/organiser/login` instead

### 7. Test Session Management

1. **Login** at `/admin/login`
2. **Verify Session:**
   - Navigate between admin pages
   - Refresh the page
   - Session should persist
3. **Logout:**
   - Click "Logout" button
   - Should redirect to `/admin/login`
   - Try accessing `/admin` directly - should redirect to login

### 8. Test API Endpoints Directly

You can also test the API endpoints directly:

```bash
# Get dashboard stats (requires admin session cookie)
curl http://localhost:3000/api/admin/dashboard

# Get all organisers
curl http://localhost:3000/api/admin/organisers

# Create organiser (requires SUPER_ADMIN)
curl -X POST http://localhost:3000/api/admin/organisers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test Admin",
    "password": "testpass123",
    "role": "ADMIN"
  }'
```

**Note:** API calls require authentication cookies from a logged-in session.

## Troubleshooting

### Issue: Credentials not logging me in

**Step 1: Run diagnostic script**
```bash
npx tsx scripts/check-admin-setup.ts
```

This will check:
- Environment variables
- Database connection
- Table existence
- Admin accounts

**Step 2: Check common issues**

1. **Database migration not applied:**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   # OR if that fails:
   npx prisma db push
   ```

2. **ADMIN_PASSWORD not set:**
   - Check your `.env` file has `ADMIN_PASSWORD="admin123"` (or your password)
   - Restart your dev server after changing `.env`

3. **Database tables missing:**
   - Error message will say "Database tables not found"
   - Run: `npx prisma migrate deploy` or `npx prisma db push`

4. **Check browser console:**
   - Open DevTools (F12)
   - Check Console tab for error messages
   - Check Network tab to see the API response

**Step 3: Try password-only login**
- Go to `/admin/login`
- Leave email field **completely empty**
- Enter password: `admin123` (or your ADMIN_PASSWORD)
- Click Login

**Step 4: Check server logs**
- Look at your terminal where `npm run dev` is running
- Check for error messages about database or authentication

### Issue: "Unauthorized" errors
- **Solution:** Make sure you're logged in and have the correct role
- Check browser cookies - should have `organiser_session` cookie
- Clear cookies and try logging in again

### Issue: Migration fails
- **Solution:** Try `npx prisma db push` instead of migrate
- Or manually run the SQL from `prisma/migrations/20260127123445_add_organiser_model/migration.sql`
- Make sure your database is running and accessible

### Issue: "Cannot find module 'bcryptjs'"
- **Solution:** Run `npm install bcryptjs @types/bcryptjs`
- Restart your dev server

### Issue: Admin account not auto-creating
- **Solution:** Check that `ADMIN_PASSWORD` is set in `.env`
- Check database connection
- Check browser console for errors
- Make sure Organiser table exists (run diagnostic script)

### Issue: "Invalid credentials" error
- **Solution:** 
  - Verify ADMIN_PASSWORD matches what you're typing
  - Check for extra spaces in password
  - Try password-only login (empty email field)
  - Check server logs for detailed error

### Issue: Can't access System Config
- **Solution:** Make sure you're logged in as SUPER_ADMIN
- Check the role in the dashboard header
- Only SUPER_ADMIN can access System Config

## Quick Test Checklist

- [ ] Database migration applied successfully
- [ ] Can login with password-only method
- [ ] Can login with email+password method
- [ ] Dashboard loads with stats
- [ ] Can navigate to all 5 sections
- [ ] Can create new organiser account
- [ ] Can view participants list
- [ ] Can view rooms list
- [ ] Can access System Config (as SUPER_ADMIN)
- [ ] Logout works correctly
- [ ] RBAC restrictions work (ADMIN vs SUPER_ADMIN)

## Next Steps

After testing:
1. Create production admin accounts with strong passwords
2. Update `ADMIN_PASSWORD` in production environment
3. Consider disabling password-only login in production
4. Set up proper email verification for new organiser accounts
