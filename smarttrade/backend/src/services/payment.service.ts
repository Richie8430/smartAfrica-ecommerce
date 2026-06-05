import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { Prisma } from '@prisma/client';
import { db }           from '../utils/db.js';
import { AppError }     from '../utils/errors.js';
import { writeAuditLog } from '../utils/audit.js';
import { logger }       from '../utils/logger.js';
import {
  queuePaymentReceiptEmail,
  queueOrderConfirmationEmail,
} from '../queues/email.queue.js';

// ─── Flutterwave CJS import (no ESM typings) ─────────────────────────────────
// flutterwave-node-v3 ships CommonJS only. Default import works under both
// NodeNext ESM (production) and ts-jest CommonJS (tests) via esModuleInterop.

interface FlwTransactionResult {
  status: string;
  data: {
    status: string;
    amount: number;
    currency: string;
    tx_ref: string;
    flw_ref?: string;
  };
}

interface FlutterwaveClient {
  Transaction: {
    verify(params: { id: string | number }): Promise<FlwTransactionResult>;
  };
}

// @ts-expect-error — no type declarations for this CJS package
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import FlutterwaveBase from 'flutterwave-node-v3';
const Flutterwave = FlutterwaveBase as new (pub: string, sec: string) => FlutterwaveClient;

// ─── Config ───────────────────────────────────────────────────────────────────

const FLW_PUBLIC_KEY   = process.env['FLW_PUBLIC_KEY']   ?? '';
const FLW_SECRET_KEY   = process.env['FLW_SECRET_KEY']   ?? '';
const FLW_WEBHOOK_HASH = process.env['FLW_WEBHOOK_HASH'] ?? '';
const APP_URL          = process.env['APP_URL']           ?? 'http://localhost:5173';

const flw = new Flutterwave(FLW_PUBLIC_KEY, FLW_SECRET_KEY);

// ─── initiatePayment ─────────────────────────────────────────────────────────

export async function initiatePayment(
  orderId:   string,
  userId:    string,
  userEmail: string,
  userName:  string,
  userPhone: string,
): Promise<{ paymentUrl: string; tx_ref: string }> {
  // 1. Verify order belongs to user and is still UNPAID
  const order = await db.order.findFirst({
    where: { order_id: orderId, user_id: userId, payment_status: 'UNPAID' },
  });
  if (!order) throw new AppError(400, 'Order already paid or not found');

  // 2. Idempotency: return existing payment URL if a PENDING payment already exists
  const existing = await db.payment.findUnique({ where: { order_id: orderId } });
  if (existing?.status === 'PENDING') {
    const stored = existing.webhook_payload as { paymentUrl?: string } | null;
    if (stored?.paymentUrl) {
      return { paymentUrl: stored.paymentUrl, tx_ref: existing.tx_ref };
    }
  }

  // 3. Generate unique transaction reference
  const tx_ref = `SMART-${uuidv4()}`;

  // 4. Call Flutterwave Standard Checkout API (hosted payment page)
  const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${FLW_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref,
      amount:       Number(order.total_amount),
      currency:     'USD',
      redirect_url: `${APP_URL}/order-confirmation/${orderId}`,
      customer: {
        email:        userEmail,
        name:         userName,
        phone_number: userPhone,
      },
      customizations: {
        title:       'SmartTrade Africa',
        description: `Order ${orderId}`,
        logo:        '',
      },
    }),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = (await flwRes.json()) as any;
  if (payload?.status !== 'success' || !payload?.data?.link) {
    logger.error('Flutterwave initiate failed', { payload });
    throw new AppError(502, 'Payment initialization failed — please try again');
  }

  const paymentUrl: string = payload.data.link as string;

  // 5. Persist payment record (store paymentUrl for idempotency re-use)
  await db.payment.create({
    data: {
      order_id:        orderId,
      tx_ref,
      amount:          order.total_amount,
      status:          'PENDING',
      webhook_payload: { paymentUrl } as unknown as Prisma.InputJsonValue,
    },
  });

  // 6. Reflect PENDING payment status on order
  await db.order.update({
    where: { order_id: orderId },
    data:  { payment_status: 'PENDING' },
  });

  return { paymentUrl, tx_ref };
}

// ─── verifyWebhook ────────────────────────────────────────────────────────────

export function verifyWebhook(signature: string, rawBody: string): void {
  // Read lazily so env var overrides in tests take effect
  const webhookHash = process.env['FLW_WEBHOOK_HASH'] ?? '';
  const expected = crypto
    .createHmac('sha256', webhookHash)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  const valid  =
    sigBuf.length === expBuf.length &&
    crypto.timingSafeEqual(sigBuf, expBuf);

  if (!valid) throw new AppError(401, 'Invalid webhook signature');
}

