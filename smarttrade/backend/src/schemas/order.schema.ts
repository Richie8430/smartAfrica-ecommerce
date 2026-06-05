import { z } from 'zod';

export const shippingAddressSchema = z.object({
  street:     z.string().min(1, 'Street is required').trim(),
  city:       z.string().min(1, 'City is required').trim(),
  state:      z.string().min(1, 'State is required').trim(),
  country:    z.string().min(1, 'Country is required').trim(),
  postalCode: z.string().min(1, 'Postal code is required').trim(),
});

export const createOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
});

export const listOrdersQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const adminListOrdersQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  userId: z.string().uuid().optional(),
  from:   z.string().optional(),
  to:     z.string().optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export const addToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity:  z.number().int().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(100),
});

export type ShippingAddressInput    = z.infer<typeof shippingAddressSchema>;
export type CreateOrderInput        = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery         = z.infer<typeof listOrdersQuerySchema>;
export type AdminListOrdersQuery    = z.infer<typeof adminListOrdersQuerySchema>;
export type UpdateOrderStatusInput  = z.infer<typeof updateOrderStatusSchema>;
export type AddToCartInput          = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput     = z.infer<typeof updateCartItemSchema>;
