import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse, Product, Order, Category } from '@/types';

export interface CreateProductPayload {
  name:        string;
  description: string;
  price:       number;
  stock_qty:   number;
  category_id: string;
}

export type UpdateProductPayload = Partial<CreateProductPayload> & { is_active?: boolean };

export const adminApi = {
  // Products
  createProduct: (payload: CreateProductPayload) =>
    apiClient.post<ApiResponse<Product>>('/products', payload),

  updateProduct: (id: string, payload: UpdateProductPayload) =>
    apiClient.put<ApiResponse<Product>>(`/products/${id}`, payload),

  deleteProduct: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/products/${id}`),

  uploadProductImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    return apiClient.post<ApiResponse<Product>>(`/products/${id}/images`, form, {
      headers: { 'Content-Type': undefined },
    });
  },

  // Orders
  listOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<Order> & { success: boolean }>('/admin/orders', { params }),

  updateOrderStatus: (orderId: string, status: string) =>
    apiClient.put<ApiResponse<Order>>(`/admin/orders/${orderId}/status`, { status }),

  // Categories
  createCategory: (name: string, description?: string) =>
    apiClient.post<ApiResponse<Category>>('/admin/categories', { name, description }),

  // Stats
  getStats: () =>
    apiClient.get<ApiResponse<{
      totalOrders:   number;
      totalRevenue:  number;
      totalProducts: number;
      totalUsers:    number;
      recentOrders:  Order[];
    }>>('/admin/stats'),
};
