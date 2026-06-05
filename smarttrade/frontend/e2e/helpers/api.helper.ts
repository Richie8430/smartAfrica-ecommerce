/**
 * Low-level API helpers for E2E setup/teardown.
 * Uses raw fetch so tests can call the backend without a browser session.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename  = fileURLToPath(import.meta.url);
const __dirname_e = dirname(__filename);

const BASE = 'http://localhost:4000/api/v1';

export interface SeedFixtures {
  adminId:      string;
  customerId:   string;
  categoryId:   string;
  productId:    string;
  oosProductId: string;
}

export function getFixtures(): SeedFixtures {
  const raw = readFileSync(resolve(__dirname_e, '../.fixtures.json'), 'utf-8');
  return JSON.parse(raw) as SeedFixtures;
}

export async function apiPost(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body:    JSON.stringify(body),
  });
}

export async function apiGet(
  path: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
