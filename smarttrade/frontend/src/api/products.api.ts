import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse, Product, Category } from '@/types';

export interface ProductsQuery {
  page?:        number;
  limit?:       number;
  category_id?: string;
  min_price?:   number;
  max_price?:   number;
  sort?:        'newest' | 'price_asc' | 'price_desc';
}

export const productsApi = {
  list: (params?: ProductsQuery) =>
    apiClient.get<PaginatedResponse<Product>>('/products', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Product>>(`/products/${id}`),

  search: (q: string) =>
    apiClient.get<ApiResponse<Product[]>>('/products/search', { params: { q } }),

  listCategories: () =>
    apiClient.get<ApiResponse<Category[]>>('/products/categories'),
};
