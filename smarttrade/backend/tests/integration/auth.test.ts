/**
 * Integration tests — Auth routes
 * Uses smarttrade_test DB (set via global-env-setup.ts).
 * Each test block creates its own users and cleans up in afterAll.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { db } from '../../src/utils/db.js';
import { makeAgent, type Agent } from '../helpers/request.helper.js';
import {
  createTestUser,
  cleanupByPrefix,
  loginViaAPI,
  TEST_PASSWORD,
} from '../helpers/auth.helper.js';

// Unique prefix per test run so parallel CI jobs don't collide
const P = `auth-${Date.now()}-`;

let agent: Agent;
let csrf:  string;

beforeAll(async () => {
  ({ agent, csrf } = await makeAgent());
});

afterAll(async () => {
  await cleanupByPrefix(P);
});

// ─── POST /api/v1/auth/register ───────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('returns 201 on valid registration data', async () => {
    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({
        email:     `${P}new@example.com`,
        password:  'StrongPass@99',
        full_name: 'New User',
        phone:     '+2348012345678',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBeDefined();
  });

  it('returns 409 when email is already registered', async () => {
    await createTestUser(`${P}dup@example.com`);

    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({
        email:     `${P}dup@example.com`,
        password:  'StrongPass@99',
        full_name: 'Dup User',
        phone:     '+2348012345679',
      });

    expect(res.status).toBe(409);
  });

  it('returns 422 on invalid email format', async () => {
    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({ email: 'not-an-email', password: 'StrongPass@99', full_name: 'X', phone: '+2348012345678' });

    expect(res.status).toBe(422);
  });

  it('returns 422 when password has no special character', async () => {
    const res = await agent
      .post('/api/v1/auth/register')
      .set('X-CSRF-Token', csrf)
      .send({
        email:     `${P}weakpw@example.com`,
        password:  'WeakPassword1',   // no special char
        full_name: 'Weak User',
        phone:     '+2348012345678',
      });

    expect(res.status).toBe(422);
  });
});

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    await createTestUser(`${P}login@example.com`);
    await db.user.create({
      data: {
        email:         `${P}unverified@example.com`,
        password_hash: 'x',
        full_name:     'Unverified',
        is_verified:   false,
      },
    });
  });

  it('returns 200 + accessToken + refreshToken cookie on valid credentials', async () => {
    const { status, accessToken, refreshCookie } = await loginViaAPI(
      agent, csrf, `${P}login@example.com`,
    );

    expect(status).toBe(200);
    expect(accessToken).toBeTruthy();
    expect(refreshCookie).toContain('refreshToken=');
  });

  it('returns 401 on wrong password', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: `${P}login@example.com`, password: 'WrongPassword@1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 403 when email is not verified', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: `${P}unverified@example.com`, password: 'any' });

    expect(res.status).toBe(403);
  });

  it('returns 423 after 5 failed attempts lock the account', async () => {
    await createTestUser(`${P}lockme@example.com`);

    // Use a fresh agent with its own unique IP so the rate-limit counter
    // for this test starts at 0, independent of prior tests in this file.
    const { agent: lockAgent, csrf: lockCsrf } = await makeAgent();

    // Trigger 5 failures to set locked_until
    for (let i = 0; i < 5; i++) {
      await lockAgent
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', lockCsrf)
        .send({ email: `${P}lockme@example.com`, password: 'WrongPass@1' });
    }

    // 6th attempt — account now locked
    const res = await lockAgent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', lockCsrf)
      .send({ email: `${P}lockme@example.com`, password: 'WrongPass@1' });

    expect(res.status).toBe(423);
  });
});

// ─── POST /api/v1/auth/refresh ────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('returns 200 + new accessToken using a valid refresh cookie', async () => {
    await createTestUser(`${P}refresh@example.com`);
    const { refreshCookie } = await loginViaAPI(agent, csrf, `${P}refresh@example.com`);

    // Send refresh with the cookie already attached to the agent
    const res = await agent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', csrf)
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect((res.body as { data?: { accessToken?: string } }).data?.accessToken).toBeTruthy();
  });

  it('returns 401 when no refresh cookie is present', async () => {
    const { agent: freshAgent, csrf: freshCsrf } = await makeAgent();
    const res = await freshAgent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', freshCsrf);

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('returns 200 and subsequent refresh returns 401', async () => {
    await createTestUser(`${P}logout@example.com`);

    // Use a single agent+csrf pair throughout this test
    const { agent: loginAgent, csrf: agentCsrf } = await makeAgent();
    const loginResult = await loginViaAPI(loginAgent, agentCsrf, `${P}logout@example.com`);

    // Logout
    const logoutRes = await loginAgent
      .post('/api/v1/auth/logout')
      .set('X-CSRF-Token', agentCsrf)
      .set('Authorization', `Bearer ${loginResult.accessToken}`);

    expect(logoutRes.status).toBe(200);

    // Refresh after logout should fail — token revoked
    const refreshRes = await loginAgent
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', agentCsrf);

    expect(refreshRes.status).toBe(401);
  });
});
