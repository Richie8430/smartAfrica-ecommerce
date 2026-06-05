import { apiClient } from './client';
import type {
  ApiResponse,
  RegisterPayload,
  RegisterResponse,
  LoginPayload,
  LoginResponse,
} from '@/types';

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<ApiResponse<RegisterResponse>>('/auth/register', payload),

  verifyEmail: (userId: string, otp: string) =>
    apiClient.post<ApiResponse<{ user_id: string; email: string }>>('/auth/verify-email', { userId, otp }),

  resendOTP: (userId: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/resend-otp', { userId }),

  login: (payload: LoginPayload) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload),

  logout: () =>
    apiClient.post<ApiResponse<null>>('/auth/logout'),

  refresh: () =>
    apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh'),

  forgotPassword: (email: string) =>
    apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string, confirmPassword: string) =>
    apiClient.post<ApiResponse<null>>('/auth/reset-password', { token, password, confirmPassword }),
};
