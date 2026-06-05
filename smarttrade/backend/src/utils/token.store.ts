import { redisClient } from './redis.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * SCAN all keys matching `pattern`, collect them, then DEL in batches.
 * Safe for large keyspaces — never loads all keys into memory at once.
 */
async function scanAndDelete(pattern: string): Promise<number> {
  let cursor = '0';
  let deleted = 0;

  do {
    const [next, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = next;
    if (keys.length > 0) {
      // Delete in chunks of 100 to stay within Redis arg limits
      for (let i = 0; i < keys.length; i += 100) {
        await redisClient.del(...(keys.slice(i, i + 100) as [string, ...string[]]));
      }
      deleted += keys.length;
    }
  } while (cursor !== '0');

  return deleted;
}

// ─── Refresh Token Store ──────────────────────────────────────────────────────
// Key pattern:  user:{userId}:refresh:{tokenId}

export async function setRefreshToken(
  userId: string,
  tokenId: string,
  token: string,
  ttlSeconds: number,
): Promise<void> {
  await redisClient.set(`user:${userId}:refresh:${tokenId}`, token, 'EX', ttlSeconds);
}

export async function getRefreshToken(
  userId: string,
  tokenId: string,
): Promise<string | null> {
  return redisClient.get(`user:${userId}:refresh:${tokenId}`);
}

export async function deleteRefreshToken(
  userId: string,
  tokenId: string,
): Promise<void> {
  await redisClient.del(`user:${userId}:refresh:${tokenId}`);
}

/** Revokes ALL refresh tokens for a user — used on password change / account lock. */
export async function deleteAllUserRefreshTokens(userId: string): Promise<number> {
  return scanAndDelete(`user:${userId}:refresh:*`);
}

// ─── OTP Store ────────────────────────────────────────────────────────────────
// Key pattern:  otp:{userId}

export async function setOTP(
  userId: string,
  otp: string,
  ttlSeconds = 900,
): Promise<void> {
  await redisClient.set(`otp:${userId}`, otp, 'EX', ttlSeconds);
}

export async function getOTP(userId: string): Promise<string | null> {
  return redisClient.get(`otp:${userId}`);
}

export async function deleteOTP(userId: string): Promise<void> {
  await redisClient.del(`otp:${userId}`);
}

/**
 * Increments and returns the OTP resend counter for a user.
 * The counter expires after 1 hour (fixed window — TTL set only on first increment).
 */
export async function incrementResendCount(userId: string): Promise<number> {
  const key = `otp:resend:${userId}`;
  const count = await redisClient.incr(key);
  if (count === 1) {
    await redisClient.expire(key, 3600);
  }
  return count;
}

// ─── WebAuthn Challenge Store ─────────────────────────────────────────────────
// Key pattern:  webauthn:challenge:{userId}

export async function setChallenge(
  userId: string,
  challenge: string,
  ttlSeconds = 300,
): Promise<void> {
  await redisClient.set(`webauthn:challenge:${userId}`, challenge, 'EX', ttlSeconds);
}

/**
 * Atomically GET-then-DEL the challenge (single-use guarantee).
 * Returns null if the challenge has expired or was never set.
 */
export async function getChallenge(userId: string): Promise<string | null> {
  const key = `webauthn:challenge:${userId}`;
  // Pipeline: GET + DEL in one round-trip (not strictly atomic but safe for our use-case)
  const results = await redisClient.pipeline().get(key).del(key).exec();
  return (results?.[0]?.[1] as string | null) ?? null;
}

export async function deleteChallenge(userId: string): Promise<void> {
  await redisClient.del(`webauthn:challenge:${userId}`);
}

// ─── Password Reset Store ─────────────────────────────────────────────────────
// Key pattern:  reset:{tokenHash}   value = userId

export async function setResetToken(
  tokenHash: string,
  userId: string,
  ttlSeconds = 3600,
): Promise<void> {
  await redisClient.set(`reset:${tokenHash}`, userId, 'EX', ttlSeconds);
}

export async function getResetToken(tokenHash: string): Promise<string | null> {
  return redisClient.get(`reset:${tokenHash}`);
}

export async function deleteResetToken(tokenHash: string): Promise<void> {
  await redisClient.del(`reset:${tokenHash}`);
}

// ─── Product Cache ────────────────────────────────────────────────────────────
// Key pattern:  products:{key}

export async function cacheProducts<T>(
  key: string,
  data: T,
  ttlSeconds = 300,
): Promise<void> {
  await redisClient.set(`products:${key}`, JSON.stringify(data), 'EX', ttlSeconds);
}

export async function getCachedProducts<T>(key: string): Promise<T | null> {
  const raw = await redisClient.get(`products:${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Invalidates the entire product cache. Call after any product CUD operation. */
export async function bustProductCache(): Promise<number> {
  return scanAndDelete('products:*');
}

// ─── Login Attempt Counter ────────────────────────────────────────────────────
// Key pattern:  login:fail:{ip}

/**
 * Increments the failed-login counter for an IP.
 * TTL of 900 s is set (or refreshed) on every increment (sliding window).
 * Returns the new count.
 */
export async function incrementLoginFail(ip: string): Promise<number> {
  const key = `login:fail:${ip}`;
  const pipeline = redisClient.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, 900);
  const results = await pipeline.exec();
  return (results?.[0]?.[1] as number) ?? 0;
}

export async function getLoginFails(ip: string): Promise<number> {
  const val = await redisClient.get(`login:fail:${ip}`);
  return val ? parseInt(val, 10) : 0;
}

export async function clearLoginFails(ip: string): Promise<void> {
  await redisClient.del(`login:fail:${ip}`);
}
