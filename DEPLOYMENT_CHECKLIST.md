# Deployment Checklist

## Pre-Deployment

### ✅ Code Ready
- [x] All code changes committed
- [x] Build passes locally (`npm run build`)
- [x] No TypeScript errors
- [x] No linting errors
- [x] Prisma migration created and tested

### ⚠️ Environment Variables Required

**For Vercel:**
1. Go to Vercel Project Settings → Environment Variables
2. Add the following variables:

```
DATABASE_URL=postgresql://... (your Neon PostgreSQL connection string)
SESSION_SECRET=your-32-character-random-string
ADMIN_PASSWORD=your-secure-admin-password
ORGANISER_PASSWORD=your-secure-organiser-password
OPENAI_API_KEY=sk-your-openai-api-key
NEXT_PUBLIC_APP_NAME=Echo Room
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

**Important:** 
- `OPENAI_API_KEY` is **NEW** and required for AI generation feature
- All other variables should already be set from previous deployments

### 📦 Dependencies
- [x] `openai` package added to `package.json`
- [x] Run `npm install` to ensure all dependencies are installed

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Add AI event room generation feature"
git push origin main
```

### 2. Vercel Auto-Deploy
- Vercel will automatically detect the push and start building
- Monitor the build logs in Vercel dashboard

### 3. Post-Deployment Verification

**Check Build:**
- [ ] Build completes successfully in Vercel
- [ ] No build errors in Vercel logs

**Test Organiser Features:**
- [ ] Log in as organiser (`/organiser`)
- [ ] Create a new event or open existing event
- [ ] Add an AI brief
- [ ] Click "Generate Rooms"
- [ ] Verify generation completes successfully
- [ ] Check that quests appear in the quest list

**Test Participant Flow:**
- [ ] Generate an event code
- [ ] Join as participant with event code
- [ ] Navigate to district/quest list
- [ ] Verify AI-generated quests are visible
- [ ] Join a quest and verify decisions/options load correctly

**Test Error Handling:**
- [ ] Try generating without AI brief (should show error)
- [ ] Try generating with invalid API key (should show error in logs)

## Known Build Warnings

The following warnings are **expected and safe to ignore**:
- `Route /api/auth/me couldn't be rendered statically because it used cookies`
- `Route /api/badges couldn't be rendered statically because it used cookies`
- Similar warnings for other API routes

These are normal for serverless API routes that use authentication cookies.

## Troubleshooting

### Build Fails with "Module not found: openai"
- **Solution:** Ensure `npm install` was run and `package.json` includes `"openai": "^4.28.0"`

### AI Generation Fails with "OPENAI_API_KEY not set"
- **Solution:** Add `OPENAI_API_KEY` to Vercel environment variables and redeploy

### Migration Errors
- **Solution:** Run `npx prisma migrate deploy` in Vercel build command or manually after deployment

### Generation Takes Too Long
- **Solution:** Check OpenAI API status and verify API key is valid

## Rollback Plan

If deployment fails:
1. Revert the commit in GitHub
2. Vercel will automatically redeploy previous version
3. Or manually redeploy previous deployment in Vercel dashboard

## Database Migration

The migration `20260120145453_add_ai_generation` will run automatically if:
- Vercel build command includes `prisma migrate deploy`
- Or Prisma migrations are set to auto-run in Vercel

**Manual migration (if needed):**
```bash
npx prisma migrate deploy
```

## Feature Flags

No feature flags needed - AI generation is available immediately after deployment.

## Cost Considerations

- **OpenAI API:** ~$0.01-0.05 per generation (using gpt-4o-mini)
- **Vercel:** No additional cost (serverless functions)
- **Database:** No additional cost (same Neon PostgreSQL)

## Support

If issues occur:
1. Check Vercel function logs
2. Check OpenAI API status
3. Verify all environment variables are set
4. Review `AI_GENERATION_README.md` for troubleshooting
