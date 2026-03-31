# PostgreSQL Setup for Windows

## Step 1: Verify PostgreSQL Installation

Check if PostgreSQL is installed and running:

```powershell
# Check if PostgreSQL service is running
Get-Service -Name postgresql*

# Or check if psql is available
psql --version
```

## Step 2: Create Database

**Option A: Using psql (Command Line)**

1. Open PowerShell as Administrator
2. Navigate to PostgreSQL bin directory (usually):
   ```powershell
   cd "C:\Program Files\PostgreSQL\16\bin"
   ```
   (Replace `16` with your PostgreSQL version)

3. Create database:
   ```powershell
   .\createdb.exe -U postgres echo_room
   ```
   (It will prompt for the postgres user password)

**Option B: Using pgAdmin (GUI)**

1. Open pgAdmin (usually in Start Menu)
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
4. Name: `echo_room`
5. Click "Save"

**Option C: Using SQL Command**

1. Open psql:
   ```powershell
   psql -U postgres
   ```
2. Run:
   ```sql
   CREATE DATABASE echo_room;
   \q
   ```

## Step 3: Update .env File

Open your `.env` file and update `DATABASE_URL`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/echo_room"
ADMIN_PASSWORD="admin123"
ORGANISER_PASSWORD="organiser2026"
```

**Replace `YOUR_PASSWORD`** with the password you set during PostgreSQL installation.

**Common connection strings:**
- Default user `postgres`: `postgresql://postgres:password@localhost:5432/echo_room`
- If you created a different user: `postgresql://username:password@localhost:5432/echo_room`
- If PostgreSQL is on a different port: `postgresql://postgres:password@localhost:5433/echo_room`

## Step 4: Test Connection

**If you're in the PostgreSQL bin directory:**
```powershell
.\psql.exe -U postgres -d echo_room -h localhost
```

**If PostgreSQL is in your PATH:**
```powershell
psql -U postgres -d echo_room -h localhost
```

If it connects successfully, type `\q` to exit.

## Step 5: Apply Migrations

```powershell
# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate deploy
```

## Step 6: Verify Setup

```powershell
npx tsx scripts/check-admin-setup.ts
```

You should see:
- ✅ Database connection successful
- ✅ Organiser table exists

## Step 7: Restart Dev Server

```powershell
npm run dev
```

## Step 8: Test Login

1. Go to: `http://localhost:3000/admin/login`
2. Leave email empty
3. Enter password: `admin123`
4. Click Login

## Troubleshooting

### "psql: command not found"
- Add PostgreSQL bin directory to PATH:
  1. Search "Environment Variables" in Windows
  2. Edit "Path" variable
  3. Add: `C:\Program Files\PostgreSQL\16\bin` (adjust version number)
  4. Restart PowerShell

### "password authentication failed"
- Check your PostgreSQL password
- Try resetting password in pgAdmin or via command line

### "database does not exist"
- Make sure you created the `echo_room` database
- Check database name spelling in connection string

### Connection refused
- Make sure PostgreSQL service is running:
  ```powershell
  Get-Service -Name postgresql*
  Start-Service -Name postgresql-x64-16
  ```
  (Adjust service name based on your installation)
