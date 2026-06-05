import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse, Order, ShippingAddress } from '@/types';

export const ordersApi = {
  create: (shippingAddress: ShippingAddress) =>
    apiClient.post<ApiResponse<Order>>('/orders', { shippingAddress }),

  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Order> & { success: boolean }>('/orders', { params }),

  get: (orderId: string) =>
    apiClient.get<ApiResponse<Order>>(`/orders/${orderId}`),
};
