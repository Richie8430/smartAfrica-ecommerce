import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db.js';
import * as tokenStore from '../utils/token.store.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError } from '../utils/errors.js';
import {
  queueOTPEmail,
  queuePasswordResetEmail,
  queueNewDeviceAlertEmail,
} from '../queues/email.queue.js';

// ─── Password rules (mirrors registerSchema + used for resetPassword) ─────────
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;

function assertPasswordStrength(password: string): void {
  if (!PASSWORD_RE.test(password)) {
    throw new AppError(
      400,
      'Password must be ≥8 characters and include an uppercase letter, a number, and a special character.',
    );
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerUser(data: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}) {
  const email = data.email.trim().toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new AppError(409, 'Email already registered');

  const password_hash = await bcrypt.hash(data.password, 12);

  const user = await db.user.create({
    data: {
      email,
      password_hash,
      full_name: data.full_name,
      phone: data.phone ?? null,
    },
  });

  const otp = crypto.randomInt(100_000, 999_999).toString();
  await tokenStore.setOTP(user.user_id, otp, 900);

  // Queue OTP email (fire-and-forget — don't block registration response)
  void queueOTPEmail(email, otp);

  return { userId: user.user_id, otp };
}

// ─── Verify email ─────────────────────────────────────────────────────────────

export async function verifyEmail(userId: string, otp: string) {
  const stored = await tokenStore.getOTP(userId);
  if (!stored || stored !== otp) throw new AppError(400, 'Invalid or expired OTP');

  await tokenStore.deleteOTP(userId);

  const user = await db.user.update({
    where:  { user_id: userId },
    data:   { is_verified: true },
    select: { user_id: true, email: true, full_name: true, role: true },
  });

  return user;
}

// ─── Resend OTP ───────────────────────────────────────────────────────────────

export async function resendOTP(userId: string) {
  const count = await tokenStore.incrementResendCount(userId);
  if (count > 3) throw new AppError(429, 'Too many OTP requests — wait before requesting a new code');

  const user = await db.user.findUnique({ where: { user_id: userId }, select: { email: true } });

  const otp = crypto.randomInt(100_000, 999_999).toString();
  await tokenStore.setOTP(userId, otp, 900);

  if (user) void queueOTPEmail(user.email, otp);

  return { otp };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string,
  ip: string,
  userAgent: string,
) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  // Same message for non-existent user AND wrong password — prevents enumeration.
  if (!user) throw new AppError(401, 'Invalid credentials');

  if (!user.is_verified) throw new AppError(403, 'Please verify your email first');

  if (user.locked_until && user.locked_until > new Date()) {
    throw new AppError(423, `Account locked. Try again after ${user.locked_until.toISOString()}`);
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);

  if (!passwordOk) {
    const newAttempts = user.failed_attempts + 1;
    const isLockThreshold = newAttempts >= 5;

    await db.user.update({
      where: { user_id: user.user_id },
      data:  isLockThreshold
        ? { failed_attempts: 0, locked_until: new Date(Date.now() + 30 * 60 * 1000) }
        : { failed_attempts: newAttempts },
    });

    writeAuditLog({ userId: user.user_id, action: 'LOGIN_FAIL', ip, userAgent });
    throw new AppError(401, 'Invalid credentials');
  }

  // ─── Success path ──────────────────────────────────────────────────────────
  await db.user.update({
    where: { user_id: user.user_id },
    data:  { failed_attempts: 0, locked_until: null },
  });

  const tokenId     = uuidv4();
  const accessToken = signAccessToken({ userId: user.user_id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.user_id, tokenId });

  // Refresh token lives 7 days (604 800 s)
  await tokenStore.setRefreshToken(user.user_id, tokenId, refreshToken, 604_800);

  writeAuditLog({ userId: user.user_id, action: 'LOGIN_SUCCESS', ip, userAgent });

  // ─── New device alert ──────────────────────────────────────────────────────
  const fingerprint = crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');

  const existingDevice = await db.device.findUnique({
    where: { user_id_device_fingerprint_hash: { user_id: user.user_id, device_fingerprint_hash: fingerprint } },
  });

  await db.device.upsert({
    where:  { user_id_device_fingerprint_hash: { user_id: user.user_id, device_fingerprint_hash: fingerprint } },
    create: { user_id: user.user_id, device_fingerprint_hash: fingerprint, user_agent: userAgent },
    update: { trusted_at: new Date() },
  });

  if (!existingDevice) {
    void queueNewDeviceAlertEmail(user.email, {
      ip,
      userAgent,
      timestamp: new Date().toUTCString(),
    });
  }

  return {
    accessToken,
    refreshToken,
    user: {
      userId:            user.user_id,
      email:             user.email,
      full_name:         user.full_name,
      role:              user.role,
      biometric_enrolled: user.biometric_enrolled,
    },
  };
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutUser(
  userId: string,
  tokenId: string,
  ip?: string,
  userAgent?: string,
) {
  await tokenStore.deleteRefreshToken(userId, tokenId);
  writeAuditLog({ userId, action: 'LOGOUT', ip, userAgent });
}

// ─── Refresh tokens ───────────────────────────────────────────────────────────

export async function refreshTokens(refreshToken: string) {
  let payload: { userId: string; tokenId: string };

  try {
    payload = verifyToken<{ userId: string; tokenId: string }>(refreshToken);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const { userId, tokenId } = payload;

  // Revocation check — token must still be in Redis.
  const stored = await tokenStore.getRefreshToken(userId, tokenId);
  if (!stored) throw new AppError(401, 'Refresh token revoked or expired');

  // Delete old token (rotation)
  await tokenStore.deleteRefreshToken(userId, tokenId);

  const user = await db.user.findUnique({
    where:  { user_id: userId },
    select: { user_id: true, email: true, role: true },
  });
  if (!user) throw new AppError(401, 'User not found');

  const newTokenId      = uuidv4();
  const newAccessToken  = signAccessToken({ userId: user.user_id, email: user.email, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: user.user_id, tokenId: newTokenId });

  await tokenStore.setRefreshToken(user.user_id, newTokenId, newRefreshToken, 604_800);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ─── Forgot password ──────────────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });

  // Always return success — prevents email enumeration.
  if (!user) return { sent: true };

  const token    = crypto.randomBytes(32).toString('hex');
  const hash     = crypto.createHash('sha256').update(token).digest('hex');
  const APP_URL  = process.env['APP_URL'] ?? 'http://localhost:5173';
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  await tokenStore.setResetToken(hash, user.user_id, 3600);

  void queuePasswordResetEmail(normalizedEmail, resetUrl);

  return { token };
}

// ─── Reset password ───────────────────────────────────────────────────────────

export async function resetPassword(token: string, newPassword: string) {
  assertPasswordStrength(newPassword);

  const hash   = crypto.createHash('sha256').update(token).digest('hex');
  const userId = await tokenStore.getResetToken(hash);
  if (!userId) throw new AppError(400, 'Invalid or expired reset token');

  const password_hash = await bcrypt.hash(newPassword, 12);

  await db.user.update({
    where: { user_id: userId },
    data:  { password_hash },
  });

  await tokenStore.deleteResetToken(hash);
  await tokenStore.deleteAllUserRefreshTokens(userId);

  writeAuditLog({ userId, action: 'PASSWORD_RESET' });
}
