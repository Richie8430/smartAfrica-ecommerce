import Bull from 'bull';
import { logger } from '../utils/logger.js';
import {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendNewDeviceAlert,
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendOrderStatusUpdate,
  type OrderEmailData,
  type PaymentEmailData,
} from '../services/email.service.js';

// ─── Queue setup ──────────────────────────────────────────────────────────────

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

const DEFAULT_JOB_OPTS: Bull.JobOptions = {
  attempts:         3,
  backoff:          { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
  removeOnFail:     false,
};

const emailQueue = new Bull('emails', REDIS_URL, {
  defaultJobOptions: DEFAULT_JOB_OPTS,
});

// ─── Processors ───────────────────────────────────────────────────────────────

emailQueue.process('sendOTP', async (job: Bull.Job<{ to: string; otp: string }>) => {
  await sendOTPEmail(job.data.to, job.data.otp);
});

emailQueue.process('sendPasswordReset', async (job: Bull.Job<{ to: string; resetUrl: string }>) => {
  await sendPasswordResetEmail(job.data.to, job.data.resetUrl);
});

emailQueue.process('sendNewDeviceAlert', async (
  job: Bull.Job<{ to: string; ip: string; userAgent: string; timestamp: string }>,
) => {
  await sendNewDeviceAlert(job.data.to, {
    ip:        job.data.ip,
    userAgent: job.data.userAgent,
    timestamp: job.data.timestamp,
  });
});

emailQueue.process('sendOrderConfirmation', async (
  job: Bull.Job<{ to: string; order: OrderEmailData }>,
) => {
  await sendOrderConfirmation(job.data.to, job.data.order);
});

emailQueue.process('sendPaymentReceipt', async (
  job: Bull.Job<{ to: string; order: OrderEmailData; payment: PaymentEmailData }>,
) => {
  await sendPaymentReceipt(job.data.to, { order: job.data.order, payment: job.data.payment });
});

emailQueue.process('sendOrderStatusUpdate', async (
  job: Bull.Job<{ to: string; orderId: string; status: string; estimatedDelivery?: string }>,
) => {
  await sendOrderStatusUpdate(job.data.to, {
    orderId:           job.data.orderId,
    status:            job.data.status,
    estimatedDelivery: job.data.estimatedDelivery,
  });
});

// ─── Error handler ────────────────────────────────────────────────────────────

emailQueue.on('failed', (job: Bull.Job, err: Error) => {
  logger.error('Email job failed', { jobName: job.name, jobId: job.id, err: err.message });
});

// ─── Exported queue helpers ───────────────────────────────────────────────────

export async function queueOTPEmail(to: string, otp: string): Promise<void> {
  await emailQueue.add('sendOTP', { to, otp });
}

export async function queuePasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await emailQueue.add('sendPasswordReset', { to, resetUrl });
}

export async function queueNewDeviceAlertEmail(
  to:   string,
  data: { ip: string; userAgent: string; timestamp: string },
): Promise<void> {
  await emailQueue.add('sendNewDeviceAlert', { to, ...data });
}

export async function queueOrderConfirmationEmail(
  to:    string,
  order: OrderEmailData,
): Promise<void> {
  await emailQueue.add('sendOrderConfirmation', { to, order });
}

export async function queuePaymentReceiptEmail(
  to:   string,
  data: { order: OrderEmailData; payment: PaymentEmailData },
): Promise<void> {
  await emailQueue.add('sendPaymentReceipt', { to, order: data.order, payment: data.payment });
}

export async function queueOrderStatusUpdateEmail(
  to:   string,
  data: { orderId: string; status: string; estimatedDelivery?: string },
): Promise<void> {
  await emailQueue.add('sendOrderStatusUpdate', { to, ...data });
}

export { emailQueue };
