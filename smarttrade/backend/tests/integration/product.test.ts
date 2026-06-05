/**
 * Integration tests — Product routes
 *
 * GETs use plain request(app) — no agent needed for public endpoints.
 * POSTs / DELETEs get a fresh agent+csrf immediately before use to
 * avoid stale CSRF tokens (GET requests re-issue csrf_token cookies).
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../../src/app.js';
import { db } from '../../src/utils/db.js';
import { makeAgent } from '../helpers/request.helper.js';
import { createAdminToken, createTestUser, cleanupByPrefix, loginViaAPI } from '../helpers/auth.helper.js';

const P = `prod-${Date.now()}-`;

let adminToken: string;
let categoryId: string;
let productId:  string;

beforeAll(async () => {
  adminToken = await createAdminToken(`${P}admin@example.com`);

  const cat = await db.category.create({
    data: { name: `${P}Category`, slug: `${P}category` },
  });
  categoryId = cat.category_id;

  const prod = await db.product.create({
    data: {
      name:        `${P}Wireless Phone Speaker`,
      description: 'A great phone accessory',
      price:       49.99,
      stock_qty:   50,
      category_id: categoryId,
    },
  });
  productId = prod.product_id;
});

afterAll(async () => {
  await db.product.deleteMany({ where: { category_id: categoryId } });
  await db.category.deleteMany({ where: { category_id: categoryId } });
  await cleanupByPrefix(P);
});

// ─── GET /products ─────────────────────────────────────────────────────────────

describe('GET /api/v1/products', () => {
  it('returns 200 with paginated product list', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });
});

// ─── GET /products/search ─────────────────────────────────────────────────────

describe('GET /api/v1/products/search', () => {
  it('returns 200 with results for a valid query', async () => {
    const res = await request(app).get('/api/v1/products/search?q=phone');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns 400 when query is too short (< 2 chars)', async () => {
    const res = await request(app).get('/api/v1/products/search?q=a');
    expect(res.status).toBe(400);
  });
});

// ─── GET /products/:id ────────────────────────────────────────────────────────

describe('GET /api/v1/products/:id', () => {
  it('returns 200 for a valid product ID', async () => {
    const res = await request(app).get(`/api/v1/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.product_id).toBe(productId);
  });

  it('returns 404 for a non-existent product ID', async () => {
    const res = await request(app).get('/api/v1/products/00000000-0000-4000-a000-000000000000');
    expect(res.status).toBe(404);
  });
});

// ─── POST /products (admin-only) ──────────────────────────────────────────────

describe('POST /api/v1/products', () => {
  it('returns 403 when called with a customer token', async () => {
    // Fresh agent+csrf for this mutation
    const { agent, csrf } = await makeAgent();
    await createTestUser(`${P}customer@example.com`);
    const { accessToken } = await loginViaAPI(agent, csrf, `${P}customer@example.com`);

    // GET has now refreshed the csrf_token cookie; capture the fresh token
    const { agent: freshAgent, csrf: freshCsrf } = await makeAgent();

    const res = await freshAgent
      .post('/api/v1/products')
      .set('X-CSRF-Token', freshCsrf)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Forbidden', description: 'x', price: 10, stock_qty: 5, category_id: categoryId });

    expect(res.status).toBe(403);
  });

  it('returns 201 when admin creates a product with valid body', async () => {
    const { agent, csrf } = await makeAgent();

    const res = await agent
      .post('/api/v1/products')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:        `${P}New Product`,
        description: 'Admin created this',
        price:       29.99,
        stock_qty:   100,
        category_id: categoryId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe(`${P}New Product`);
  });
});

// ─── DELETE /products/:id (admin soft-delete) ─────────────────────────────────

describe('DELETE /api/v1/products/:id', () => {
  it('returns 200 and sets is_active=false (soft delete)', async () => {
    const prod = await db.product.create({
      data: { name: `${P}ToDelete`, description: 'delete me', price: 5, stock_qty: 1, category_id: categoryId },
    });

    const { agent, csrf } = await makeAgent();

    const res = await agent
      .delete(`/api/v1/products/${prod.product_id}`)
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const updated = await db.product.findUnique({ where: { product_id: prod.product_id } });
    expect(updated?.is_active).toBe(false);
  });
});
