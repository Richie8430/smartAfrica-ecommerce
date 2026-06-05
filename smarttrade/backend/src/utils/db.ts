import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const isProduction = process.env['NODE_ENV'] === 'production';

export const db: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: isProduction ? ['error', 'warn'] : ['query', 'error', 'warn'],
  });

// In development, attach to global so hot-reload doesn't leak connections.
if (!isProduction) {
  globalThis.__prisma = db;
}
