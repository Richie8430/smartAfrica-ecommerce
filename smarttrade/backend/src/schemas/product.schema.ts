import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
  category_id: z.string().uuid().optional(),
  min_price:   z.coerce.number().min(0).optional(),
  max_price:   z.coerce.number().min(0).optional(),
  sort:        z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
});

export const createProductSchema = z.object({
  name:        z.string().min(1).max(200).trim(),
  description: z.string().min(1).trim(),
  price:       z.number().positive('Price must be positive'),
  stock_qty:   z.number().int().min(0, 'Stock cannot be negative'),
  category_id: z.string().uuid('Invalid category ID'),
  image_url:   z.string().url().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name:        z.string().min(1).max(100).trim(),
  description: z.string().optional(),
});

export type ListProductsQuery  = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
