import express, { Router } from 'express';
import { authenticate }   from '../middlewares/authenticate.middleware.js';
import { paymentLimiter } from '../middlewares/rate.limiters.js';
import {
  initiatePayment,
  webhook,
  getPaymentStatus,
} from '../controllers/payment.controller.js';

const router = Router();

// Initiate a payment for a confirmed order
router.post('/initiate', paymentLimiter, authenticate, initiatePayment);

// Flutterwave webhook — raw body required for HMAC verification; no auth/CSRF
router.post('/webhook', express.raw({ type: '*/*' }), webhook);

// Check payment status for an order
router.get('/status/:orderId', authenticate, getPaymentStatus);

export default router;
