# SmartTrade Africa — Project Report

**Repository:** github.com/Richie8430/smartAfrica-ecommerce
**Generated:** 2026-06-22

## 1. Overview

SmartTrade Africa is a secure, full-stack e-commerce platform built as a TypeScript monorepo (`smarttrade/`) with three workspaces: `backend`, `frontend`, and `shared`.

## 2. Development Timeline (commit history)

| Commit | Summary |
|---|---|
| `b91ea4a` | First phase of the full app — initial monorepo scaffold |
| `cd01e7c` | Image upload pipeline (Cloudinary) and auth functionality |
| `3075930` | Merge of PR #1 |
| `a39b97b` | Per-user placeholder profile photos (DiceBear), OpenAPI/Swagger docs across all routes |
| `b9c9467` | CI/CD pipeline, repo governance files, root workspace scripts |

## 3. Architecture

```
smarttrade/
├── backend/     Express 5 API · Prisma ORM (PostgreSQL 16) · Redis · RS256 JWT · WebAuthn
├── frontend/    React 18 · Vite 5 · Tailwind CSS v4 · TanStack Query · Zustand
└── shared/      Zod schemas and TypeScript types shared across workspaces
```

- **Backend module system:** `NodeNext` ESM — local imports use `.js` extensions.
- **Frontend styling:** Tailwind v4, CSS-first `@theme {}` config (no PostCSS/autoprefixer).
- **Auth:** RS256 (asymmetric) JWT — access (15m) + refresh (7d) tokens, plus WebAuthn/passkey biometric login.
- **Payments:** Flutterwave standard checkout + HMAC-verified webhook.
- **Database:** PostgreSQL 16 via Prisma; custom indexes for full-text product search and audit-log/order lookups.

## 4. Backend — Feature Summary

**10 route modules / 51 endpoints**, each now documented with `@openapi` JSDoc:

| Module | Endpoints | Responsibility |
|---|---|---|
| auth.routes.ts | 11 | Register, OTP email verification, login, logout, refresh, password reset/change, CSRF token |
| webauthn.routes.ts | 6 | Passkey registration/verification challenges, credential management |
| product.routes.ts | 9 | Search, categories, CRUD, image upload (DOMPurify-sanitized) |
| cart.routes.ts | 5 | Get/add/update/remove/clear cart items |
| order.routes.ts | 5 | Create/list/get orders, admin order management |
| payment.routes.ts | 3 | Initiate payment, Flutterwave webhook, payment status |
| account.routes.ts | 6 | Profile update, account deletion, address book CRUD |
| audit.routes.ts | 3 | Account audit log, admin audit log + CSV export |
| admin.routes.ts | 1 | Dashboard stats |
| dev.routes.ts | 2 | Test-only seed/cleanup (guarded, non-production) |

**Services:** auth, cart, email, order, payment, product, webauthn — 7 service modules backing the routes.

**Security hardening:**
- Helmet + custom CSP, HPP protection, CSRF double-submit cookie
- Global rate limiting + progressive slow-down on auth routes
- CORS allow-listing, X-Request-ID tracing header
- DOMPurify sanitization on product fields
- bcrypt password hashing, account lockout, OTP verification
- Audit logging on every sensitive action (auth events, profile changes, admin actions, payments) — preserved on user deletion (`onDelete: SetNull`)
- HMAC verification of Flutterwave webhook payloads

**API documentation:** OpenAPI 3.0.3 spec generated via `swagger-jsdoc`, served at `/api/v1/docs` (Swagger UI), disabled in production.

**Testing:** Jest suite — unit, integration, and dedicated security test paths (`test:unit`, `test:integration`, `test:security`), run with `--coverage` in CI.

## 5. Frontend — Feature Summary

**29 pages**, including:
- Public: Home, Products, ProductDetail, Cart, Checkout, OrderConfirmation
- Auth: Login, Register, VerifyEmail, ForgotPassword, ResetPassword
- Account: Dashboard, Profile, Orders/OrderHistory, Security, Addresses
- Admin: AdminProducts, AdminOrders, AdminAuditLogs, AdminLayout/Dashboard
- Error/legal: NotFound, ServerError, PaymentFailed, Terms, Privacy

**Stack:** React 18, Vite 5, Tailwind v4 (brand tokens: primary `#1A3C6E`, success `#1D9E75`), Zustand (auth/cart state), TanStack Query, React Hook Form + Zod, Radix UI primitives, i18next, Axios.

**Recent UX improvement:** replaced static letter-initial avatars with **DiceBear-generated per-user placeholder avatars** (`avataaars` style), seeded by `userId` so each account gets a unique, consistent avatar until a real photo is uploaded — wired into the navbar dropdown and account sidebar.

## 6. DevOps / CI-CD (this session)

- **`.github/workflows/ci.yml`** — GitHub Actions pipeline:
  - `backend-checks`: lint, type-check, unit + integration tests (Postgres + Redis service containers), `npm audit`, coverage upload to Codecov
  - `frontend-checks`: lint, type-check, Vitest, `npm audit`, production build
  - `sast`: Semgrep static analysis
  - `deploy-staging`: auto-deploys backend (Render) + frontend (Vercel) on push to `main`, then runs a health-check smoke test
  - `deploy-production`: gated behind a manual-approval GitHub Environment
- **`.github/dependabot.yml`** — weekly dependency update checks across backend, frontend, shared, and GitHub Actions
- **`.github/CODEOWNERS`** — security-sensitive files (payment/webauthn services, CSRF middleware, env validation) require review
- **`.github/pull_request_template.md`** — enforces a testing checklist and a security checklist (no secrets, no PII in logs, input validated) on every PR
- **Root `package.json`** — `install:all`, `dev` (concurrently runs backend+frontend), `build`, `test`, `test:e2e`, `lint`
- **`backend/.env.example`** — documents every required environment variable validated by Zod at boot
- **`README.md`, `SECURITY.md`, `CONTRIBUTING.md`** — onboarding, vulnerability disclosure process (24h ack / 72h critical-fix SLA), and contribution workflow (Conventional Commits, branch naming, PR process)

## 7. Verified Status

| Check | Result |
|---|---|
| `npm run build` (shared → backend → frontend) | ✅ 0 TypeScript errors |
| Secrets/keys ever committed to git history | ✅ None found (`git log --all` clean for `.env`, `keys/`) |
| `npm audit --audit-level=high` (backend) | ❌ 35 vulnerabilities (11 high) — mostly transitive via `bull`'s `uuid` dependency |
| `npm audit --audit-level=high` (frontend) | ❌ 12 vulnerabilities (8 high, 2 critical) — transitive via `@typescript-eslint` chain |
| Root `.gitignore` covering `node_modules/` | ✅ Added (was missing — caught before it polluted a commit) |

## 8. Known Gaps / Not Yet Verified

These require infrastructure or hardware not available in this environment:

- Staging/production deployment (Render/Vercel hooks are configured but unexercised)
- End-to-end Playwright suite execution
- Lighthouse accessibility scoring
- Flutterwave sandbox payment completing end-to-end
- WebAuthn/biometric enrollment on real hardware
- `npm audit` high/critical findings — flagged, not yet remediated (would require dependency version bumps and regression testing)
- `CODEOWNERS`/Dependabot reviewers are currently all set to `@Richie8430` — no distinct security-lead has been designated

## 9. Test Accounts (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | admin@smarttrade.test | Admin@1234 |
| Customer | customer@smarttrade.test | Customer@1234 |
