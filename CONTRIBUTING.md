# Contributing to SmartTrade Africa

## Branch naming

| Prefix | Use for |
|---|---|
| `feature/*` | New functionality |
| `fix/*` | Bug fixes |
| `security/*` | Security fixes or hardening |
| `chore/*` | Tooling, deps, CI, docs, refactors with no behavior change |

Example: `feature/wishlist-api`, `fix/cart-quantity-overflow`, `security/csrf-token-rotation`.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add wishlist endpoint
fix: prevent negative cart quantity
security: rotate CSRF token on login
docs: document FLW_WEBHOOK_HASH in README
test: add integration test for refund flow
chore: bump prisma to 5.11
```

## Pull request process

1. Branch off `main` using the naming convention above.
2. Open a PR against `main` using the PR template (filled in completely, including the security checklist).
3. CI (`.github/workflows/ci.yml`) must pass: lint, type-check, unit + integration tests, security audit, SAST.
4. At least **one** approving review is required before merge (enforced via branch protection / CODEOWNERS).
5. Squash-merge once approved and green.

## Coding standards

- TypeScript everywhere — no `any` without justification.
- Lint with the repo's ESLint config before pushing: `npm run lint --prefix smarttrade/backend` / `npm run lint --prefix smarttrade/frontend`.
- Format with Prettier (`.prettierrc` in each workspace) — `npm run format`.
- Backend local imports use `.js` extensions (NodeNext ESM) — see `smarttrade/backend/tsconfig.json`.
- New endpoints: add Zod/express-validator validation, an `@openapi` JSDoc block (see `smarttrade/backend/src/swagger.ts`), and an audit log entry if the action is security-sensitive.
- New sensitive code paths (auth, payments, WebAuthn) require a security-focused reviewer — see `.github/CODEOWNERS`.
