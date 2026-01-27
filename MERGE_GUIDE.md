# Merge Guide: feature/admin-panel-rbac → main

## Summary

The branch adds **comprehensive admin panel** with RBAC (Role-Based Access Control) while your current code has:
- Basic admin login (password-based)
- Admin rooms page
- Organiser accounts with SUPER_ADMIN role

## Files That Will Be Added (Safe - No Conflicts)

✅ **New Admin Pages:**
- `app/admin/page.tsx` - Admin dashboard
- `app/admin/config/page.tsx` - Config management
- `app/admin/events/page.tsx` - Events management
- `app/admin/organisers/page.tsx` - Organiser management (NEW!)
- `app/admin/participants/page.tsx` - Participant management

✅ **New Admin API Routes:**
- `app/api/admin/dashboard/route.ts`
- `app/api/admin/config/route.ts`
- `app/api/admin/events/route.ts`
- `app/api/admin/organisers/route.ts` - Organiser CRUD (NEW!)
- `app/api/admin/participants/route.ts`
- `app/api/admin/logout/route.ts`

✅ **New Scripts & Docs:**
- `scripts/check-admin-setup.ts`
- `scripts/verify-env.ts`
- `ADMIN_TESTING_GUIDE.md`
- Various setup guides

## Files That Will Be Modified (Potential Conflicts)

⚠️ **Files Modified in Both Branches:**

1. **`app/admin/login/page.tsx`**
   - **Your version:** Simple password-based login
   - **Branch version:** Likely enhanced with role-based auth
   - **Action:** Review and merge manually

2. **`app/admin/rooms/page.tsx`**
   - **Your version:** Basic rooms list
   - **Branch version:** Enhanced with RBAC features
   - **Action:** Keep branch version (more features)

3. **`app/api/admin/login/route.ts`**
   - **Your version:** Password check via env var
   - **Branch version:** Likely uses SUPER_ADMIN role
   - **Action:** Need to support both or migrate to role-based

4. **`app/api/admin/rooms/route.ts`**
   - **Your version:** Basic rooms API
   - **Branch version:** Enhanced with RBAC
   - **Action:** Keep branch version

5. **`lib/auth-organiser.ts`**
   - **Your version:** Has `requireOrganiserAuth()` with SUPER_ADMIN support
   - **Branch version:** May have additional admin auth functions
   - **Action:** Merge carefully, keep both functionalities

6. **`prisma/schema.prisma`**
   - **Your version:** Has Organiser model with SUPER_ADMIN
   - **Branch version:** May have same or additional fields
   - **Action:** Compare schemas, merge if identical

7. **`app/api/organiser/login/route.ts`**
   - **Your version:** Email/password login
   - **Branch version:** May have additional features
   - **Action:** Review changes

## Recommended Merge Steps

### Step 1: Commit Current Work
```bash
# Make sure all your current work is committed
git add .
git commit -m "Current work: organiser accounts with SUPER_ADMIN role"
git push origin main
```

### Step 2: Create Backup Branch
```bash
git checkout -b backup-before-admin-merge
git push origin backup-before-admin-merge
git checkout main
```

### Step 3: Attempt Merge
```bash
# Merge the branch
git merge origin/feature/admin-panel-rbac --no-ff -m "Merge admin panel with RBAC"
```

### Step 4: Resolve Conflicts (if any)

If conflicts occur, here's how to handle each:

#### Conflict in `app/admin/login/page.tsx`
- **Keep:** Branch version (likely has better RBAC integration)
- **Or:** Manually merge to support both password-based and role-based login

#### Conflict in `lib/auth-organiser.ts`
- **Keep:** Your version's `requireOrganiserAuth()` function
- **Add:** Any new admin auth functions from branch
- **Ensure:** SUPER_ADMIN organisers can access admin panel

#### Conflict in `prisma/schema.prisma`
- **Compare:** Both schemas side-by-side
- **Keep:** The more complete version
- **Run:** `npx prisma migrate dev` after resolving

#### Conflict in `app/api/admin/login/route.ts`
- **Decision:** Do you want to:
  - **Option A:** Keep password-based login (current)
  - **Option B:** Migrate to SUPER_ADMIN role-based (branch)
  - **Option C:** Support both (hybrid)

### Step 5: Post-Merge Tasks

```bash
# 1. Install any new dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Check if migrations are needed
npx prisma migrate dev

# 4. Build and test
npm run build

# 5. Check for TypeScript errors
npx tsc --noEmit
```

### Step 6: Test Everything

1. ✅ **Test Organiser Login**
   - Regular organisers can log in
   - SUPER_ADMIN organisers can log in
   - Organisers only see their events (unless SUPER_ADMIN)

2. ✅ **Test Admin Login**
   - Password-based login still works (if kept)
   - SUPER_ADMIN organisers can access admin panel

3. ✅ **Test New Admin Features**
   - Admin dashboard loads
   - Can view/manage organisers
   - Can view/manage events
   - Can view/manage participants
   - Can view/manage rooms

## Quick Merge Command (If You're Confident)

```bash
# One-liner merge (use with caution!)
git merge origin/feature/admin-panel-rbac --no-ff -m "Merge admin panel RBAC"
```

## Rollback Plan

If something breaks:

```bash
# Option 1: Reset to before merge
git reset --hard backup-before-admin-merge

# Option 2: Revert merge commit
git revert -m 1 HEAD
```

## Expected Outcome

After successful merge, you should have:

✅ **Enhanced Admin Panel:**
- Dashboard with overview
- Organiser management (create, edit, delete organisers)
- Event management
- Participant management
- Room management (enhanced)
- Config management

✅ **RBAC Integration:**
- SUPER_ADMIN organisers can access admin panel
- Regular organisers only see their events
- Proper role-based access control

✅ **All Existing Features Preserved:**
- Organiser login still works
- Event creation still works
- Event code generation still works
- All organiser features intact
