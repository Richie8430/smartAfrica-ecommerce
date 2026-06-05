import type { Prisma, OrderStatus } from '@prisma/client';
import { db }          from '../utils/db.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError }     from '../utils/errors.js';
import type { ShippingAddress } from '../types/index.js';
import { queueOrderStatusUpdateEmail } from '../queues/email.queue.js';

// ─── Create order (transactional) ────────────────────────────────────────────

export async function createOrder(userId: string, shippingAddress: ShippingAddress) {
  // 1. Fetch current cart with products
  const cartItems = await db.cartItem.findMany({
    where:   { user_id: userId },
    include: { product: true },
  });

  if (cartItems.length === 0) throw new AppError(400, 'Cart is empty');

  // 2. Pre-flight availability check (fast fail before entering transaction)
  const unavailable = cartItems.filter(
    (item) => !item.product.is_active || item.product.stock_qty < item.quantity,
  );
  if (unavailable.length > 0) {
    const names = unavailable.map((i) => i.product.name).join(', ');
    throw new AppError(400, `The following items are unavailable: ${names}`);
  }

  // 3. Transactional: re-verify stock, decrement, create order + items, clear cart
  const createdOrder = await db.$transaction(async (tx) => {
    for (const item of cartItems) {
      const current = await tx.product.findUnique({
        where: { product_id: item.product_id },
      });

      if (!current || current.stock_qty < item.quantity) {
        throw new AppError(
          400,
          `Insufficient stock for "${current?.name ?? item.product_id}"`,
        );
      }

      await tx.product.update({
        where: { product_id: item.product_id },
        data:  { stock_qty: { decrement: item.quantity } },
      });
    }

    const total = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    const order = await tx.order.create({
      data: {
        user_id:          userId,
        total_amount:     total,
        shipping_address: shippingAddress as unknown as Prisma.InputJsonValue,
        status:           'PENDING',
      },
    });

    await tx.orderItem.createMany({
      data: cartItems.map((item) => ({
        order_id:   order.order_id,
        product_id: item.product_id,
        quantity:   item.quantity,
        unit_price: item.product.price,
        subtotal:   Number(item.product.price) * item.quantity,
      })),
    });

    await tx.cartItem.deleteMany({ where: { user_id: userId } });

    return order;
  });

  writeAuditLog({
    userId,
    action:   'ORDER_CREATED',
    metadata: {
      orderId:   createdOrder.order_id,
      total:     Number(createdOrder.total_amount),
      itemCount: cartItems.length,
    },
  });

  // Return order with full line-item details
  return db.order.findUnique({
    where:   { order_id: createdOrder.order_id },
    include: {
      order_items: {
        include: { product: { select: { name: true, image_url: true } } },
      },
    },
  });
}

// ─── List orders (paginated, user-scoped) ─────────────────────────────────────

export async function listOrders(
  userId: string,
  { page = 1, limit = 10 }: { page?: number; limit?: number },
) {
  const where = { user_id: userId };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        order_items: {
          include: { product: { select: { name: true, image_url: true } } },
        },
        payment: { select: { status: true, tx_ref: true } },
      },
      orderBy: { created_at: 'desc' },
      take:    limit,
      skip:    (page - 1) * limit,
    }),
    db.order.count({ where }),
  ]);

  return {
    data:       orders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  };
}

// ─── Get single order ─────────────────────────────────────────────────────────

export async function getOrder(orderId: string, userId: string) {
  const order = await db.order.findFirst({
    where:   { order_id: orderId, user_id: userId },
    include: {
      order_items: {
        include: { product: { select: { name: true, image_url: true, price: true } } },
      },
      payment: true,
    },
  });
  if (!order) throw new AppError(404, 'Order not found');
  return order;
}

// ─── Admin: list all orders with filters ─────────────────────────────────────

export async function adminListOrders(params: {
  status?: string;
  userId?: string;
  from?:   string;
  to?:     string;
  page:    number;
  limit:   number;
}) {
  const { status, userId, from, to, page, limit } = params;

  const where: Prisma.OrderWhereInput = {
    ...(status && { status: status as OrderStatus }),
    ...(userId && { user_id: userId }),
    ...((from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to   && { lte: new Date(to)   }),
      },
    }),
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        user: { select: { email: true, full_name: true } },
        order_items: {
          include: { product: { select: { name: true } } },
        },
        payment: { select: { status: true, tx_ref: true, amount: true } },
      },
      orderBy: { created_at: 'desc' },
      take:    limit,
      skip:    (page - 1) * limit,
    }),
    db.order.count({ where }),
  ]);

  return {
    data:       orders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  };
}

// ─── Admin: update order status ───────────────────────────────────────────────

export async function updateOrderStatus(
  orderId:  string,
  status:   OrderStatus,
  adminId?: string,
) {
  const existing = await db.order.findUnique({ where: { order_id: orderId } });
  if (!existing) throw new AppError(404, 'Order not found');

  const updated = await db.order.update({
    where: { order_id: orderId },
    data:  { status },
    include: {
      order_items: { include: { product: { select: { name: true } } } },
      user: { select: { email: true, full_name: true } },
    },
  });

  writeAuditLog({
    userId:   adminId,
    action:   'ORDER_STATUS_UPDATED',
    metadata: { orderId, newStatus: status, previousStatus: existing.status },
  });

  if (updated.user?.email) {
    void queueOrderStatusUpdateEmail(updated.user.email, { orderId, status });
  }

  return updated;
}
