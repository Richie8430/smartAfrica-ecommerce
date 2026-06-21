import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';
import { env } from './utils/env.js';

const spec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SmartTrade Africa API',
      version: '1.0.0',
      description:
        'REST API for the SmartTrade Africa e-commerce platform — auth, products, cart, orders, payments, and account management.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            errors: { type: 'object', nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
});

/** Mounted only outside production — the spec exposes route shapes that shouldn't be public in prod. */
export function mountSwagger(app: Express): void {
  if (env.NODE_ENV === 'production') return;
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(spec));
}
