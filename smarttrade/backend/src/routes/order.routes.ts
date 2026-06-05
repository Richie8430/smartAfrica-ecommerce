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
router.get(
  '/admin/all',
  authenticate,
  requireRole('ADMIN'),
  validateAdminOrdersQuery,
  adminListOrders,
);

router.put(
  '/admin/:id/status',
  authenticate,
  requireRole('ADMIN'),
  updateOrderStatus,
);

// ─── Customer routes ──────────────────────────────────────────────────────────
router.post('/', authenticate, createOrder);
router.get('/',  authenticate, validateListOrdersQuery, listOrders);
router.get('/:id', authenticate, getOrder);

export default router;
