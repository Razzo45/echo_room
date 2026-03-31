# Merge Strategy: feature/admin-panel-rbac → main

## Current State Analysis

### What We Have:
1. ✅ Organiser accounts with `OrganiserRole` enum (ORGANISER, SUPER_ADMIN)
2. ✅ Basic admin login at `/admin/login` (password-based via env var)
3. ✅ Admin rooms page at `/admin/rooms`
4. ✅ Organiser authentication system (`lib/auth-organiser.ts`)
5. ✅ Organiser scoping (organisers only see their own events unless SUPER_ADMIN)

### What the Branch Adds:
1. SUPER_ADMIN role-based admin panel
2. Organiser management (CRUD)
3. Enhanced admin features

## Merge Strategy

### Step 1: Backup Current Work
```bash
# Create a backup branch
git checkout -b backup-before-merge
git push origin backup-before-merge

# Return to main
git checkout main
```

### Step 2: Fetch and Review Branch
```bash
# Fetch the branch
git fetch origin feature/admin-panel-rbac

# Review what will be added/changed
git diff main...origin/feature/admin-panel-rbac --stat

# Review specific files that might conflict
git diff main...origin/feature/admin-panel-rbac --name-only
```

### Step 3: Merge with Strategy
```bash
# Merge the branch (this will create a merge commit)
git merge origin/feature/admin-panel-rbac --no-ff

# If conflicts occur, resolve them manually
```

## Potential Conflicts & Resolution

### 1. Admin Authentication (`lib/auth.ts` or new `lib/auth-admin.ts`)
**Conflict:** Current uses password-based, branch might use role-based
**Resolution:** 
- Keep both systems if needed
- Or migrate to role-based if branch has better implementation
- Ensure SUPER_ADMIN organisers can access admin panel

### 2. Admin Routes (`app/api/admin/*`)
**Conflict:** Current has `/api/admin/login` and `/api/admin/rooms`
**Resolution:**
- Merge new routes (likely won't conflict if they're different endpoints)
- Keep existing routes if branch doesn't replace them
- Check if branch adds `/api/admin/organisers` or similar

### 3. Admin Pages (`app/admin/*`)
**Conflict:** Current has `/admin/login` and `/admin/rooms`
**Resolution:**
- Add new pages (organisers management, etc.)
- Keep existing pages if they're still needed
- Update navigation if branch adds a dashboard

### 4. Prisma Schema (`prisma/schema.prisma`)
**Conflict:** Both might have OrganiserRole enum
**Resolution:**
- Should be identical (both have SUPER_ADMIN)
- If different, keep the more complete version
- Run migrations after merge

## Post-Merge Checklist

1. ✅ Run database migrations
   ```bash
   npx prisma migrate dev
   ```

2. ✅ Generate Prisma client
   ```bash
   npx prisma generate
   ```

3. ✅ Test admin login (both password and SUPER_ADMIN)
   - `/admin/login` should still work
   - SUPER_ADMIN organisers should be able to access admin panel

4. ✅ Test organiser functionality
   - Regular organisers should only see their events
   - SUPER_ADMIN should see all events
   - New admin panel should allow managing organisers

5. ✅ Build and test
   ```bash
   npm run build
   ```

6. ✅ Check for TypeScript errors
   ```bash
   npx tsc --noEmit
   ```

## Safe Alternative: Cherry-Pick Approach

If you want more control, cherry-pick specific commits:

```bash
# See commits in the branch
git log origin/feature/admin-panel-rbac --oneline

# Cherry-pick specific commits
git cherry-pick <commit-hash>
```

## Rollback Plan

If merge causes issues:

```bash
# Reset to before merge
git reset --hard backup-before-merge

# Or revert the merge commit
git revert -m 1 <merge-commit-hash>
```
