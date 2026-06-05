import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface Address {
  address_id:   string;
  user_id:      string;
  full_name:    string;
  address_line: string;
  city:         string;
  state:        string;
  country:      string;
  zip_code:     string;
  phone?:       string | null;
  is_default:   boolean;
  created_at:   string;
  updated_at:   string;
}

export interface AddressPayload {
  full_name:    string;
  address_line: string;
  city:         string;
  state:        string;
  country:      string;
  zip_code:     string;
  phone?:       string;
  is_default?:  boolean;
}

export interface AuditLogEntry {
  log_id:     string;
  action:     string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  metadata?:  Record<string, unknown> | null;
}

export const accountApi = {
  updateProfile: (data: { full_name?: string; phone?: string | null }) =>
    apiClient.put<ApiResponse<{ user_id: string; email: string; full_name: string; phone?: string; role: string; biometric_enrolled: boolean }>>('/account/profile', data),

  deleteAccount: (password: string) =>
    apiClient.delete<ApiResponse<null>>('/account', { data: { password } }),

  getAuditLog: () =>
    apiClient.get<{ success: boolean; data: AuditLogEntry[]; total: number }>('/account/audit-log'),

  getAddresses: () =>
    apiClient.get<ApiResponse<Address[]>>('/account/addresses'),

  createAddress: (payload: AddressPayload) =>
    apiClient.post<ApiResponse<Address>>('/account/addresses', payload),

  updateAddress: (id: string, payload: Partial<AddressPayload>) =>
    apiClient.put<ApiResponse<Address>>(`/account/addresses/${id}`, payload),

  deleteAddress: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/account/addresses/${id}`),

  logoutAll: () =>
    apiClient.post<ApiResponse<null>>('/auth/logout-all'),
};