// ─── processWebhook ──────────────────────────────────────────────────────────

export async function processWebhook(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any,
): Promise<{ orderId: string; userId: string } | null> {
  if (event?.event !== 'charge.completed') return null;

  const tx_ref: string = event?.data?.tx_ref;
  if (!tx_ref) return null;

  // Look up payment + order owner
  const payment = await db.payment.findUnique({
    where:   { tx_ref },
    include: { order: { select: { order_id: true, user_id: true } } },
  });

  if (!payment) {
    logger.warn('Webhook received for unknown tx_ref', { tx_ref });
    return null; // Return null; controller always sends 200
  }

  // Idempotency: skip if already processed
  if (payment.status === 'PAID') return null;

  // Verify with Flutterwave before trusting the event
  const verify = await flw.Transaction.verify({ id: event.data.id as string });

  const isValid =
    verify.data.status   === 'successful' &&
    verify.data.amount   >= Number(payment.amount) &&
    verify.data.currency === payment.currency;

  if (!isValid) {
    logger.warn('Webhook verification mismatch', { tx_ref, verify: verify.data });
    return null;
  }

  // Atomic update: mark payment PAID + order CONFIRMED
  await db.$transaction([
    db.payment.update({
      where: { tx_ref },
      data:  {
        status:          'PAID',
        provider_ref:    String(event.data.id),
        webhook_payload: event as unknown as Prisma.InputJsonValue,
      },
    }),
    db.order.update({
      where: { order_id: payment.order_id },
      data:  { payment_status: 'PAID', status: 'CONFIRMED' },
    }),
  ]);

  writeAuditLog({
    userId:   payment.order.user_id,
    action:   'PAYMENT_RECEIVED',
    metadata: { orderId: payment.order_id, tx_ref, amount: Number(payment.amount) },
  });

  // Queue receipt + confirmation emails (fire-and-forget; don't block webhook response)
  void (async () => {
    try {
      const fullOrder = await db.order.findUnique({
        where:   { order_id: payment.order_id },
        include: {
          order_items: { include: { product: { select: { name: true } } } },
          user:        { select: { email: true } },
        },
      });

      if (!fullOrder?.user) return;

      const orderData = {
        order_id:         fullOrder.order_id,
        total_amount:     Number(fullOrder.total_amount),
        shipping_address: fullOrder.shipping_address as {
          street: string; city: string; state: string; country: string; postalCode?: string;
        },
        order_items: fullOrder.order_items.map((i) => ({
          name:       i.product.name,
          quantity:   i.quantity,
          unit_price: Number(i.unit_price),
          subtotal:   Number(i.subtotal),
        })),
      };

      const paymentData = {
        tx_ref:     payment.tx_ref,
        amount:     Number(payment.amount),
        currency:   payment.currency,
        created_at: payment.updated_at.toISOString(),
      };

      await Promise.all([
        queuePaymentReceiptEmail(fullOrder.user.email, { order: orderData, payment: paymentData }),
        queueOrderConfirmationEmail(fullOrder.user.email, orderData),
      ]);
    } catch (err) {
      logger.error('Failed to queue payment emails', { err });
    }
  })();

  return { orderId: payment.order_id, userId: payment.order.user_id };
}

// ─── handleFailedPayment ─────────────────────────────────────────────────────

export async function handleFailedPayment(tx_ref: string): Promise<void> {
  const payment = await db.payment.findUnique({ where: { tx_ref } });
  if (!payment || payment.status === 'PAID') return;

  const orderItems = await db.orderItem.findMany({
    where: { order_id: payment.order_id },
  });

  // Restore stock + update statuses in one transaction
  await db.$transaction([
    ...orderItems.map((item) =>
      db.product.update({
        where: { product_id: item.product_id },
        data:  { stock_qty: { increment: item.quantity } },
      }),
    ),
    db.payment.update({
      where: { tx_ref },
      data:  { status: 'FAILED' },
    }),
    db.order.update({
      where: { order_id: payment.order_id },
      data:  { payment_status: 'UNPAID', status: 'PENDING' },
    }),
  ]);

  writeAuditLog({
    action:   'PAYMENT_FAILED',
    metadata: { orderId: payment.order_id, tx_ref },
  });
}

// ─── getPaymentStatus ─────────────────────────────────────────────────────────

export async function getPaymentStatus(
  orderId: string,
  userId:  string,
): Promise<{ status: string; tx_ref?: string }> {
  const order = await db.order.findFirst({
    where: { order_id: orderId, user_id: userId },
  });
  if (!order) throw new AppError(404, 'Order not found');

  const payment = await db.payment.findUnique({ where: { order_id: orderId } });

  return {
    status: payment?.status ?? 'UNPAID',
    tx_ref: payment?.tx_ref,
  };
}
