import { apiClient } from './client';
import type { ApiResponse, WebAuthnCredential } from '@/types';
import type { LoginResponse } from '@/types';

export const webauthnApi = {
  getRegistrationChallenge: (userId: string) =>
    apiClient.post<ApiResponse<Record<string, unknown>>>('/auth/webauthn/register/challenge', { userId }),

  verifyRegistration: (userId: string, result: unknown) =>
    apiClient.post<ApiResponse<{ verified: boolean }>>('/auth/webauthn/register/verify', { userId, result }),

  getAuthChallenge: (email: string) =>
    apiClient.post<ApiResponse<{ userId: string; options: Record<string, unknown> }>>('/auth/webauthn/auth/challenge', { email }),

  verifyAuthentication: (userId: string, result: unknown) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/webauthn/auth/verify', { userId, result }),

  listCredentials: () =>
    apiClient.get<ApiResponse<WebAuthnCredential[]>>('/auth/webauthn/credentials'),

  revokeCredential: (credentialId: string) =>
    apiClient.delete<ApiResponse<null>>(`/auth/webauthn/credentials/${credentialId}`),
};
