/**
 * Unit tests for auth.service.ts
 * All external I/O is mocked — no real DB, Redis, or network calls.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Module mocks ─────────────────────────────────────────────────────────────
// jest.mock() is hoisted by ts-jest's babel transform before imports.

jest.mock('../../src/utils/db.js', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
    },
    device: {
      findUnique: jest.fn(),
      upsert:     jest.fn(),
    },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('../../src/queues/email.queue.js', () => ({
  // mockResolvedValue inside a factory resolves to `never` due to jest-mock's
  // ResolveType<UnknownFunction> = never.  Plain jest.fn() returns undefined
  // which is fine for fire-and-forget queue calls.
  queueOTPEmail:            jest.fn(),
  queuePasswordResetEmail:  jest.fn(),
  queueNewDeviceAlertEmail: jest.fn(),
}));

jest.mock('../../src/utils/token.store.js', () => ({
  setOTP:                    jest.fn(),
  getOTP:                    jest.fn(),
  deleteOTP:                 jest.fn(),
  incrementResendCount:      jest.fn(),
  setRefreshToken:           jest.fn(),
  getRefreshToken:           jest.fn(),
  deleteRefreshToken:        jest.fn(),
  deleteAllUserRefreshTokens: jest.fn(),
  setResetToken:             jest.fn(),
  getResetToken:             jest.fn(),
  deleteResetToken:          jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash:    jest.fn(),
  compare: jest.fn(),
  default: { hash: jest.fn(), compare: jest.fn() },
}));

jest.mock('../../src/utils/jwt.js', () => ({
  signAccessToken:  jest.fn().mockReturnValue('mock.access.token'),
  signRefreshToken: jest.fn().mockReturnValue('mock.refresh.token'),
  verifyToken:      jest.fn(),
  TokenExpiredError: class TokenExpiredError extends Error {},
  JsonWebTokenError: class JsonWebTokenError extends Error {},
}));

jest.mock('../../src/utils/audit.js', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('mock-token-id') }));

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  registerUser,
  loginUser,
  resetPassword,
} from '../../src/services/auth.service.js';

import { db }          from '../../src/utils/db.js';
import * as tokenStore from '../../src/utils/token.store.js';
import bcrypt          from 'bcryptjs';

// ─── Typed accessors (cast to jest.Mock via unknown to satisfy strict TS) ─────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<(...args: any[]) => any>;

const user$ = {
  findUnique: (db.user as unknown as Record<string, AnyMock>)['findUnique'],
  create:     (db.user as unknown as Record<string, AnyMock>)['create'],
  update:     (db.user as unknown as Record<string, AnyMock>)['update'],
};

const ts$ = tokenStore as unknown as Record<string, AnyMock>;
const bc$ = bcrypt     as unknown as Record<string, AnyMock>;

// ─── Shared fixture ───────────────────────────────────────────────────────────

const BASE_USER = {
  user_id:            'user-abc-123',
  email:              'alice@example.com',
  password_hash:      '$2b$12$realhashedpassword',
  full_name:          'Alice Smith',
  phone:              null,
  role:               'CUSTOMER' as const,
  is_verified:        true,
  biometric_enrolled: false,
  failed_attempts:    0,
  locked_until:       null,
  created_at:         new Date('2024-01-01'),
  updated_at:         new Date('2024-01-01'),
};

beforeEach(() => { jest.clearAllMocks(); });

// ─── registerUser ─────────────────────────────────────────────────────────────

describe('registerUser', () => {
  it('creates a user and returns a 6-digit OTP on success', async () => {
    user$.findUnique.mockResolvedValue(null);
    user$.create.mockResolvedValue({ ...BASE_USER, is_verified: false });
    bc$['hash'].mockResolvedValue('$2b$12$hashed');
    ts$['setOTP'].mockResolvedValue(undefined);

    const result = await registerUser({
      email: 'alice@example.com', password: 'SecurePass@1', full_name: 'Alice Smith',
    });

    expect(user$.findUnique).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } });
    expect(bc$['hash']).toHaveBeenCalledWith('SecurePass@1', 12);
    expect(ts$['setOTP']).toHaveBeenCalledWith(
      BASE_USER.user_id, expect.stringMatching(/^\d{6}$/), 900,
    );
    expect(result.userId).toBe(BASE_USER.user_id);
    expect(result.otp).toMatch(/^\d{6}$/);
  });

  it('throws 409 when email is already registered', async () => {
    user$.findUnique.mockResolvedValue(BASE_USER);

    await expect(
      registerUser({ email: 'alice@example.com', password: 'SecurePass@1', full_name: 'Alice' }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'Email already registered' });
  });
});

// ─── loginUser ────────────────────────────────────────────────────────────────

describe('loginUser', () => {
  it('returns accessToken, refreshToken, and user on valid credentials', async () => {
    user$.findUnique.mockResolvedValue(BASE_USER);
    bc$['compare'].mockResolvedValue(true);
    user$.update.mockResolvedValue(BASE_USER);
    ts$['setRefreshToken'].mockResolvedValue(undefined);
    // New device detection — findUnique returns null (first login from this device)
    (db.device as unknown as Record<string, AnyMock>)['findUnique'].mockResolvedValue(null);
    (db.device as unknown as Record<string, AnyMock>)['upsert'].mockResolvedValue({});

    const result = await loginUser('alice@example.com', 'SecurePass@1', '127.0.0.1', 'jest');

    expect(result.accessToken).toBe('mock.access.token');
    expect(result.refreshToken).toBe('mock.refresh.token');
    expect(result.user.email).toBe('alice@example.com');
    expect(ts$['setRefreshToken']).toHaveBeenCalledWith(
      BASE_USER.user_id, 'mock-token-id', 'mock.refresh.token', 604_800,
    );
  });

  it('increments failed_attempts in DB on wrong password', async () => {
    user$.findUnique.mockResolvedValue({ ...BASE_USER, failed_attempts: 1 });
    bc$['compare'].mockResolvedValue(false);
    user$.update.mockResolvedValue({});

    await expect(
      loginUser('alice@example.com', 'WrongPass!1', '127.0.0.1', 'jest'),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(user$.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ failed_attempts: 2 }) }),
    );
  });

  it('locks account and resets counter to 0 on the 5th wrong password', async () => {
    user$.findUnique.mockResolvedValue({ ...BASE_USER, failed_attempts: 4 });
    bc$['compare'].mockResolvedValue(false);
    user$.update.mockResolvedValue({});

    await expect(
      loginUser('alice@example.com', 'WrongPass!1', '127.0.0.1', 'jest'),
    ).rejects.toMatchObject({ statusCode: 401 });

    const [[call]] = user$.update.mock.calls as [[{ data: Record<string, unknown> }]];
    expect(call.data['failed_attempts']).toBe(0);
    expect(call.data['locked_until']).toBeInstanceOf(Date);
  });

  it('throws 423 when account is currently locked', async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
    user$.findUnique.mockResolvedValue({ ...BASE_USER, locked_until: lockedUntil });

    await expect(
      loginUser('alice@example.com', 'SecurePass@1', '127.0.0.1', 'jest'),
    ).rejects.toMatchObject({ statusCode: 423, message: expect.stringContaining('Account locked') });
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe('resetPassword', () => {
  it('updates password and flushes all refresh tokens on a valid token', async () => {
    ts$['getResetToken'].mockResolvedValue(BASE_USER.user_id);
    bc$['hash'].mockResolvedValue('$2b$12$newhash');
    user$.update.mockResolvedValue({});
    ts$['deleteResetToken'].mockResolvedValue(undefined);
    ts$['deleteAllUserRefreshTokens'].mockResolvedValue(2);

    await resetPassword('valid-plain-token', 'NewSecure@1');

    expect(user$.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password_hash: '$2b$12$newhash' }) }),
    );
    expect(ts$['deleteResetToken']).toHaveBeenCalled();
    expect(ts$['deleteAllUserRefreshTokens']).toHaveBeenCalledWith(BASE_USER.user_id);
  });

  it('throws 400 when the reset token is invalid or expired', async () => {
    ts$['getResetToken'].mockResolvedValue(null);

    await expect(resetPassword('bad-token', 'NewSecure@1')).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('Invalid or expired reset token'),
    });

    expect(user$.update).not.toHaveBeenCalled();
  });
});
