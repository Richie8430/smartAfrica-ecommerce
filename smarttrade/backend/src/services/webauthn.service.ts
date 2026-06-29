import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { v4 as uuidv4 } from 'uuid';
import { db }           from '../utils/db.js';
import * as tokenStore  from '../utils/token.store.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError }      from '../utils/errors.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const RP_ID   = process.env['RP_ID']   ?? 'localhost';
const RP_NAME = process.env['RP_NAME'] ?? 'SmartTrade Africa';
const ORIGIN  = process.env['APP_URL'] ?? 'http://localhost:5173';

// ─── Registration ─────────────────────────────────────────────────────────────

export async function getRegistrationOptions(
  userId: string,
  userName: string,
  userEmail: string,
) {
  const existing = await db.webAuthnCredential.findMany({
    where: { user_id: userId },
  });

  const options = await generateRegistrationOptions({
    rpName:          RP_NAME,
    rpID:            RP_ID,
    userName:        userEmail,
    userDisplayName: userName,
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({
      id:   c.credential_id,
      type: 'public-key' as const,
    })),
    authenticatorSelection: {
      residentKey:      'preferred',
      userVerification: 'preferred',
    },
  });

  await tokenStore.setChallenge(userId, options.challenge, 300);

  return options;
}

export async function verifyRegistration(
  userId: string,
  body: RegistrationResponseJSON,
) {
  const challenge = await tokenStore.getChallenge(userId);
  if (!challenge) {
    throw new AppError(400, 'Challenge expired — please try again');
  }

  const { verified, registrationInfo } = await verifyRegistrationResponse({
    response:          body,
    expectedChallenge: challenge,
    expectedOrigin:    ORIGIN,
    expectedRPID:      RP_ID,
  });

  if (!verified || !registrationInfo) {
    throw new AppError(400, 'Biometric registration verification failed');
  }

  // The installed simplewebauthn version returns flat fields (not nested under .credential).
  const {
    credentialID,
    credentialPublicKey,
    counter,
    credentialDeviceType,
    credentialBackedUp,
    aaguid,
  } = registrationInfo;

  const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64');
  // Transports are on the raw attestation body, not in registrationInfo for this version.
  const transports = (body.response.transports ?? []) as string[];

  await db.webAuthnCredential.create({
    data: {
      credential_id: credentialID,
      user_id:       userId,
      public_key:    publicKeyBase64,
      sign_count:    BigInt(counter),
      aaguid:        aaguid ?? null,
      device_type:   credentialDeviceType ?? null,
      backed_up:     credentialBackedUp ?? false,
      transports,
    },
  });

  await db.device.upsert({
    where: {
      user_id_device_fingerprint_hash: {
        user_id:                 userId,
        device_fingerprint_hash: credentialID,
      },
    },
    update: { trusted_at: new Date() },
    create: {
      user_id:                 userId,
      device_fingerprint_hash: credentialID,
      platform:                credentialDeviceType ?? 'webauthn',
      user_agent:              'webauthn-passkey',
    },
  });

  await db.user.update({
    where: { user_id: userId },
    data:  { biometric_enrolled: true },
  });

  writeAuditLog({ userId, action: 'BIOMETRIC_ENROLLED' });

  return { verified: true };
}

// ─── Authentication ───────────────────────────────────────────────────────────

