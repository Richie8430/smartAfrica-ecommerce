import 'dotenv/config';

// Redis — connect immediately so the "Redis connected" log appears at startup.
import './utils/redis.js';

// JWT keys — attempt early load so misconfiguration surfaces at boot, not on first request.
import { loadKeys } from './utils/jwt.js';
import app from './app.js';
import { logger } from './utils/logger.js';

try {
  loadKeys();
  logger.info('JWT keys loaded');
} catch (err) {
  logger.warn(`JWT keys not loaded — run "npm run generate:keys" first. ${(err as Error).message}`);
}

const PORT = Number(process.env['PORT'] ?? 4000);
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

const server = app.listen(PORT, () => {
  logger.info(`🚀 SmartTrade API → http://localhost:${PORT}  [${NODE_ENV}]`);
  logger.info(`   Health check  → http://localhost:${PORT}/api/v1/health`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully…');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down gracefully…');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception — terminating', { message: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection — terminating', { reason });
  process.exit(1);
});

export default server;
