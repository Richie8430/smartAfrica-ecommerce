import { useState } from 'react';
import axios from 'axios';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { webauthnApi } from '@/api/webauthn.api';
import { useAuthStore } from '@/stores/auth.store';
import type { WebAuthnCredential, ApiResponse } from '@/types';

export const isWebAuthnSupported = browserSupportsWebAuthn();

// Errors thrown by startRegistration()/startAuthentication() are wrapped in
// SimpleWebAuthn's WebAuthnError, but it preserves the original DOMException's
// `name` (NotAllowedError, InvalidStateError, etc.) via `cause.name` — so the
// same name checks used for raw DOMExceptions work here too.
function friendlyError(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;

  if (name === 'NotAllowedError') return 'You cancelled the fingerprint prompt';
  if (name === 'InvalidStateError') return 'This device is already enrolled';
  if (name === 'NotSupportedError') return 'This device does not support biometric authentication';
  if (name === 'SecurityError') return 'Security error — make sure you are on a secure connection (HTTPS)';

  if (axios.isAxiosError<ApiResponse>(err)) {
    // No response at all means the request never reached the server (offline, DNS, etc.)
    if (!err.response) return 'Connection lost — please try again';

    const serverMessage = err.response.data?.error;
    if (serverMessage?.toLowerCase().includes('challenge expired')) {
      return 'The fingerprint session timed out — please try again';
    }
    if (serverMessage?.toLowerCase().includes('no fingerprint enrolled')) {
      return 'No fingerprint enrolled on this account';
    }
    return serverMessage ?? 'Something went wrong with biometric authentication';
  }

  return (err as Error)?.message || 'Something went wrong with biometric authentication';
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
    clearError: () => setError(null),
    enrollBiometric,
    loginWithBiometric,
    listCredentials,
    revokeCredential,
  };
}
