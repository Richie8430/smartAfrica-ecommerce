import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export const paymentsApi = {
  initiate: (orderId: string) =>
    apiClient.post<ApiResponse<{ paymentUrl: string; tx_ref: string }>>('/payments/initiate', { orderId }),

  getStatus: (orderId: string) =>
    apiClient.get<ApiResponse<{ status: string; tx_ref?: string }>>(`/payments/status/${orderId}`),
};
