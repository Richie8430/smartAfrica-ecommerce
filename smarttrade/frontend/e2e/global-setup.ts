/**
 * Global E2E setup — seeds deterministic test fixtures via the dev seed API.
 * Stores shared data (product IDs etc.) in e2e/.fixtures.json for tests to read.
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename    = fileURLToPath(import.meta.url);
const __dirname_es  = dirname(__filename);
const BASE          = 'http://localhost:4000/api/v1';
const FIXTURES_PATH = resolve(__dirname_es, '.fixtures.json');

export default async function globalSetup() {
  // 1. Get CSRF token
  const csrfRes = await fetch(`${BASE}/products`);
  const cookie  = csrfRes.headers.get('set-cookie') ?? '';
  const token   = cookie.match(/csrf_token=([^;]+)/)?.[1] ?? '';

  // 2. Seed test data
  const seedRes = await fetch(`${BASE}/dev/seed`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': decodeURIComponent(token),
      'Cookie':        `csrf_token=${token}`,
    },
  });

  if (!seedRes.ok) {
    const body = await seedRes.text();
    console.warn(`[setup] Seed returned ${seedRes.status}: ${body}`);
  } else {
    const json = await seedRes.json() as { success: boolean; data: Record<string, string> };
    writeFileSync(FIXTURES_PATH, JSON.stringify(json.data ?? {}, null, 2));
    console.log('[setup] Test fixtures seeded:', json.data);
  }

  // 3. Warm up the frontend via HTTP (no browser needed at this stage)
  await fetch('http://localhost:5173').catch(() => null);
}
