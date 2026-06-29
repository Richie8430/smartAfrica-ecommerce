/**
 * Unit tests for webauthn.service.ts
 * @simplewebauthn/server, db, Redis-backed token store, jwt, and uuid are all mocked.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions:   jest.fn(),
  verifyRegistrationResponse:    jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse:  jest.fn(),
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

// webauthn.service.ts imports `* as tokenStore` — this is the Redis-backed
// single-use challenge store (utils/token.store.ts), which itself wraps redisClient.
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
  getAuthenticationOptions,
  verifyAuthentication,
  revokeCredential,
} from '../../src/services/webauthn.service.js';

import { db }          from '../../src/utils/db.js';
import * as tokenStore from '../../src/utils/token.store.js';
import { writeAuditLog } from '../../src/utils/audit.js';
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
const auditLog$ = writeAuditLog as unknown as AnyMock;

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
  it('test 1: calls generateRegistrationOptions with correct rpName, rpID, userName', async () => {
    db$.webAuthnCredential['findMany'].mockResolvedValue([]);
    wauthn$['generateRegistrationOptions'].mockResolvedValue(MOCK_OPTIONS);
    ts$['setChallenge'].mockResolvedValue(undefined);

    await getRegistrationOptions('user-111', 'Alice', 'alice@example.com');

    expect(wauthn$['generateRegistrationOptions']).toHaveBeenCalledWith(
      expect.objectContaining({
        rpName:   expect.any(String),
        rpID:     expect.any(String),
        userName: 'alice@example.com',
      }),
    );
  });

  it('test 2: stores challenge in Redis with 300 second TTL', async () => {
    db$.webAuthnCredential['findMany'].mockResolvedValue([]);
    wauthn$['generateRegistrationOptions'].mockResolvedValue(MOCK_OPTIONS);
    ts$['setChallenge'].mockResolvedValue(undefined);

    await getRegistrationOptions('user-111', 'Alice', 'alice@example.com');

    expect(ts$['setChallenge']).toHaveBeenCalledWith('user-111', MOCK_OPTIONS.challenge, 300);
  });

  it('test 3: passes existing credentials as excludeCredentials', async () => {
    db$.webAuthnCredential['findMany'].mockResolvedValue([
      { credential_id: 'existing-cred-1' },
      { credential_id: 'existing-cred-2' },
    ]);
    wauthn$['generateRegistrationOptions'].mockResolvedValue(MOCK_OPTIONS);
    ts$['setChallenge'].mockResolvedValue(undefined);

    await getRegistrationOptions('user-111', 'Alice', 'alice@example.com');

    expect(wauthn$['generateRegistrationOptions']).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeCredentials: [
          { id: 'existing-cred-1', type: 'public-key' },
          { id: 'existing-cred-2', type: 'public-key' },
        ],
      }),
    );
  });
});

// ─── verifyRegistration ───────────────────────────────────────────────────────

describe('verifyRegistration', () => {
  it('test 4: throws 400 if Redis challenge is null (expired)', async () => {
    ts$['getChallenge'].mockResolvedValue(null);

    await expect(verifyRegistration('user-111', {} as never)).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('Challenge expired'),
    });
  });

  it('test 5: reads the challenge via a single-use getChallenge call (deleted after reading)', async () => {
    ts$['getChallenge'].mockResolvedValue('stored-challenge');
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

    await verifyRegistration('user-111', { response: { transports: ['internal'] } } as never);

    // tokenStore.getChallenge performs an atomic GET+DEL internally (single-use) —
    // the service must call it exactly once per attempt and never re-read it.
    expect(ts$['getChallenge']).toHaveBeenCalledTimes(1);
    expect(ts$['getChallenge']).toHaveBeenCalledWith('user-111');
  });

  it('test 6: throws 400 if verifyRegistrationResponse returns verified=false', async () => {
    ts$['getChallenge'].mockResolvedValue('stored-challenge');
    wauthn$['verifyRegistrationResponse'].mockResolvedValue({ verified: false });

    await expect(verifyRegistration('user-111', {} as never)).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('verification failed'),
    });
  });

  it('test 7: creates WebAuthnCredential record in DB on success', async () => {
    ts$['getChallenge'].mockResolvedValue('stored-challenge');
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

    await verifyRegistration('user-111', { response: { transports: ['internal'] } } as never);

    expect(db$.webAuthnCredential['create']).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          credential_id: 'new-cred-id',
          user_id:       'user-111',
        }),
      }),
    );
  });

  it('test 8: sets user.biometric_enrolled = true on success', async () => {
    ts$['getChallenge'].mockResolvedValue('stored-challenge');
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

    expect(db$.user['update']).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 'user-111' },
        data:  { biometric_enrolled: true },
      }),
    );
    expect(result).toEqual({ verified: true });
  });

  it('test 9: calls writeAuditLog with action BIOMETRIC_ENROLLED', async () => {
    ts$['getChallenge'].mockResolvedValue('stored-challenge');
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

    await verifyRegistration('user-111', { response: { transports: ['internal'] } } as never);

    expect(auditLog$).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-111', action: 'BIOMETRIC_ENROLLED' }),
    );
  });
});

// ─── getAuthenticationOptions ──────────────────────────────────────────────────

describe('getAuthenticationOptions', () => {
  it('test 10: throws 404 if user not found', async () => {
    db$.user['findUnique'].mockResolvedValue(null);

    await expect(getAuthenticationOptions('nobody@example.com')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('test 11: throws 400 if the account has no enrolled credentials', async () => {
    db$.user['findUnique'].mockResolvedValue({ user_id: 'user-111', biometric_enrolled: false });
    db$.webAuthnCredential['findMany'].mockResolvedValue([]);

    await expect(getAuthenticationOptions('alice@example.com')).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('No fingerprint enrolled'),
    });
  });

  it('test 12: returns options and userId on success', async () => {
    db$.user['findUnique'].mockResolvedValue({ user_id: 'user-111', biometric_enrolled: true });
    db$.webAuthnCredential['findMany'].mockResolvedValue([MOCK_CREDENTIAL_DB]);
    wauthn$['generateAuthenticationOptions'].mockResolvedValue(MOCK_OPTIONS);
    ts$['setChallenge'].mockResolvedValue(undefined);

    const result = await getAuthenticationOptions('alice@example.com');

    expect(result).toEqual({ options: MOCK_OPTIONS, userId: 'user-111' });
    expect(ts$['setChallenge']).toHaveBeenCalledWith('user-111', MOCK_OPTIONS.challenge, 300);
  });
});

// ─── verifyAuthentication ─────────────────────────────────────────────────────

describe('verifyAuthentication', () => {
  it('test 13: throws 400 if Redis challenge is null (expired)', async () => {
    ts$['getChallenge'].mockResolvedValue(null);

    await expect(
      verifyAuthentication('user-111', { id: 'cred-abc123' } as never),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Challenge expired') });
  });

  it('test 14: throws 401 if credential not found for this user', async () => {
    ts$['getChallenge'].mockResolvedValue('challenge');
    db$.webAuthnCredential['findUnique'].mockResolvedValue(null);

    await expect(
      verifyAuthentication('user-111', { id: 'nonexistent-cred' } as never),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('test 14b: throws 401 if the credential belongs to a different user', async () => {
    ts$['getChallenge'].mockResolvedValue('challenge');
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      ...MOCK_CREDENTIAL_DB,
      user_id: 'different-user',
    });

    await expect(
      verifyAuthentication('user-111', { id: 'cred-abc123' } as never),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('test 15: throws 401 if verifyAuthenticationResponse returns verified=false', async () => {
    ts$['getChallenge'].mockResolvedValue('challenge');
    db$.webAuthnCredential['findUnique'].mockResolvedValue(MOCK_CREDENTIAL_DB);
    wauthn$['verifyAuthenticationResponse'].mockResolvedValue({ verified: false });

    await expect(
      verifyAuthentication('user-111', { id: 'cred-abc123' } as never),
    ).rejects.toMatchObject({ statusCode: 401, message: expect.stringContaining('failed') });
  });

  it('test 16 [CRITICAL]: throws 401 "Replay detected" if newCounter <= current sign_count', async () => {
    ts$['getChallenge'].mockResolvedValue('challenge');
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      ...MOCK_CREDENTIAL_DB,
      sign_count: BigInt(5),
    });
    wauthn$['verifyAuthenticationResponse'].mockResolvedValue({
      verified:           true,
      authenticationInfo: { newCounter: 5 }, // not greater than current sign_count (5) — replay
    });

    await expect(
      verifyAuthentication('user-111', { id: 'cred-abc123' } as never),
    ).rejects.toMatchObject({ statusCode: 401, message: expect.stringContaining('Replay') });

    // Also confirm a strictly-lower counter is rejected the same way.
    wauthn$['verifyAuthenticationResponse'].mockResolvedValue({
      verified:           true,
      authenticationInfo: { newCounter: 3 }, // 3 < 5 — replay
    });
    await expect(
      verifyAuthentication('user-111', { id: 'cred-abc123' } as never),
    ).rejects.toMatchObject({ statusCode: 401, message: expect.stringContaining('Replay') });
  });

  it('test 17: updates sign_count in DB with the new counter value on success', async () => {
    ts$['getChallenge'].mockResolvedValue('challenge');
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      ...MOCK_CREDENTIAL_DB,
      sign_count: BigInt(3),
    });
    wauthn$['verifyAuthenticationResponse'].mockResolvedValue({
      verified:           true,
      authenticationInfo: { newCounter: 4 },
    });
    db$.webAuthnCredential['update'].mockResolvedValue({});
    db$.device['upsert'].mockResolvedValue({});
    ts$['setRefreshToken'].mockResolvedValue(undefined);

    await verifyAuthentication('user-111', { id: 'cred-abc123' } as never);

    expect(db$.webAuthnCredential['update']).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { credential_id: 'cred-abc123' },
        data:  { sign_count: BigInt(4) },
      }),
    );
  });

  it('test 18: issues accessToken and refreshToken on success', async () => {
    ts$['getChallenge'].mockResolvedValue('challenge');
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      ...MOCK_CREDENTIAL_DB,
      sign_count: BigInt(3),
    });
    wauthn$['verifyAuthenticationResponse'].mockResolvedValue({
      verified:           true,
      authenticationInfo: { newCounter: 4 },
    });
    db$.webAuthnCredential['update'].mockResolvedValue({});
    db$.device['upsert'].mockResolvedValue({});
    ts$['setRefreshToken'].mockResolvedValue(undefined);

    const result = await verifyAuthentication('user-111', { id: 'cred-abc123' } as never);

    expect(result.accessToken).toBe('mock.access.token');
    expect(result.refreshToken).toBe('mock.refresh.token');
    expect(result.user.email).toBe('alice@example.com');
  });

  it('test 19: calls writeAuditLog with action BIOMETRIC_LOGIN', async () => {
    ts$['getChallenge'].mockResolvedValue('challenge');
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      ...MOCK_CREDENTIAL_DB,
      sign_count: BigInt(3),
    });
    wauthn$['verifyAuthenticationResponse'].mockResolvedValue({
      verified:           true,
      authenticationInfo: { newCounter: 4 },
    });
    db$.webAuthnCredential['update'].mockResolvedValue({});
    db$.device['upsert'].mockResolvedValue({});
    ts$['setRefreshToken'].mockResolvedValue(undefined);

    await verifyAuthentication('user-111', { id: 'cred-abc123' } as never);

    expect(auditLog$).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-111', action: 'BIOMETRIC_LOGIN' }),
    );
  });
});

// ─── revokeCredential ────────────────────────────────────────────────────────

describe('revokeCredential', () => {
  it('test 20: throws 403 if credential.user_id does not match the requesting userId', async () => {
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      credential_id: 'cred-abc123',
      user_id:       'someone-else',
    });

    await expect(revokeCredential('cred-abc123', 'user-111')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('test 21: deletes the credential from the DB', async () => {
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      credential_id: 'cred-abc123',
      user_id:       'user-111',
    });
    db$.webAuthnCredential['delete'].mockResolvedValue({});
    db$.webAuthnCredential['count'].mockResolvedValue(0);
    db$.user['update'].mockResolvedValue({});

    await revokeCredential('cred-abc123', 'user-111');

    expect(db$.webAuthnCredential['delete']).toHaveBeenCalledWith({
      where: { credential_id: 'cred-abc123' },
    });
  });

  it('test 22: sets biometric_enrolled=false if no remaining credentials', async () => {
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

  it('test 23: does NOT set biometric_enrolled=false when other credentials remain', async () => {
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      credential_id: 'cred-abc123',
      user_id:       'user-111',
    });
    db$.webAuthnCredential['delete'].mockResolvedValue({});
    db$.webAuthnCredential['count'].mockResolvedValue(1); // still has one left

    await revokeCredential('cred-abc123', 'user-111');

    expect(db$.user['update']).not.toHaveBeenCalled();
  });

  it('test 24: calls writeAuditLog with action BIOMETRIC_REVOKED', async () => {
    db$.webAuthnCredential['findUnique'].mockResolvedValue({
      credential_id: 'cred-abc123',
      user_id:       'user-111',
    });
    db$.webAuthnCredential['delete'].mockResolvedValue({});
    db$.webAuthnCredential['count'].mockResolvedValue(0);
    db$.user['update'].mockResolvedValue({});

    await revokeCredential('cred-abc123', 'user-111');

    expect(auditLog$).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-111', action: 'BIOMETRIC_REVOKED' }),
    );
  });
});
