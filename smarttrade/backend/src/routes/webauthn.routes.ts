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
router.post('/register/challenge', authenticate, registerChallenge);
router.post('/register/verify',    authenticate, registerVerify);

// ─── Authentication (public — no token yet) ───────────────────────────────────
router.post('/challenge', authChallenge);
router.post('/verify',    authVerify);

// ─── Credential management (requires active session) ─────────────────────────
router.get('/credentials',      authenticate, listCredentials);
router.delete('/credentials/:id', authenticate, revokeCredential);

export default router;