export async function getAuthenticationOptions(email: string) {
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) throw new AppError(404, 'User not found');

  const credentials = await db.webAuthnCredential.findMany({
    where: { user_id: user.user_id },
  });
  if (credentials.length === 0) {
    throw new AppError(400, 'No fingerprint enrolled on this account');
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: credentials.map((c) => ({
      id:         c.credential_id,
      type:       'public-key' as const,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
    userVerification: 'preferred',
  });

  await tokenStore.setChallenge(user.user_id, options.challenge, 300);

  return { options, userId: user.user_id };
}

export async function verifyAuthentication(
  userId: string,
  body: AuthenticationResponseJSON,
) {
  const challenge = await tokenStore.getChallenge(userId);
  if (!challenge) {
    throw new AppError(400, 'Challenge expired — please try again');
  }

  const credential = await db.webAuthnCredential.findUnique({
    where:   { credential_id: body.id },
    include: {
      user: {
        select: {
          user_id:            true,
          email:              true,
          role:               true,
          full_name:          true,
          biometric_enrolled: true,
        },
      },
    },
  });

  // A single generic 401 for both "doesn't exist" and "belongs to someone else" —
  // distinguishing the two via status code would let an attacker probe whether a
  // given credential_id exists at all.
  if (!credential || credential.user_id !== userId) {
    throw new AppError(401, 'Credential not recognised');
  }

  const credentialPublicKey = new Uint8Array(Buffer.from(credential.public_key, 'base64'));

  const { verified, authenticationInfo } = await verifyAuthenticationResponse({
    response:          body,
    expectedChallenge: challenge,
    expectedOrigin:    ORIGIN,
    expectedRPID:      RP_ID,
    // The installed simplewebauthn version uses `authenticator` (not `credential`).
    authenticator: {
      credentialID:        credential.credential_id,
      credentialPublicKey,
      counter:             Number(credential.sign_count),
      transports:          credential.transports as AuthenticatorTransportFuture[],
    },
  });

  if (!verified || !authenticationInfo) {
    throw new AppError(401, 'Biometric authentication failed');
  }

  const { newCounter } = authenticationInfo;

  // Counter must always increment — a stale or equal counter indicates a replay attack.
  if (newCounter <= Number(credential.sign_count)) {
    throw new AppError(401, 'Replay detected — authentication rejected');
  }

  await db.webAuthnCredential.update({
    where: { credential_id: credential.credential_id },
    data:  { sign_count: BigInt(newCounter) },
  });

  await db.device.upsert({
    where: {
      user_id_device_fingerprint_hash: {
        user_id:                 userId,
        device_fingerprint_hash: credential.credential_id,
      },
    },
    update: { trusted_at: new Date() },
    create: {
      user_id:                 userId,
      device_fingerprint_hash: credential.credential_id,
      platform:                'webauthn',
      user_agent:              'webauthn-passkey',
    },
  });

  const { user } = credential;
  const tokenId      = uuidv4();
  const accessToken  = signAccessToken({ userId: user.user_id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.user_id, tokenId });

  await tokenStore.setRefreshToken(user.user_id, tokenId, refreshToken, 604_800);

  writeAuditLog({ userId, action: 'BIOMETRIC_LOGIN' });

  return {
    accessToken,
    refreshToken,
    user: {
      userId:             user.user_id,
      email:              user.email,
      full_name:          user.full_name,
      role:               user.role,
      biometric_enrolled: user.biometric_enrolled,
    },
  };
}

// ─── Credential management ────────────────────────────────────────────────────

export async function revokeCredential(credentialId: string, userId: string) {
  const credential = await db.webAuthnCredential.findUnique({
    where: { credential_id: credentialId },
  });
  if (!credential)                     throw new AppError(404, 'Credential not found');
  if (credential.user_id !== userId)   throw new AppError(403, 'You do not own this credential');

  await db.webAuthnCredential.delete({ where: { credential_id: credentialId } });

  const remaining = await db.webAuthnCredential.count({ where: { user_id: userId } });

  if (remaining === 0) {
    await db.user.update({
      where: { user_id: userId },
      data:  { biometric_enrolled: false },
    });
  }

  writeAuditLog({ userId, action: 'BIOMETRIC_REVOKED', metadata: { credentialId } });
}

export async function listCredentials(userId: string) {
  return db.webAuthnCredential.findMany({
    where:   { user_id: userId },
    select:  {
      credential_id: true,
      device_type:   true,
      created_at:    true,
      transports:    true,
    },
    orderBy: { created_at: 'desc' },
  });
}
