# SmartTrade Africa – Secure E-Commerce Platform

A secure, scalable e-commerce platform built with TypeScript, React 18, and Node.js (Express 5).

## Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis 7
- npm 10+

## Project Structure

```
smarttrade/
├── backend/     Express.js v5 API · Prisma ORM · RS256 JWT · WebAuthn · Flutterwave
├── frontend/    React 18 · Vite 5 · Tailwind CSS v4 · TanStack Query · Zustand
└── shared/      Zod schemas and TypeScript types shared across workspaces
```

## Quick Start

```bash
git clone https://github.com/Richie8430/smartAfrica-ecommerce.git
cd smartAfrica-ecommerce

# 1. Install dependencies in all workspaces
npm run install:all

# 2. Configure environment variables
cp smarttrade/backend/.env.example smarttrade/backend/.env
# edit smarttrade/backend/.env with your values (see table below)

# 3. Generate the RS256 JWT signing key pair
npm run generate:keys --prefix smarttrade/backend

# 4. Run database migrations
npm run db:migrate --prefix smarttrade/backend

# 5. Seed the database with test accounts
npm run db:seed --prefix smarttrade/backend

# 6. Start both dev servers
npm run dev
# backend  → http://localhost:4000
# frontend → http://localhost:5173
```

## Environment Variables

All variables are validated with Zod at boot (`backend/src/utils/env.ts`) — the server refuses to start if any required value is missing. See `backend/.env.example` for the full template.

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` / `test` / `production` |
| `PORT` | Backend HTTP port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/smarttrade_db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_PRIVATE_KEY_PATH` | Path to RS256 private key | `./keys/private.pem` |
| `JWT_PUBLIC_KEY_PATH` | Path to RS256 public key | `./keys/public.pem` |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allow-list | `http://localhost:5173` |
| `FLW_PUBLIC_KEY` | Flutterwave public key | `FLWPUBK_TEST-...` |
| `FLW_SECRET_KEY` | Flutterwave secret key | `FLWSECK_TEST-...` |
| `FLW_ENCRYPTION_KEY` | Flutterwave encryption key | `...` |
| `FLW_WEBHOOK_HASH` | Shared secret to verify Flutterwave webhook HMAC | a random string |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Outbound mail (OTP, receipts) | Mailtrap in dev |
| `EMAIL_FROM` | "From" address for outbound mail | `noreply@smarttrade.africa` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Image uploads | Cloudinary dashboard |
| `SENTRY_DSN` | Optional error monitoring | — |
| `APP_URL` | Public frontend URL | `http://localhost:5173` |
| `API_URL` | Public backend URL | `http://localhost:4000` |

## API Documentation

Interactive OpenAPI docs (Swagger UI) are served outside production:

```
http://localhost:4000/api/v1/docs
```

The spec is generated from `@openapi` JSDoc comments above each route handler (`backend/src/routes/*.ts`), configured in `backend/src/swagger.ts`.

## Test Accounts

Seeded by `npm run db:seed --prefix smarttrade/backend`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@smarttrade.test` | `Admin@1234` |
| Customer | `customer@smarttrade.test` | `Customer@1234` |

## Running Tests

```bash
# Backend — unit + integration + security suites (Jest)
npm test --prefix smarttrade/backend
npm run test:coverage --prefix smarttrade/backend

# Frontend — unit (Vitest)
npm run test --prefix smarttrade/frontend

# End-to-end (Playwright)
npm run test:e2e
```

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | Express.js v5 |
| Language | TypeScript 5 (NodeNext ESM) |
| ORM | Prisma (PostgreSQL 16) |
| Cache | Redis via ioredis |
| Auth | RS256 JWT + WebAuthn passkeys |
| Payments | Flutterwave |
| Queues | Bull (Redis-backed) |
| Logging | Winston |
| Validation | Zod + express-validator |
| File uploads | Multer + Cloudinary |
| Email | Nodemailer |
| API docs | swagger-jsdoc + swagger-ui-express |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 |
| Bundler | Vite 5 |
| Styling | Tailwind CSS v4 (CSS-first config) |
| State | Zustand v4 |
| Server state | TanStack Query v5 |
| Forms | React Hook Form v7 + Zod |
| UI Primitives | Radix UI |
| Auth | @simplewebauthn/browser |
| i18n | react-i18next |
| HTTP | Axios |

## Security Features

- **RS256 JWT** — asymmetric key pair, access (15m) + refresh (7d) token rotation
- **WebAuthn / Passkeys** — passwordless authentication via @simplewebauthn
- **Helmet.js** — security HTTP headers + CSP
- **Rate limiting + progressive slow-down** — global and auth-specific
- **CORS** — allow-listed origins only
- **Input sanitization** — DOMPurify (isomorphic) on product fields
- **Password hashing** — bcryptjs
- **CSRF protection** — double-submit cookie
- **HPP protection** — HTTP parameter pollution guard
- **Audit logging** — every sensitive action recorded, preserved on user deletion
- **Webhook HMAC verification** — Flutterwave payment webhooks

See [SECURITY.md](../SECURITY.md) for the vulnerability reporting process.

## Architecture

Refer to the project's Technical Design Document (TDD) for the full architecture, threat model, and the 26-item security checklist referenced in CI.

## Available Scripts (root)

| Script | Description |
|---|---|
| `npm run install:all` | Install deps in root + all three workspaces |
| `npm run dev` | Run backend and frontend dev servers concurrently |
| `npm run build` | Build shared → backend → frontend |
| `npm test` | Run backend test suite |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | Lint backend and frontend |
