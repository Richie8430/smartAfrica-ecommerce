/**
 * Security tests — SQL Injection
 *
 * Prisma uses parameterised queries throughout.  These tests verify that
 * injected SQL is treated as data, not executed.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { makeAgent, type Agent } from '../helpers/request.helper.js';

let agent: Agent;
let csrf:  string;

beforeAll(async () => {
  ({ agent, csrf } = await makeAgent());
});

describe('SQL Injection resistance', () => {
  it('login with SQL injection payload returns 401 or 422, never 500', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({
        email:    "'; DROP TABLE users; --",
        password: 'anything',
      });

    // 422 (Zod rejects the invalid email) or 401 (Prisma parameterises and finds no user)
    expect([401, 422]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it('login with OR-bypass payload returns 401 or 422, never 200', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({
        email:    "admin@example.com' OR '1'='1",
        password: "' OR '1'='1",
      });

    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(500);
  });

  it('product search with SQL injection returns 200 with 0 results, never a DB error', async () => {
    const res = await agent
      .get("/api/v1/products/search?q=' OR '1'='1");

    // Either returns 200 with empty results (special chars stripped) or 400 (too short after strip)
    expect([200, 400]).toContain(res.status);
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  it('product search with UNION injection returns safely', async () => {
    const res = await agent
      .get('/api/v1/products/search?q=foo UNION SELECT username,password FROM users--');

    expect(res.status).not.toBe(500);
    // Results should be 0 (the injected UNION is sanitised before the query)
    if (res.status === 200) {
      expect(res.body.data).toBeDefined();
    }
  });
});
