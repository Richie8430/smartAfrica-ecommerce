import type { Request, Response, NextFunction } from 'express';
import type { OrderStatus } from '@prisma/client';
import * as orderService  from '../services/order.service.js';
import { AppError }       from '../utils/errors.js';
import { success, error } from '../utils/response.js';
import { validateQuery }  from '../middlewares/validate.query.js';
import {
  listOrdersQuerySchema,
  adminListOrdersQuerySchema,
  updateOrderStatusSchema,
  createOrderSchema,
  type ListOrdersQuery,
  type AdminListOrdersQuery,
} from '../schemas/order.schema.js';

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof AppError) { error(res, err.message, err.statusCode); return; }
  next(err);
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.reduce<Record<string, string>>((acc, i) => {
        acc[i.path.join('.')] = i.message; return acc;
      }, {});
      error(res, 'Invalid order data', 422, errors);
      return;
    }

    const order = await orderService.createOrder(
      req.user!.userId,
      parsed.data.shippingAddress,
    );
    success(res, order, 201, 'Order placed successfully');
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = req.query as unknown as ListOrdersQuery;
    const result = await orderService.listOrders(req.user!.userId, params);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = String(req.params['id'] ?? '');
    const order   = await orderService.getOrder(orderId, req.user!.userId);
    success(res, order);
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminListOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = req.query as unknown as AdminListOrdersQuery;
    const result = await orderService.adminListOrders(params);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      error(res, 'Invalid status value', 422);
      return;
    }

    const orderId = String(req.params['id'] ?? '');
    const order   = await orderService.updateOrderStatus(
      orderId,
      parsed.data.status as OrderStatus,
      req.user!.userId,
    );
    success(res, order, 200, 'Order status updated');
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Middleware exports (used inline in routes) ───────────────────────────────

export const validateListOrdersQuery  = validateQuery(listOrdersQuerySchema);
export const validateAdminOrdersQuery = validateQuery(adminListOrdersQuerySchema);
