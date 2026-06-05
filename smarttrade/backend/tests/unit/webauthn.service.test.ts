/**
 * Unit tests for webauthn.service.ts
 * @simplewebauthn/server, db, Redis, jwt, and uuid are all mocked.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions:  jest.fn(),
  verifyRegistrationResponse:   jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

jest.mock('../../src/utils/db.js', () => ({
  db: {
    webAuthnCredential: {
      findMany:   jest.fn(),
      create:     jest.fn(),
      findUnique: jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
      count:      jest.fn(),
    },
    user:   { findUnique: jest.fn(), update: jest.fn() },
    device: { upsert: jest.fn() },
  },
}));

jest.mock('../../src/utils/token.store.js', () => ({
  setChallenge:    jest.fn(),
  getChallenge:    jest.fn(),
  setRefreshToken: jest.fn(),
}));

jest.mock('../../src/utils/jwt.js', () => ({
  signAccessToken:  jest.fn().mockReturnValue('mock.access.token'),
  signRefreshToken: jest.fn().mockReturnValue('mock.refresh.token'),
}));

jest.mock('../../src/utils/audit.js', () => ({ writeAuditLog: jest.fn() }));
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('mock-token-id') }));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  getRegistrationOptions,
  verifyRegistration,
  verifyAuthentication,
  revokeCredential,
} from '../../src/services/webauthn.service.js';

import { db }          from '../../src/utils/db.js';
import * as tokenStore from '../../src/utils/token.store.js';
import * as simpleWebAuthn from '@simplewebauthn/server';

// ─── Typed accessors ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<(...args: any[]) => any>;

const wauthn$ = simpleWebAuthn as unknown as Record<string, AnyMock>;

const db$ = db as unknown as {
  webAuthnCredential: Record<string, AnyMock>;
  user:               Record<string, AnyMock>;
  device:             Record<string, AnyMock>;
};

const ts$ = tokenStore as unknown as Record<string, AnyMock>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_OPTIONS = { challenge: 'base64url-challenge', timeout: 60000 };

const MOCK_CREDENTIAL_DB = {
  credential_id: 'cred-abc123',
  user_id:       'user-111',
  public_key:    Buffer.from('mock-public-key').toString('base64'),
  sign_count:    BigInt(3),
  transports:    ['internal'],
  backed_up:     false,
  device_type:   'singleDevice',
  aaguid:        '00000000-0000-0000-0000-000000000000',
  user: {
    user_id:            'user-111',
    email:              'alice@example.com',
    role:               'CUSTOMER' as const,
    full_name:          'Alice',
    biometric_enrolled: true,
  },
};

beforeEach(() => { jest.clearAllMocks(); });

// ─── getRegistrationOptions ───────────────────────────────────────────────────

describe('getRegistrationOptions', () => {
  it('generates options and stores the challenge in Redis', async () => {
    db$.webAuthnCredential['findMany'].mockResolvedValue([]);
    wauthn$['generateRegistrationOptions'].mockResolvedValue(MOCK_OPTIONS);
    ts$['setChallenge'].mockResolvedValue(undefined);

    const result = await getRegistrationOptions('user-111', 'Alice', 'alice@example.com');

    expect(wauthn$['generateRegistrationOptions']).toHaveBeenCalledWith(
      expect.objectContaining({ userName: 'alice@example.com', rpID: expect.any(String) }),
    );
    expect(ts$['setChallenge']).toHaveBeenCalledWith('user-111', MOCK_OPTIONS.challenge, 300);
    expect(result).toBe(MOCK_OPTIONS);
  });
});

// ─── verifyRegistration ───────────────────────────────────────────────────────

describe('verifyRegistration', () => {
  it('throws 400 when the challenge has expired or already been consumed', async () => {
    ts$['getChallenge'].mockResolvedValue(null);

    await expect(verifyRegistration('user-111', {} as never)).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('Challenge expired'),
    });
  });

  it('throws 400 when the authenticator response fails verification', async () => {
    ts$['getChallenge'].mockResolvedValue('stored-challenge');
    wauthn$['verifyRegistrationResponse'].mockResolvedValue({ verified: false });

    await expect(verifyRegistration('user-111', {} as never)).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('verification failed'),
    });
  });

  it('stores credential and marks user biometric_enrolled on success', async () => {
    ts$['getChallenge'].mockResolvedValue('stored-challenge');
    // The installed version uses flat fields (not nested under .credential)
    wauthn$['verifyRegistrationResponse'].mockResolvedValue({
      verified:         true,
      registrationInfo: {
        credentialID:        'new-cred-id',
        credentialPublicKey: new Uint8Array([1, 2, 3]),
        counter:             0,
        credentialDeviceType: 'singleDevice',
        credentialBackedUp:  false,
        aaguid:              '00000000-0000-0000-0000-000000000000',
      },
    });
    db$.webAuthnCredential['create'].mockResolvedValue({});
    db$.device['upsert'].mockResolvedValue({});
    db$.user['update'].mockResolvedValue({});

    const result = await verifyRegistration('user-111', { response: { transports: ['internal'] } } as never);

    expect(db$.webAuthnCredential['create']).toHaveBeenCalled();
    expect(db$.user['update']).toHaveBeenCalledWith(
      expect.objectContaining({ data: { biometric_enrolled: true } }),
    );
    expect(result).toEqual({ verified: true });
  });
});

// ─── verifyAuthentication ─────────────────────────────────────────────────────

describe('verifyAuthentication', () => {
  it('throws 401 "Replay detected" when the counter does not increment', async () => {
    ts$['getChallenge'].mockResolvedValue('challenge');
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      ...MOCK_CREDENTIAL_DB,
      sign_count: BigInt(5),
    });
    wauthn$['verifyAuthenticationResponse'].mockResolvedValue({
      verified:           true,
      // newCounter === sign_count (5) — replay detected
      authenticationInfo: { newCounter: 5 },
    });

    await expect(
      verifyAuthentication('user-111', { id: 'cred-abc123' } as never),
    ).rejects.toMatchObject({ statusCode: 401, message: expect.stringContaining('Replay') });
  });

  it('throws 403 when the credential belongs to a different user', async () => {
    ts$['getChallenge'].mockResolvedValue('challenge');
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      ...MOCK_CREDENTIAL_DB,
      user_id: 'different-user', // does not match 'user-111'
    });

    await expect(
      verifyAuthentication('user-111', { id: 'cred-abc123' } as never),
    ).rejects.toMatchObject({ statusCode: 403, message: expect.stringContaining('not belong') });
  });

  it('issues tokens on a valid authentication with incrementing counter', async () => {
    ts$['getChallenge'].mockResolvedValue('challenge');
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      ...MOCK_CREDENTIAL_DB,
      sign_count: BigInt(3),
    });
    wauthn$['verifyAuthenticationResponse'].mockResolvedValue({
      verified:           true,
      authenticationInfo: { newCounter: 4 },  // 4 > 3 — valid increment
    });
    db$.webAuthnCredential['update'].mockResolvedValue({});
    db$.device['upsert'].mockResolvedValue({});
    ts$['setRefreshToken'].mockResolvedValue(undefined);

    const result = await verifyAuthentication('user-111', { id: 'cred-abc123' } as never);

    expect(result.accessToken).toBe('mock.access.token');
    expect(result.user.email).toBe('alice@example.com');
  });
});

// ─── revokeCredential ────────────────────────────────────────────────────────

describe('revokeCredential', () => {
  it('sets biometric_enrolled=false on user when the last credential is revoked', async () => {
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      credential_id: 'cred-abc123',
      user_id:       'user-111',
    });
    db$.webAuthnCredential['delete'].mockResolvedValue({});
    db$.webAuthnCredential['count'].mockResolvedValue(0); // no credentials left
    db$.user['update'].mockResolvedValue({});

    await revokeCredential('cred-abc123', 'user-111');

    expect(db$.user['update']).toHaveBeenCalledWith(
      expect.objectContaining({ data: { biometric_enrolled: false } }),
    );
  });

  it('does NOT reset biometric_enrolled when other credentials remain', async () => {
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      credential_id: 'cred-abc123',
      user_id:       'user-111',
    });
    db$.webAuthnCredential['delete'].mockResolvedValue({});
    db$.webAuthnCredential['count'].mockResolvedValue(1); // still has one left

    await revokeCredential('cred-abc123', 'user-111');

    expect(db$.user['update']).not.toHaveBeenCalled();
  });
});
