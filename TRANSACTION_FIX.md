# Transaction Timeout Fix

## Problem
The Prisma transaction was timing out on Vercel serverless functions with Neon PostgreSQL connection pooling. The error was:
```
Transaction not found. Transaction ID is invalid, refers to an old closed transaction
```

## Root Cause
1. Long-running transaction (AI generation + many DB operations)
2. Neon connection pooling can disconnect long-running transactions
3. Vercel serverless function execution time limits

## Solution Applied
1. **Moved AI generation outside transaction** - AI generation now happens BEFORE the transaction starts
2. **Added transaction timeout** - Set to 30 seconds
3. **Optimized transaction** - Reduced queries, use batch operations where possible
4. **Better error handling** - Catch transaction errors and update status appropriately

## Changes Made
- AI generation (`generateEventRooms`) now runs BEFORE `$transaction`
- Transaction only handles database operations (should be fast)
- Added 30-second timeout to transaction
- Optimized region lookup (single query instead of per-region queries)

## If Issues Persist
If transaction timeouts continue, consider:
1. Breaking transaction into smaller chunks
2. Using sequential operations with manual rollback logic
3. Using Neon's transaction mode settings
4. Reducing the amount of generated content per request
