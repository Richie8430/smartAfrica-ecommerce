/**
 * Integration-test auth helpers.
 * All DB operations go to smarttrade_test (set by global-env-setup.ts).
 */

import bcrypt from 'bcryptjs';
import { db }           from '../../src/utils/db.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import type { Agent }   from './request.helper.js';

export const TEST_PASSWORD = 'Integration@1'; // valid strong password

/**
 * Create a verified user directly in the DB (bypasses email OTP flow).
 * Uses cost-10 bcrypt to keep tests fast.
 */
export async function createTestUser(
  email:     string,
  full_name: string = 'Test User',
  role:      'CUSTOMER' | 'ADMIN' = 'CUSTOMER',
) {
  const password_hash = await bcrypt.hash(TEST_PASSWORD, 10);
  return db.user.create({
    data: { email, password_hash, full_name, is_verified: true, role },
  });
}

/**
 * POST /api/v1/auth/login via supertest agent.
 * Returns { accessToken, refreshCookie }.
 */
export async function loginViaAPI(
  agent:    Agent,
  csrf:     string,
  email:    string,
  password: string = TEST_PASSWORD,
) {
  const res = await agent
    .post('/api/v1/auth/login')
    .set('X-CSRF-Token', csrf)
    .send({ email, password });

  const setCookie  = (res.headers['set-cookie'] as string[] | undefined) ?? [];
  const refreshCookie = setCookie.find((c) => c.startsWith('refreshToken=')) ?? '';

  return {
    status:       res.status,
    accessToken:  (res.body as { data?: { accessToken?: string } }).data?.accessToken ?? '',
    refreshCookie,
  };
}

/**
 * Sign an admin access token directly (no HTTP round-trip).
 * Useful for routes that only need Bearer auth, not the refresh flow.
 */
export async function createAdminToken(email: string): Promise<string> {
  const user = await createTestUser(email, 'Admin User', 'ADMIN');
  return signAccessToken({ userId: user.user_id, email: user.email, role: 'ADMIN' });
}

/** Delete a user (and all CASCADE-linked records) by email. */
export async function cleanupUser(email: string): Promise<void> {
  await db.user.deleteMany({ where: { email } });
}

/** Delete all users whose email starts with a given prefix. */
export async function cleanupByPrefix(prefix: string): Promise<void> {
  await db.user.deleteMany({ where: { email: { startsWith: prefix } } });
}
