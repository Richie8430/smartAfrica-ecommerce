/**
 * Security tests — Cross-Site Scripting (XSS)
 *
 * isomorphic-dompurify sanitises product name and description before
 * they are persisted.  These tests verify no raw script tags make it
 * through to the stored record.
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { db } from '../../src/utils/db.js';
import { makeAgent, type Agent } from '../helpers/request.helper.js';
import { createAdminToken, cleanupByPrefix } from '../helpers/auth.helper.js';

// Mock Flutterwave (imported transitively via payment.service)
jest.mock('flutterwave-node-v3', () =>
  jest.fn().mockImplementation(() => ({ Transaction: { verify: jest.fn() } })),
);

const P = `xss-${Date.now()}-`;

let agent:      Agent;
let csrf:       string;
let adminToken: string;
let categoryId: string;

beforeAll(async () => {
  ({ agent, csrf } = await makeAgent());
  adminToken = await createAdminToken(`${P}admin@example.com`);

  const cat = await db.category.create({ data: { name: `${P}XSSCat`, slug: `${P}xsscat` } });
  categoryId = cat.category_id;
});

afterAll(async () => {
  await db.product.deleteMany({ where: { category_id: categoryId } });
  await db.category.deleteMany({ where: { category_id: categoryId } });
  await cleanupByPrefix(P);
});

describe('XSS sanitization on product creation', () => {
  it('returns 201 and the stored name has the script tag stripped', async () => {
    const xssName = `Safe Product <script>alert('XSS')</script>`;

    const res = await agent
      .post('/api/v1/products')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:        xssName,
        description: 'Clean description <img onerror="alert(1)" src=x>',
        price:       19.99,
        stock_qty:   10,
        category_id: categoryId,
      });

    expect(res.status).toBe(201);

    const storedName = (res.body.data as { name: string }).name;
    expect(storedName).not.toContain('<script>');
    expect(storedName).not.toContain('alert(');
    // Plain text portion should remain
    expect(storedName).toContain('Safe Product');
  });

  it('description with event-handler attribute is sanitised', async () => {
    const res = await agent
      .post('/api/v1/products')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:        `${P}Clean Name`,
        description: '<img src="x" onerror="alert(1)"> nice image',
        price:       9.99,
        stock_qty:   5,
        category_id: categoryId,
      });

    expect(res.status).toBe(201);

    const storedDesc = (res.body.data as { description: string }).description;
    expect(storedDesc).not.toContain('onerror');
    expect(storedDesc).not.toContain('<img');
  });

  it('persisted name in the DB also has no script tags', async () => {
    const payload = `Legitimate <script>document.cookie</script> Item`;

    const res = await agent
      .post('/api/v1/products')
      .set('X-CSRF-Token', csrf)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name:        payload,
        description: 'verified in db',
        price:       1,
        stock_qty:   1,
        category_id: categoryId,
      });

    expect(res.status).toBe(201);
    const productId = (res.body.data as { product_id: string }).product_id;

    const dbRecord = await db.product.findUnique({ where: { product_id: productId } });
    expect(dbRecord?.name).not.toContain('<script>');
    expect(dbRecord?.name).not.toContain('document.cookie');
  });
});
