# SmartTrade

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

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd smarttrade-africa
   ```

2. Install dependencies in all workspaces:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   cd ../shared && npm install
   ```

3. Copy and configure environment variables:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your values
   ```

4. Generate Prisma client and run migrations:
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. Seed the database:
   ```bash
   npm run prisma:seed
   ```

6. Start development servers:
   ```bash
   # Backend (from backend/)
   npm run dev       # http://localhost:4000

   # Frontend (from frontend/)
   npm run dev       # http://localhost:5173
   ```

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | Express.js v5 |
| Language | TypeScript 5 (NodeNext ESM) |
| ORM | Prisma (PostgreSQL 16) |
| Cache | Redis via ioredis |
| Auth | RS256 JWT + WebAuthn passkeys |
| Payments | Flutterwave |
| Queues | Bull (Redis-backed) |
| Logging | Winston |
| Validation | Zod + express-validator |
| File uploads | Multer |
| Email | Nodemailer |

### Frontend
| Layer | Technology |
|-------|-----------|
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
- **Helmet.js** — security HTTP headers
- **Rate limiting** — 100 req / 15 min globally, stricter on auth routes
- **CORS** — allow-listed origins only
- **Input sanitization** — DOMPurify (isomorphic)
- **Password hashing** — bcryptjs
- **Audit logging** — every sensitive action recorded
- **Content-type enforcement** — express body parser limits

## Environment Variables

See `backend/.env.example` for all required variables. Never commit `.env`.

## Available Scripts

### Backend (`cd backend`)
| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm test` | Run Jest test suite |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run prisma:migrate` | Apply DB migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:seed` | Seed the database |

### Frontend (`cd frontend`)
| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm test` | Run Vitest |
| `npm run test:e2e` | Run Playwright E2E tests |
