/**
 * Unit tests for email.service.ts
 * Mocks: nodemailer transporter (sendMail), Bull queue
 */

import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals';

// ─── nodemailer mock ──────────────────────────────────────────────────────────
// Must be declared BEFORE the module import so Jest hoists it correctly.

const mockSendMail = jest.fn<() => Promise<{ messageId: string }>>()
  .mockResolvedValue({ messageId: 'test-id' });

const mockVerify   = jest.fn<() => Promise<true>>().mockResolvedValue(true);

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
    verify:   mockVerify,
  })),
}));

// ─── logger mock ──────────────────────────────────────────────────────────────

jest.mock('../../src/utils/logger.js', () => ({
  logger:  { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  maskPII: (s: string) => s,
}));

// ─── Bull queue mock ──────────────────────────────────────────────────────────

const mockAdd     = jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: '1' });
const mockProcess = jest.fn();
const mockOn      = jest.fn();

jest.mock('bull', () =>
  jest.fn().mockImplementation(() => ({
    add:     mockAdd,
    process: mockProcess,
    on:      mockOn,
  })),
);

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendNewDeviceAlert,
  sendOrderConfirmation,
} from '../../src/services/email.service.js';

import { queueOTPEmail, queueOrderConfirmationEmail } from '../../src/queues/email.queue.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEST_EMAIL = 'test@example.com';

// Capture Bull constructor args at import time, BEFORE beforeEach clears mocks.
let bullConstructorArgs: unknown[][] = [];
beforeAll(() => {
  const BullMock = jest.requireMock<jest.Mock>('bull');
  bullConstructorArgs = BullMock.mock.calls as unknown[][];
});

const SAMPLE_ORDER = {
  order_id:         'aabbccdd-0000-4000-a000-000000000001',
  total_amount:     149.98,
  shipping_address: { street: '12 Lagos Rd', city: 'Abuja', state: 'FCT', country: 'Nigeria' },
  order_items: [
    { name: 'Wireless Headphones', quantity: 1, unit_price: 99.99, subtotal: 99.99 },
    { name: 'Phone Case',          quantity: 2, unit_price: 24.99, subtotal: 49.98 },
  ],
};

beforeEach(() => { jest.clearAllMocks(); });

// ─── sendOTPEmail ─────────────────────────────────────────────────────────────

describe('sendOTPEmail', () => {
  it('calls sendMail with the correct subject and OTP in the body', async () => {
    await sendOTPEmail(TEST_EMAIL, '482910');

    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const [mailOptions] = mockSendMail.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(mailOptions['to']).toBe(TEST_EMAIL);
    expect(mailOptions['subject']).toBe('Verify your SmartTrade Africa account');
    expect(String(mailOptions['html'])).toContain('482910');
    expect(String(mailOptions['html'])).toContain('15 minutes');
  });

  it('propagates sendMail errors so the queue processor can retry', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));

    await expect(sendOTPEmail(TEST_EMAIL, '123456')).rejects.toThrow('SMTP timeout');
  });
});

// ─── sendPasswordResetEmail ───────────────────────────────────────────────────

describe('sendPasswordResetEmail', () => {
  it('includes the reset URL in the email body', async () => {
    const resetUrl = 'http://localhost:5173/reset-password?token=abc123';
    await sendPasswordResetEmail(TEST_EMAIL, resetUrl);

    const [opts] = mockSendMail.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(String(opts['html'])).toContain(resetUrl);
    expect(String(opts['html'])).toContain('1 hour');
  });
});

// ─── sendNewDeviceAlert ───────────────────────────────────────────────────────

describe('sendNewDeviceAlert', () => {
  it('includes IP, userAgent, and timestamp in the email body', async () => {
    const data = { ip: '1.2.3.4', userAgent: 'Mozilla/5.0', timestamp: '2026-06-04T00:00:00Z' };
    await sendNewDeviceAlert(TEST_EMAIL, data);

    const [opts] = mockSendMail.mock.calls[0] as unknown as [Record<string, unknown>];
    const html   = String(opts['html']);
    expect(html).toContain('1.2.3.4');
    expect(html).toContain('Mozilla/5.0');
    expect(html).toContain('2026-06-04T00:00:00Z');
  });
});

// ─── sendOrderConfirmation ────────────────────────────────────────────────────

describe('sendOrderConfirmation', () => {
  it('lists all order items and the total in the email body', async () => {
    await sendOrderConfirmation(TEST_EMAIL, SAMPLE_ORDER);

    const [opts] = mockSendMail.mock.calls[0] as unknown as [Record<string, unknown>];
    const html   = String(opts['html']);

    expect(html).toContain('Wireless Headphones');
    expect(html).toContain('Phone Case');
    expect(html).toContain('149.98');
    expect(html).toContain('3–5 business days');
  });

  it('subject contains the short order ID in uppercase', async () => {
    await sendOrderConfirmation(TEST_EMAIL, SAMPLE_ORDER);

    const [opts] = mockSendMail.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(String(opts['subject'])).toContain('AABBCCDD');
  });
});

// ─── Queue retry behaviour ────────────────────────────────────────────────────

describe('email queue', () => {
  it('adds an OTP job to the Bull queue with correct data', async () => {
    await queueOTPEmail('user@example.com', '999888');

    expect(mockAdd).toHaveBeenCalledWith('sendOTP', { to: 'user@example.com', otp: '999888' });
  });

  it('adds an order confirmation job with serialised order data', async () => {
    await queueOrderConfirmationEmail(TEST_EMAIL, SAMPLE_ORDER);

    expect(mockAdd).toHaveBeenCalledWith(
      'sendOrderConfirmation',
      expect.objectContaining({ to: TEST_EMAIL, order: SAMPLE_ORDER }),
    );
  });

  it('queue is configured with 3 retry attempts and exponential backoff', () => {
    // bullConstructorArgs was captured in beforeAll before clearAllMocks ran.
    // Bull is called as new Bull(name, redisUrl, options) so args[0][2] is the options.
    const opts = bullConstructorArgs[0]?.[2] as { defaultJobOptions?: Record<string, unknown> };

    expect(opts?.defaultJobOptions?.['attempts']).toBe(3);
    expect(opts?.defaultJobOptions?.['backoff']).toMatchObject({
      type:  'exponential',
      delay: 5000,
    });
  });
});
