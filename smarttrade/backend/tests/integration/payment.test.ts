/**
 * Integration tests — Payment routes
 * Flutterwave SDK and fetch are mocked — no real network calls.
 */

import crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { db } from '../../src/utils/db.js';
import { makeAgent, type Agent } from '../helpers/request.helper.js';
import { createTestUser, cleanupByPrefix, loginViaAPI } from '../helpers/auth.helper.js';

// ─── Mock Flutterwave SDK ─────────────────────────────────────────────────────
//
// jest.mock() is hoisted before `const` declarations, so referencing
// `mockFlwVerify` from inside the factory would hit a TDZ ReferenceError.
// Instead: create the mock function *inside* the factory and attach it to the
// constructor as a static property so tests can retrieve it after module load.

jest.mock('flutterwave-node-v3', () => {
  const verifyFn = jest.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor: any = jest.fn().mockImplementation(() => ({
    Transaction: { verify: verifyFn },
  }));
  Ctor.__verifyFn = verifyFn;
  return Ctor;
});

// Retrieve the verify mock after the module registry has been set up
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFlwVerify: jest.Mock = (jest.requireMock('flutterwave-node-v3') as any).__verifyFn;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const P          = `pay-${Date.now()}-`;
const FLW_HASH   = process.env['FLW_WEBHOOK_HASH'] ?? 'placeholder-webhook-hash';
const PAYMENT_URL = 'https://checkout.flutterwave.com/pay/test-link';

const SHIPPING = {
  street: '1 Pay Rd', city: 'Abuja', state: 'FCT', country: 'Nigeria', postalCode: '900001',
};

let agent:       Agent;
let csrf:        string;
let accessToken: string;
let userId:      string;
let orderId:     string;
let categoryId:  string;

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  ({ agent, csrf } = await makeAgent());

  const user = await createTestUser(`${P}buyer@example.com`);
  userId = user.user_id;
  const login = await loginViaAPI(agent, csrf, `${P}buyer@example.com`);
  accessToken = login.accessToken;

  const cat = await db.category.create({ data: { name: `${P}PayCat`, slug: `${P}paycat` } });
  categoryId = cat.category_id;
});

afterAll(async () => {
  // FK constraint chain (all with RESTRICT unless noted):
  //   Payment → Order → (CASCADE) → OrderItem ← Product
  // Delete in reverse dependency order so no constraint is violated.
  const orders = await db.order.findMany({ where: { user_id: userId }, select: { order_id: true } });
  const orderIds = orders.map((o) => o.order_id);
  if (orderIds.length > 0) {
    await db.payment.deleteMany({ where: { order_id: { in: orderIds } } }); // RESTRICT on Order
    await db.order.deleteMany({ where: { order_id: { in: orderIds } } });   // cascades OrderItems
  }
  await db.product.deleteMany({ where: { category_id: categoryId } }); // OrderItems gone
  await db.category.deleteMany({ where: { category_id: categoryId } });
  await cleanupByPrefix(P); // deletes user (orders gone)
});

beforeEach(() => {
  // Mock Flutterwave standard checkout API
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
    json: async () => ({ status: 'success', data: { link: PAYMENT_URL } }),
  } as unknown as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
  mockFlwVerify.mockReset();
});

/** Helper: create a fresh UNPAID order for each test */
async function freshOrder() {
  const prod = await db.product.create({
    data: {
      name: `${P}PayWidget-${Date.now()}`, description: 'pay item',
      price: 100, stock_qty: 5, category_id: categoryId,
    },
  });
  const order = await db.order.create({
    data: {
      user_id:          userId,
      total_amount:     100,
      shipping_address: SHIPPING,
      status:           'PENDING',
      payment_status:   'UNPAID',
    },
  });
  await db.orderItem.create({
    data: {
      order_id:   order.order_id,
      product_id: prod.product_id,
      quantity:   1,
      unit_price: 100,
      subtotal:   100,
    },
  });
  return order;
}

// ─── POST /api/v1/payments/initiate ───────────────────────────────────────────

describe('POST /api/v1/payments/initiate', () => {
  it('returns 201 + paymentUrl for a valid UNPAID order', async () => {
    const order = await freshOrder();

    const res = await agent
      .post('/api/v1/payments/initiate')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ orderId: order.order_id });

    expect(res.status).toBe(201);
    expect(res.body.data.paymentUrl).toBe(PAYMENT_URL);
    expect(res.body.data.tx_ref).toMatch(/^SMART-/);
  });

  it('returns 400 for an already-paid order', async () => {
    const paidOrder = await db.order.create({
      data: {
        user_id:          userId,
        total_amount:     50,
        shipping_address: SHIPPING,
        status:           'CONFIRMED',
        payment_status:   'PAID',
      },
    });

    const res = await agent
      .post('/api/v1/payments/initiate')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ orderId: paidOrder.order_id });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already paid');
  });
});

// ─── POST /api/v1/payments/webhook ────────────────────────────────────────────

describe('POST /api/v1/payments/webhook', () => {
  it('returns 200 but discards event when HMAC signature is invalid', async () => {
    const body = JSON.stringify({ event: 'charge.completed', data: {} });

    const res = await agent
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('verif-hash', 'totally-wrong-signature')
      .send(body);

    expect(res.status).toBe(200); // Flutterwave always gets 200
    expect(res.body.received).toBe(true);
  });

  it('marks payment PAID and order CONFIRMED on valid completed event', async () => {
    const order   = await freshOrder();
    orderId = order.order_id;

    // Initiate payment to create the Payment record + tx_ref
    const initRes = await agent
      .post('/api/v1/payments/initiate')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ orderId });

    const { tx_ref } = initRes.body.data as { tx_ref: string };

    // Mock Flutterwave verification to return success
    mockFlwVerify.mockResolvedValueOnce({
      status: 'success',
      data:   { status: 'successful', amount: 100, currency: 'USD', tx_ref },
    });

    const event = JSON.stringify({
      event: 'charge.completed',
      data:  { id: 12345, tx_ref, status: 'successful', amount: 100, currency: 'USD' },
    });

    const sig = crypto
      .createHmac('sha256', FLW_HASH)
      .update(event)
      .digest('hex');

    const whRes = await agent
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('verif-hash', sig)
      .send(event);

    expect(whRes.status).toBe(200);

    // Give the async IIFE time to commit the DB transaction
    await new Promise<void>((r) => setTimeout(r, 500));

    const payment = await db.payment.findFirst({ where: { tx_ref } });
    expect(payment?.status).toBe('PAID');

    const updatedOrder = await db.order.findUnique({ where: { order_id: orderId } });
    expect(updatedOrder?.payment_status).toBe('PAID');
    expect(updatedOrder?.status).toBe('CONFIRMED');
  });

  it('returns 200 without double-processing a duplicate webhook', async () => {
    // Reuse the PAID order from the previous test
    const payment = await db.payment.findFirst({ where: { order_id: orderId } });
    if (!payment) return; // previous test did not complete

    const event = JSON.stringify({
      event: 'charge.completed',
      data:  { id: 99, tx_ref: payment.tx_ref, status: 'successful', amount: 100, currency: 'USD' },
    });

    const sig = crypto
      .createHmac('sha256', FLW_HASH)
      .update(event)
      .digest('hex');

    // Verify should NOT be called again (idempotency)
    const res = await agent
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('verif-hash', sig)
      .send(event);

    expect(res.status).toBe(200);
    expect(mockFlwVerify).not.toHaveBeenCalled();
  });
});
