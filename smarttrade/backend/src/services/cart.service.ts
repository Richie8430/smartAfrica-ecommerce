import { db }      from '../utils/db.js';
import { AppError } from '../utils/errors.js';

// ─── Read cart ────────────────────────────────────────────────────────────────

export async function getCart(userId: string) {
  const cartItems = await db.cartItem.findMany({
    where:   { user_id: userId },
    include: {
      product: {
        include: {
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { added_at: 'asc' },
  });

  const enrichedItems = cartItems.map((item) => {
    const isAvailable = item.product.is_active && item.product.stock_qty >= item.quantity;
    return {
      ...item,
      is_available: isAvailable,
      subtotal:     Number(item.product.price) * item.quantity,
    };
  });

  const total = enrichedItems.reduce(
    (sum, item) => (item.is_available ? sum + item.subtotal : sum),
    0,
  );

  return {
    items:     enrichedItems,
    total:     Math.round(total * 100) / 100, // round to 2 dp
    itemCount: enrichedItems.length,
  };
}

// ─── Add / update item ────────────────────────────────────────────────────────

export async function addToCart(userId: string, productId: string, quantity: number) {
  const product = await db.product.findFirst({
    where: { product_id: productId, is_active: true },
  });
  if (!product) throw new AppError(404, 'Product not found or unavailable');
  if (product.stock_qty < quantity) {
    throw new AppError(400, `Insufficient stock — only ${product.stock_qty} unit(s) available`);
  }

  // Upsert: increment if item already in cart, create otherwise.
  let cartItem = await db.cartItem.upsert({
    where:  { user_id_product_id: { user_id: userId, product_id: productId } },
    update: { quantity: { increment: quantity } },
    create: { user_id: userId, product_id: productId, quantity },
  });

  // Cap at available stock if the increment pushed the total over.
  if (cartItem.quantity > product.stock_qty) {
    cartItem = await db.cartItem.update({
      where: { cart_item_id: cartItem.cart_item_id },
      data:  { quantity: product.stock_qty },
    });
  }

  return cartItem;
}

// ─── Update item quantity ─────────────────────────────────────────────────────

export async function updateCartItem(
  userId: string,
  cartItemId: string,
  quantity: number,
) {
  const cartItem = await db.cartItem.findUnique({
    where:   { cart_item_id: cartItemId },
    include: { product: { select: { stock_qty: true } } },
  });
  if (!cartItem)                throw new AppError(404, 'Cart item not found');
  if (cartItem.user_id !== userId) throw new AppError(403, 'Forbidden');
  if (quantity > cartItem.product.stock_qty) {
    throw new AppError(400, `Insufficient stock — only ${cartItem.product.stock_qty} unit(s) available`);
  }

  return db.cartItem.update({
    where: { cart_item_id: cartItemId },
    data:  { quantity },
  });
}

// ─── Remove item ──────────────────────────────────────────────────────────────

export async function removeCartItem(userId: string, cartItemId: string) {
  const cartItem = await db.cartItem.findUnique({
    where: { cart_item_id: cartItemId },
  });
  if (!cartItem)                throw new AppError(404, 'Cart item not found');
  if (cartItem.user_id !== userId) throw new AppError(403, 'Forbidden');

  await db.cartItem.delete({ where: { cart_item_id: cartItemId } });
}

// ─── Clear cart ───────────────────────────────────────────────────────────────

export async function clearCart(userId: string) {
  const { count } = await db.cartItem.deleteMany({ where: { user_id: userId } });
  return { cleared: count };
}
