import type { Request, Response, NextFunction } from 'express';
import { db }           from '../utils/db.js';
import { logger }       from '../utils/logger.js';
import { AppError }     from '../utils/errors.js';
import { success, error } from '../utils/response.js';
import * as paymentService from '../services/payment.service.js';

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof AppError) { error(res, err.message, err.statusCode); return; }
  next(err);
}

// ─── POST /api/v1/payments/initiate ──────────────────────────────────────────

export async function initiatePayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, email } = req.user!;
    const orderId = String((req.body as Record<string, unknown>)['orderId'] ?? '');
    if (!orderId) { error(res, 'orderId is required', 400); return; }

    // JWT carries userId + email but not full_name / phone; fetch from DB
    const user = await db.user.findUnique({
      where:  { user_id: userId },
      select: { full_name: true, phone: true },
    });
    if (!user) { error(res, 'User not found', 404); return; }

    const result = await paymentService.initiatePayment(
      orderId,
      userId,
      email,
      user.full_name,
      user.phone ?? '',
    );

    success(res, result, 201, 'Payment initiated');
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── POST /api/v1/payments/webhook ───────────────────────────────────────────
// express.raw() is applied on this route in routes/payment.routes.ts,
// so req.body is a Buffer here.

export async function webhook(req: Request, res: Response): Promise<void> {
  const rawBody  = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body ?? '');
  const signature = String(req.headers['verif-hash'] ?? '');

  // Verify HMAC signature; invalid webhooks are logged and silently discarded
  try {
    paymentService.verifyWebhook(signature, rawBody);
  } catch {
    logger.warn('Payment webhook: invalid signature — discarding');
    res.status(200).json({ received: true });
    return;
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    logger.warn('Payment webhook: malformed JSON body');
    res.status(200).json({ received: true });
    return;
  }

  // Process asynchronously; always acknowledge immediately
  try {
    const result = await paymentService.processWebhook(event);
    if (result) {
      logger.info('Payment confirmed', { orderId: result.orderId, userId: result.userId });
      // TODO: trigger receipt email (fire-and-forget) via email service
    }
  } catch (err) {
    logger.error('Payment webhook processing error', { err });
  }

  // Flutterwave retries on non-200; always acknowledge
  res.status(200).json({ received: true });
}

// ─── GET /api/v1/payments/status/:orderId ────────────────────────────────────

export async function getPaymentStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orderId = String(req.params['orderId'] ?? '');
    const result  = await paymentService.getPaymentStatus(orderId, req.user!.userId);
    success(res, result);
  } catch (err) {
    handleError(err, res, next);
  }
}
