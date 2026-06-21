import { Router } from 'express';
import {
  registerChallenge,
  registerVerify,
  authChallenge,
  authVerify,
  revokeCredential,
  listCredentials,
} from '../controllers/webauthn.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';

const router = Router();

// ─── Registration (requires active session) ───────────────────────────────────
/**
 * @openapi
 * /auth/webauthn/register/challenge:
 *   post:
 *     summary: Get a WebAuthn registration challenge for the authenticated user
 *     tags: [WebAuthn]
 *     responses:
 *       200:
 *         description: Registration options (PublicKeyCredentialCreationOptions) to pass to the authenticator
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/register/challenge', authenticate, registerChallenge);
/**
 * @openapi
 * /auth/webauthn/register/verify:
 *   post:
 *     summary: Verify a WebAuthn registration response and save the new credential
 *     tags: [WebAuthn]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: RegistrationResponseJSON returned by navigator.credentials.create()
 *     responses:
 *       200:
 *         description: Biometric credential registered successfully
 */
router.post('/register/verify',    authenticate, registerVerify);

// ─── Authentication (public — no token yet) ───────────────────────────────────
/**
 * @openapi
 * /auth/webauthn/challenge:
 *   post:
 *     summary: Start passwordless WebAuthn authentication
 *     description: Client sends the user's email and receives an authentication challenge plus the userId needed for the verify step.
 *     tags: [WebAuthn]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Authentication options (PublicKeyCredentialRequestOptions) plus userId
 *       400:
 *         description: email is required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/challenge', authChallenge);
/**
 * @openapi
 * /auth/webauthn/verify:
 *   post:
 *     summary: Verify a WebAuthn authentication assertion and issue tokens
 *     tags: [WebAuthn]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             description: userId plus the AuthenticationResponseJSON returned by navigator.credentials.get()
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200:
 *         description: Biometric login successful — access token in body, refresh token set as HttpOnly cookie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string }
 *                     user: { type: object }
 *       400:
 *         description: userId is required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/verify',    authVerify);

// ─── Credential management (requires active session) ─────────────────────────
/**
 * @openapi
 * /auth/webauthn/credentials:
 *   get:
 *     summary: List the authenticated user's registered passkeys
 *     description: Does not include public keys.
 *     tags: [WebAuthn]
 *     responses:
 *       200:
 *         description: List of credentials
 */
router.get('/credentials',      authenticate, listCredentials);
/**
 * @openapi
 * /auth/webauthn/credentials/{id}:
 *   delete:
 *     summary: Revoke a single passkey credential
 *     tags: [WebAuthn]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Biometric credential revoked
 */
router.delete('/credentials/:id', authenticate, revokeCredential);

export default router;
