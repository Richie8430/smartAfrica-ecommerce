import { Redis } from 'ioredis';
import { logger } from './logger.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

function parseRedisUrl(url: string): { host: string; port: number } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

const { host, port } = parseRedisUrl(REDIS_URL);

export const redisClient = new Redis({
  host,
  port,
  lazyConnect: false,
  retryStrategy: (times: number) => {
    if (times > 10) {
      logger.error(`Redis: max reconnection attempts (10) reached — giving up.`);
      return null; // stop retrying
    }
    // Exponential backoff: 100ms, 200ms, 400ms … capped at 5 s
    const delay = Math.min(100 * Math.pow(2, times - 1), 5000);
    logger.warn(`Redis: reconnecting in ${delay}ms (attempt ${times}/10)…`);
    return delay;
  },
  enableOfflineQueue: true,
  maxRetriesPerRequest: null, // let retryStrategy decide
});

redisClient.on('connect', () => {
  logger.info(`Redis connected → ${host}:${port}`);
});

redisClient.on('ready', () => {
  logger.info('Redis ready — accepting commands');
});

redisClient.on('error', (err: Error) => {
  logger.error('Redis error', { message: err.message });
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis reconnecting…');
});
