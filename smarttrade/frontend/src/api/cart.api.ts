import { apiClient } from './client';
import type { ApiResponse, Cart, CartItem } from '@/types';

export const cartApi = {
  get: () =>
    apiClient.get<ApiResponse<Cart>>('/cart'),

  addItem: (productId: string, quantity: number) =>
    apiClient.post<ApiResponse<CartItem>>('/cart/items', { productId, quantity }),

  updateItem: (cartItemId: string, quantity: number) =>
    apiClient.put<ApiResponse<CartItem>>(`/cart/items/${cartItemId}`, { quantity }),

  removeItem: (cartItemId: string) =>
    apiClient.delete<ApiResponse<null>>(`/cart/items/${cartItemId}`),

  clear: () =>
    apiClient.delete<ApiResponse<null>>('/cart'),
};
