/**
 * setupFilesAfterEnv — runs before each integration test file.
 * DATABASE_URL is already set by global-env-setup.ts (setupFiles).
 */

import { db } from '../src/utils/db.js';

// Extend timeout for all integration tests
jest.setTimeout(30000);

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  // Disconnect Prisma so the connection pool is released after each file.
  // Prisma auto-reconnects lazily on the next query.
  await db.$disconnect();
});
