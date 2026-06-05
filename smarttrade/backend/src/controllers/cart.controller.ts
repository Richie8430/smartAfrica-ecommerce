import type { Request, Response, NextFunction } from 'express';
import * as cartService from '../services/cart.service.js';
import { AppError }     from '../utils/errors.js';
import { success, error } from '../utils/response.js';
import type { AddToCartInput, UpdateCartItemInput } from '../schemas/order.schema.js';

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof AppError) { error(res, err.message, err.statusCode); return; }
  next(err);
}

export async function getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cart = await cartService.getCart(req.user!.userId);
    success(res, cart);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId, quantity } = req.body as AddToCartInput;
    const item = await cartService.addToCart(req.user!.userId, productId, quantity);
    success(res, item, 201, 'Item added to cart');
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cartItemId = String(req.params['id'] ?? '');
    const { quantity } = req.body as UpdateCartItemInput;
    const item = await cartService.updateCartItem(req.user!.userId, cartItemId, quantity);
    success(res, item, 200, 'Cart item updated');
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cartItemId = String(req.params['id'] ?? '');
    await cartService.removeCartItem(req.user!.userId, cartItemId);
    success(res, null, 200, 'Item removed from cart');
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await cartService.clearCart(req.user!.userId);
    success(res, result, 200, 'Cart cleared');
  } catch (err) {
    handleError(err, res, next);
  }
}
