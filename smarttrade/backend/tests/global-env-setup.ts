/**
 * Runs in setupFiles — BEFORE any module is imported by test files.
 * Sets environment variables that affect module-level singletons (Prisma, Redis).
 * Must have NO imports from src/ — only plain assignments.
 */

process.env['DATABASE_URL'] =
  'postgresql://blanca@localhost:5432/smarttrade_test?host=/var/run/postgresql';
process.env['NODE_ENV']     = 'test';

// Suppress SMTP verify errors in tests (wrong credentials expected)
process.env['SMTP_HOST'] = 'localhost';
process.env['SMTP_PORT'] = '9999'; // intentionally unreachable — errors are swallowed
