import { Router } from 'express';
import {
  createOrder,
  listOrders,
  getOrder,
  adminListOrders,
  updateOrderStatus,
  validateListOrdersQuery,
  validateAdminOrdersQuery,
} from '../controllers/order.controller.js';
import { authenticate }  from '../middlewares/authenticate.middleware.js';
import { requireRole }   from '../middlewares/require.role.middleware.js';

const router = Router();

// ─── Admin routes first (before /:id to avoid route-shadow conflicts) ─────────
/**
 * @openapi
 * /orders/admin/all:
 *   get:
 *     summary: List all orders across all users (admin only)
 *     description: Requires ADMIN role.
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED] }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string }
 *       - in: query
 *         name: to
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { type: object } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 totalPages: { type: integer }
 *                 limit: { type: integer }
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get(
  '/admin/all',
  authenticate,
  requireRole('ADMIN'),
  validateAdminOrdersQuery,
  adminListOrders,
);

/**
 * @openapi
 * /orders/admin/{id}/status:
 *   put:
 *     summary: Update an order's status (admin only)
 *     description: Requires ADMIN role.
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED] }
 *     responses:
 *       200:
 *         description: Order status updated
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       422:
 *         description: Invalid status value
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.put(
  '/admin/:id/status',
  authenticate,
  requireRole('ADMIN'),
  updateOrderStatus,
);

// ─── Customer routes ──────────────────────────────────────────────────────────
/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Place an order from the current cart
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shippingAddress]
 *             properties:
 *               shippingAddress:
 *                 type: object
 *                 required: [street, city, state, country, postalCode]
 *                 properties:
 *                   street: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   country: { type: string }
 *                   postalCode: { type: string }
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       422:
 *         description: Invalid order data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/', authenticate, createOrder);
/**
 * @openapi
 * /orders:
 *   get:
 *     summary: List the authenticated user's orders
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated list of the user's orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { type: object } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 totalPages: { type: integer }
 *                 limit: { type: integer }
 */
router.get('/',  authenticate, validateListOrdersQuery, listOrders);
/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Get a single order belonging to the authenticated user
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get('/:id', authenticate, getOrder);

export default router;
