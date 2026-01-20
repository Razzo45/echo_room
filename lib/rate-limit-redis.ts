/**
 * Production-ready rate limiting with Redis fallback
 * Falls back to in-memory if Redis is not available
 */

import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

// Initialize Redis client if REDIS_URL is provided
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
      redisClient = null; // Fallback to in-memory
    });
  } catch (error) {
    console.warn('Redis initialization failed, using in-memory rate limiting:', error);
    redisClient = null;
  }
}

// In-memory fallback (same as original rate-limit.ts)
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit with Redis (production) or in-memory (fallback)
 */
export async function rateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): Promise<boolean> {
  if (redisClient) {
    return await rateLimitRedis(identifier, maxAttempts, windowMs);
  } else {
    return rateLimitMemory(identifier, maxAttempts, windowMs);
  }
}

/**
 * Redis-based rate limiting
 */
async function rateLimitRedis(
  identifier: string,
  maxAttempts: number,
  windowMs: number
): Promise<boolean> {
  if (!redisClient) return rateLimitMemory(identifier, maxAttempts, windowMs);

  const key = `ratelimit:${identifier}`;
  const now = Date.now();

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redisClient.pipeline();
    pipeline.incr(key);
    pipeline.pexpire(key, windowMs);

    const results = await pipeline.exec();
    if (!results) return false;

    const count = results[0][1] as number;
    return count <= maxAttempts;
  } catch (error) {
    console.error('Redis rate limit error:', error);
    // Fallback to memory
    return rateLimitMemory(identifier, maxAttempts, windowMs);
  }
}

/**
 * In-memory rate limiting (fallback)
 */
function rateLimitMemory(
  identifier: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}

export function getRateLimitKey(type: string, identifier: string): string {
  return `${type}:${identifier}`;
}
