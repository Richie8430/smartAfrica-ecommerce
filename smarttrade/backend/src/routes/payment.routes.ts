import express, { Router } from 'express';
import { authenticate }   from '../middlewares/authenticate.middleware.js';
import { paymentLimiter } from '../middlewares/rate.limiters.js';
import {
  initiatePayment,
  webhook,
  getPaymentStatus,
} from '../controllers/payment.controller.js';

const router = Router();

/**
 * @openapi
 * /payments/initiate:
 *   post:
 *     summary: Initiate a payment for a confirmed order
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId: { type: string }
 *     responses:
 *       201:
 *         description: Payment initiated — returns the Flutterwave payment link/details
 *       400:
 *         description: orderId is required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
// Initiate a payment for a confirmed order
router.post('/initiate', paymentLimiter, authenticate, initiatePayment);

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     summary: Flutterwave payment webhook
 *     description: Receives raw body for HMAC signature verification (header verif-hash). No auth/CSRF — always acknowledges with 200 to prevent retries.
 *     tags: [Payments]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Flutterwave webhook event payload
 *     responses:
 *       200:
 *         description: Always returns received acknowledgement, even on invalid signature or malformed body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received: { type: boolean, example: true }
 */
// Flutterwave webhook — raw body required for HMAC verification; no auth/CSRF
router.post('/webhook', express.raw({ type: '*/*' }), webhook);

/**
 * @openapi
 * /payments/status/{orderId}:
 *   get:
 *     summary: Check the payment status for an order
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment status details
 *       404:
 *         description: Order or payment not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
// Check payment status for an order
router.get('/status/:orderId', authenticate, getPaymentStatus);

export default router;
