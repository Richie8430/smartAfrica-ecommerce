# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in SmartTrade Africa, please report it privately — do **not** open a public GitHub issue.

- Email: **security@smarttrade.africa**
- Include: affected endpoint/component, steps to reproduce, impact, and (if possible) a proof of concept.
- Please use a non-destructive proof of concept — do not test against production data or other users' accounts.

## Response SLA

| Stage | Target |
|---|---|
| Acknowledgement of report | within 24 hours |
| Initial triage / severity assessment | within 72 hours |
| Fix for **critical** severity | within 72 hours of confirmation |
| Fix for high/medium/low severity | next scheduled release |

We will keep you informed of progress and credit you in the release notes (unless you prefer to remain anonymous) once the fix ships.

## Scope

**In scope:**
- All API endpoints under `https://api.smarttrade.africa/api/v1/*` (and staging equivalent)
- The frontend application at `https://smarttrade.africa`
- Authentication and session handling (JWT, WebAuthn/passkeys, CSRF)
- Payment flow integration with Flutterwave (request/response handling on our side)

**Out of scope:**
- Third-party services we depend on but do not operate: Flutterwave, Cloudinary, SMTP provider, Render, Vercel — report issues with those directly to the vendor
- Denial-of-service / volumetric attacks
- Social engineering or physical attacks against staff
- Findings that require a jailbroken/rooted device or a compromised local machine

## Security Features Implemented

SmartTrade Africa implements (non-exhaustive):

- RS256 JWT with short-lived access tokens and rotating refresh tokens
- WebAuthn/passkey biometric authentication
- bcrypt password hashing, OTP email verification, account lockout after repeated failures
- Helmet security headers + custom Content-Security-Policy
- Rate limiting and progressive slow-down on authentication routes
- CORS allow-listing, CSRF double-submit cookie, HPP protection
- Input validation (Zod / express-validator) and output sanitization (DOMPurify)
- HMAC verification of Flutterwave payment webhooks
- Audit logging of all sensitive actions (auth events, profile changes, admin actions, payments)

See the project's Technical Design Document (TDD) for the complete 26-item security checklist and threat model.
