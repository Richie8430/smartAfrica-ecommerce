import { Router } from 'express';
import {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
} from '../controllers/cart.controller.js';
import { authenticate }  from '../middlewares/authenticate.middleware.js';
import { validateBody }  from '../middlewares/validate.middleware.js';
import { addToCartSchema, updateCartItemSchema } from '../schemas/order.schema.js';

const router = Router();

// All cart routes require an authenticated user.
router.get('/',          authenticate, getCart);
router.post('/items',    authenticate, validateBody(addToCartSchema), addItem);
router.put('/items/:id', authenticate, validateBody(updateCartItemSchema), updateItem);
router.delete('/items/:id', authenticate, removeItem);
router.delete('/',       authenticate, clearCart);

export default router;
