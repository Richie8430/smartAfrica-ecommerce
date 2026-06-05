import { useState } from 'react';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import { webauthnApi } from '@/api/webauthn.api';
import { useAuthStore } from '@/stores/auth.store';
import type { WebAuthnCredential } from '@/types';

export const isWebAuthnSupported =
  typeof window !== 'undefined' &&
  typeof window.PublicKeyCredential !== 'undefined';

interface WebAuthnError {
  name: string;
  message: string;
}

function friendlyError(err: unknown): string {
  const e = err as WebAuthnError;
  if (e?.name === 'NotAllowedError')
    return 'You cancelled the biometric prompt. Try again when ready.';
  if (e?.name === 'NotSupportedError')
    return 'This device does not support biometric authentication.';
  if (e?.name === 'SecurityError')
    return 'Security error — make sure you are on a secure connection (HTTPS).';
  if (e?.name === 'InvalidStateError')
    return 'This passkey is already registered. Try signing in instead.';
  return (e?.message ?? 'Something went wrong with biometric authentication.');
}

export function useWebAuthn() {
  const { user, setAuth, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState<string | null>(null);

  // ─── Enroll / register biometric ────────────────────────────────────────────

  async function enrollBiometric(): Promise<{ success: boolean; error?: string }> {
    if (!user) return { success: false, error: 'Not logged in' };
    setLoading(true);
    setError(null);
    try {
      const { data: challengeRes } = await webauthnApi.getRegistrationChallenge(user.userId);
      if (!challengeRes.data) throw new Error('No challenge received');

      const regResult = await startRegistration(challengeRes.data as never);

      const { data: verifyRes } = await webauthnApi.verifyRegistration(user.userId, regResult);
      if (!verifyRes.data?.verified) throw new Error('Verification failed');

      // Update local user state
      setAuth({ ...user, biometric_enrolled: true }, accessToken!);
      return { success: true };
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  // ─── Login with biometric ────────────────────────────────────────────────────

  async function loginWithBiometric(
    email: string,
  ): Promise<{ success: boolean; error?: string }> {
    setLoading(true);
    setError(null);
    try {
      const { data: challengeRes } = await webauthnApi.getAuthChallenge(email);
      if (!challengeRes.data) throw new Error('No challenge received');

      const { userId, options } = challengeRes.data;
      const authResult = await startAuthentication(options as never);

      const { data: verifyRes } = await webauthnApi.verifyAuthentication(userId, authResult);
      if (!verifyRes.data) throw new Error('Authentication failed');

      setAuth(verifyRes.data.user, verifyRes.data.accessToken);
      return { success: true };
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  // ─── List / revoke credentials ───────────────────────────────────────────────

  async function listCredentials(): Promise<WebAuthnCredential[]> {
    const { data: res } = await webauthnApi.listCredentials();
    return res.data ?? [];
  }

  async function revokeCredential(credentialId: string): Promise<void> {
    await webauthnApi.revokeCredential(credentialId);
    const remaining = await listCredentials();
    if (remaining.length === 0 && user) {
      setAuth({ ...user, biometric_enrolled: false }, accessToken!);
    }
  }

  return {
    isSupported: isWebAuthnSupported,
    loading,
    error,
    enrollBiometric,
    loginWithBiometric,
    listCredentials,
    revokeCredential,
  };
}
