import winston from 'winston';
import path from 'node:path';
import fs from 'node:fs';

const logsDir = path.resolve('logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isProduction = process.env['NODE_ENV'] === 'production';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const fileFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,  // 10 MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 20 * 1024 * 1024,  // 20 MB
      maxFiles: 10,
    }),
    ...(isProduction
      ? []
      : [
          new winston.transports.Console({
            format: combine(colorize({ all: true }), simple()),
          }),
        ]),
  ],
  exitOnError: false,
});

// Replaces email addresses with e***@***.tld to protect PII in log output.
export function maskPII(str: string): string {
  return str.replace(
    /([a-zA-Z0-9._%+\-]+)@([a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g,
    (_match, local: string, domain: string) => {
      const tld = domain.split('.').pop() ?? 'com';
      return `${local[0]}***@***.${tld}`;
    },
  );
}
