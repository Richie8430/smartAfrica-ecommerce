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
/**
 * @openapi
 * /cart:
 *   get:
 *     summary: Get the authenticated user's cart
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: The user's cart with items
 */
router.get('/',          authenticate, getCart);
/**
 * @openapi
 * /cart/items:
 *   post:
 *     summary: Add an item to the cart
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: string, format: uuid }
 *               quantity: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       201:
 *         description: Item added to cart
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/items',    authenticate, validateBody(addToCartSchema), addItem);
/**
 * @openapi
 * /cart/items/{id}:
 *   put:
 *     summary: Update the quantity of a cart item
 *     tags: [Cart]
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
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Cart item updated
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.put('/items/:id', authenticate, validateBody(updateCartItemSchema), updateItem);
/**
 * @openapi
 * /cart/items/{id}:
 *   delete:
 *     summary: Remove an item from the cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item removed from cart
 */
router.delete('/items/:id', authenticate, removeItem);
/**
 * @openapi
 * /cart:
 *   delete:
 *     summary: Clear the authenticated user's cart
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.delete('/',       authenticate, clearCart);

export default router;
