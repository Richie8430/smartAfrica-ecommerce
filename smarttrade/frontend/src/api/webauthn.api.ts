import { apiClient } from './client';
import type { ApiResponse, WebAuthnCredential } from '@/types';
import type { LoginResponse } from '@/types';

export const webauthnApi = {
  getRegistrationChallenge: (userId: string) =>
    apiClient.post<ApiResponse<Record<string, unknown>>>('/auth/webauthn/register/challenge', { userId }),

  // Backend's registerVerify reads req.body directly as the RegistrationResponseJSON —
  // it must NOT be wrapped in an envelope object.
  verifyRegistration: (_userId: string, result: unknown) =>
    apiClient.post<ApiResponse<{ verified: boolean }>>('/auth/webauthn/register/verify', result),

  getAuthChallenge: (email: string) =>
    apiClient.post<ApiResponse<{ userId: string; options: Record<string, unknown> }>>('/auth/webauthn/challenge', { email }),

  // Backend's authVerify destructures `userId` off req.body and treats the rest of the
  // body as the flat AuthenticationResponseJSON — so the assertion fields must be spread
  // alongside userId, not nested under a "result" key.
  verifyAuthentication: (userId: string, result: object) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/webauthn/verify', { userId, ...result }),

  listCredentials: () =>
    apiClient.get<ApiResponse<WebAuthnCredential[]>>('/auth/webauthn/credentials'),

  revokeCredential: (credentialId: string) =>
    apiClient.delete<ApiResponse<null>>(`/auth/webauthn/credentials/${credentialId}`),
};
