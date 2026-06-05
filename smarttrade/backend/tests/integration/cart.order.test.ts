/**
 * Integration tests — Cart + Order full flow
 *
 * Each mutation gets its own fresh agent+csrf to avoid stale tokens from
 * intervening GET requests.  The bearer accessToken is carried separately.
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../../src/app.js';
import { db } from '../../src/utils/db.js';
import { makeAgent } from '../helpers/request.helper.js';
import { createTestUser, cleanupByPrefix, loginViaAPI } from '../helpers/auth.helper.js';

const P = `cart-${Date.now()}-`;

let accessToken: string;
let userId:      string;
let productId:   string;
let categoryId:  string;

const SHIPPING = {
  street: '1 Test Rd', city: 'Lagos', state: 'LA', country: 'Nigeria', postalCode: '100001',
};

/** Short-lived agent+csrf for a single mutation. */
async function mutation() {
  return makeAgent();
}

beforeAll(async () => {
  const user = await createTestUser(`${P}buyer@example.com`);
  userId = user.user_id;

  const { agent, csrf } = await makeAgent();
  const login = await loginViaAPI(agent, csrf, `${P}buyer@example.com`);
  accessToken = login.accessToken;

  const cat = await db.category.create({
    data: { name: `${P}CartCat`, slug: `${P}cartcat` },
  });
  categoryId = cat.category_id;

  const prod = await db.product.create({
    data: {
      name: `${P}Test Widget`, description: 'A widget',
      price: 49.99, stock_qty: 10, category_id: categoryId,
    },
  });
  productId = prod.product_id;
});

afterAll(async () => {
  // Clean up in dependency order to avoid FK constraint violations
  await db.orderItem.deleteMany({
    where: { order: { user_id: userId } },
  });
  await db.order.deleteMany({ where: { user_id: userId } });
  await db.cartItem.deleteMany({ where: { user_id: userId } });
  await db.product.deleteMany({ where: { category_id: categoryId } });
  await db.category.deleteMany({ where: { category_id: categoryId } });
  await cleanupByPrefix(P);
});

// ─── Cart flow ────────────────────────────────────────────────────────────────

describe('Cart & Order flow', () => {
  it('adds an item to the cart — returns 201', async () => {
    const { agent, csrf } = await mutation();
    const res = await agent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId, quantity: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.quantity).toBe(1);
  });

  it('increments quantity when the same item is added again — returns 201 qty=2', async () => {
    const { agent, csrf } = await mutation();
    const res = await agent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId, quantity: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.quantity).toBe(2);
  });

  it('returns 400 when requested quantity exceeds stock', async () => {
    const { agent, csrf } = await mutation();
    const res = await agent
      .post('/api/v1/cart/items')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${accessToken}`)
      // 11 passes Zod's .max(100) but exceeds the product's stock_qty of 10
      .send({ productId, quantity: 11 });

    expect(res.status).toBe(400);
  });

  it('GET /cart shows the 2-item cart', async () => {
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1); // 1 distinct product
    expect(res.body.data.items[0].quantity).toBe(2);
  });

  it('creates an order from the cart — 201, stock decremented', async () => {
    const { agent, csrf } = await mutation();
    const res = await agent
      .post('/api/v1/orders')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ shippingAddress: SHIPPING });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.order_items).toHaveLength(1);

    const prod = await db.product.findUnique({ where: { product_id: productId } });
    expect(prod?.stock_qty).toBe(8); // started at 10, ordered 2
  });

  it('cart is empty after order creation', async () => {
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it('GET /orders shows the placed order', async () => {
    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('returns 400 when placing an order with an empty cart', async () => {
    const { agent, csrf } = await mutation();
    const res = await agent
      .post('/api/v1/orders')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ shippingAddress: SHIPPING });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('empty');
  });
});
