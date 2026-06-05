/**
 * Supertest helpers for CSRF token handling.
 *
 * The CSRF middleware issues a csrf_token cookie on GET requests.
 * Mutation requests (POST/PUT/DELETE) must send the same value in
 * the X-CSRF-Token header.  Using supertest `agent()` persists the
 * cookie automatically.
 */

import request from 'supertest';
import app from '../../src/app.js';

export type Agent = ReturnType<typeof request.agent>;

/** Extract csrf_token from a Set-Cookie array. */
function extractCSRF(headers: Record<string, unknown>): string {
  const setCookie = (headers['set-cookie'] as string[] | undefined) ?? [];
  const raw       = setCookie.find((c) => c.startsWith('csrf_token=')) ?? '';
  return decodeURIComponent(raw.split(';')[0]?.split('=')[1] ?? '');
}

/**
 * Creates a supertest agent with a pre-loaded CSRF cookie+token.
 * Each agent gets a unique X-Forwarded-For IP so rate-limit counters
 * (keyed on req.ip) never bleed between test files or describe blocks.
 * app.set('trust proxy', 1) ensures Express uses X-Forwarded-For as req.ip.
 */
export async function makeAgent(): Promise<{ agent: Agent; csrf: string }> {
  const agent = request.agent(app);

  const oct = () => Math.floor(Math.random() * 254) + 1;
  agent.set('X-Forwarded-For', `10.${oct()}.${oct()}.${oct()}`);

  const res  = await agent.get('/api/v1/products');
  const csrf = extractCSRF(res.headers as Record<string, unknown>);
  return { agent, csrf };
}

/**
 * Refreshes the csrf_token for an existing agent by issuing a GET.
 * Call this after any GET request has been made on the agent to stay in sync.
 */
export async function refreshCSRF(agent: Agent): Promise<string> {
  const res  = await agent.get('/api/v1/products');
  return extractCSRF(res.headers as Record<string, unknown>);
}
