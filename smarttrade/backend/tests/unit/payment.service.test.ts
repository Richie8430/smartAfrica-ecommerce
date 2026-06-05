/**
 * Unit tests for payment.service.ts
 * Mocks: flutterwave-node-v3 (SDK), db (Prisma), audit, and global fetch.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import crypto from 'crypto';

// ─── Module mocks ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockVerify = jest.fn<(...args: any[]) => any>();

jest.mock('flutterwave-node-v3', () => {
  return jest.fn().mockImplementation(() => ({
    Transaction: { verify: mockVerify },
  }));
});

jest.mock('../../src/utils/db.js', () => ({
  db: {
    order:     { findFirst: jest.fn(), update: jest.fn() },
    payment:   { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    orderItem: { findMany: jest.fn() },
    product:   { update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../src/utils/audit.js',  () => ({ writeAuditLog: jest.fn() }));
jest.mock('../../src/utils/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  initiatePayment,
  verifyWebhook,
  processWebhook,
  handleFailedPayment,
} from '../../src/services/payment.service.js';
import { db } from '../../src/utils/db.js';

// ─── Typed accessors ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<(...args: any[]) => any>;

const db$ = db as unknown as {
  order:     Record<string, AnyMock>;
  payment:   Record<string, AnyMock>;
  orderItem: Record<string, AnyMock>;
  product:   Record<string, AnyMock>;
  $transaction: AnyMock;
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORDER_ID  = 'order-abc';
const USER_ID   = 'user-xyz';
const TX_REF    = 'SMART-test-uuid';
const FLW_HASH  = 'test-webhook-hash';

const MOCK_ORDER = {
  order_id:       ORDER_ID,
  user_id:        USER_ID,
  total_amount:   49.99,
  payment_status: 'UNPAID',
  status:         'PENDING',
};

const MOCK_PAYMENT = {
  payment_id:      'pay-1',
  order_id:        ORDER_ID,
  tx_ref:          TX_REF,
  amount:          49.99,
  currency:        'USD',
  status:          'PENDING',
  webhook_payload: null,
  order: { order_id: ORDER_ID, user_id: USER_ID },
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env['FLW_WEBHOOK_HASH'] = FLW_HASH;
  process.env['FLW_SECRET_KEY']   = 'FLWSECK_TEST-placeholder';
  process.env['APP_URL']          = 'http://localhost:5173';
});

// ─── initiatePayment ──────────────────────────────────────────────────────────

describe('initiatePayment', () => {
  it('throws 400 when the order is already paid or not found', async () => {
    db$.order['findFirst'].mockResolvedValue(null);

    await expect(
      initiatePayment(ORDER_ID, USER_ID, 'a@b.com', 'Alice', '+234'),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('already paid'),
    });
  });

  it('returns existing paymentUrl when a PENDING payment already exists', async () => {
    db$.order['findFirst'].mockResolvedValue(MOCK_ORDER);
    db$.payment['findUnique'].mockResolvedValue({
      ...MOCK_PAYMENT,
      status:          'PENDING',
      webhook_payload: { paymentUrl: 'https://flw.link/existing' },
    });

    // Spy on fetch to assert it is never called (idempotent path skips network)
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({} as Response);

    const result = await initiatePayment(ORDER_ID, USER_ID, 'a@b.com', 'Alice', '+234');

    expect(result).toEqual({ paymentUrl: 'https://flw.link/existing', tx_ref: TX_REF });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('creates a payment record and returns paymentUrl on success', async () => {
    db$.order['findFirst'].mockResolvedValue(MOCK_ORDER);
    db$.payment['findUnique'].mockResolvedValue(null);
    db$.payment['create'].mockResolvedValue(MOCK_PAYMENT);
    db$.order['update'].mockResolvedValue({});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchMock = jest.fn<(...args: any[]) => any>().mockResolvedValue({
      json: async () => ({ status: 'success', data: { link: 'https://flw.link/pay' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await initiatePayment(ORDER_ID, USER_ID, 'a@b.com', 'Alice', '+234');

    expect(result.paymentUrl).toBe('https://flw.link/pay');
    expect(db$.payment['create']).toHaveBeenCalledTimes(1);
    expect(db$.order['update']).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payment_status: 'PENDING' } }),
    );
  });
});

// ─── verifyWebhook ────────────────────────────────────────────────────────────

describe('verifyWebhook', () => {
  it('does not throw when the HMAC signature matches', () => {
    const body      = JSON.stringify({ event: 'charge.completed' });
    const validSig  = crypto.createHmac('sha256', FLW_HASH).update(body).digest('hex');
    expect(() => verifyWebhook(validSig, body)).not.toThrow();
  });

  it('throws 401 when the signature is invalid', () => {
    const body = JSON.stringify({ event: 'charge.completed' });
    expect(() => verifyWebhook('bad-signature', body)).toThrow(
      expect.objectContaining({ statusCode: 401, message: 'Invalid webhook signature' }),
    );
  });
});

// ─── processWebhook ──────────────────────────────────────────────────────────

describe('processWebhook', () => {
  const CHARGE_EVENT = {
    event: 'charge.completed',
    data:  { id: 99999, tx_ref: TX_REF, status: 'successful', amount: 49.99, currency: 'USD' },
  };

  it('returns null early when payment is already PAID (idempotency)', async () => {
    db$.payment['findUnique'].mockResolvedValue({ ...MOCK_PAYMENT, status: 'PAID' });

    const result = await processWebhook(CHARGE_EVENT);

    expect(result).toBeNull();
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('calls Flutterwave.Transaction.verify before updating the DB', async () => {
    db$.payment['findUnique'].mockResolvedValue(MOCK_PAYMENT);
    mockVerify.mockResolvedValue({
      status: 'success',
      data:   { status: 'successful', amount: 49.99, currency: 'USD' },
    });
    db$['$transaction'].mockResolvedValue([{}, {}]);

    await processWebhook(CHARGE_EVENT);

    expect(mockVerify).toHaveBeenCalledWith({ id: 99999 });
  });

  it('updates both payment and order inside a transaction on success', async () => {
    db$.payment['findUnique'].mockResolvedValue(MOCK_PAYMENT);
    mockVerify.mockResolvedValue({
      status: 'success',
      data:   { status: 'successful', amount: 49.99, currency: 'USD' },
    });
    db$['$transaction'].mockResolvedValue([{}, {}]);

    const result = await processWebhook(CHARGE_EVENT);

    expect(db$['$transaction']).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ orderId: ORDER_ID, userId: USER_ID });
  });
});

// ─── handleFailedPayment ─────────────────────────────────────────────────────

describe('handleFailedPayment', () => {
  it('restores stock for all order items on payment failure', async () => {
    db$.payment['findUnique'].mockResolvedValue(MOCK_PAYMENT);
    db$.orderItem['findMany'].mockResolvedValue([
      { order_item_id: 'oi-1', product_id: 'prod-a', quantity: 2, order_id: ORDER_ID },
      { order_item_id: 'oi-2', product_id: 'prod-b', quantity: 3, order_id: ORDER_ID },
    ]);
    db$['$transaction'].mockResolvedValue([{}, {}, {}, {}]);

    await handleFailedPayment(TX_REF);

    // $transaction is called with an array; verify it included 4 ops (2 stock + 1 payment + 1 order)
    const args = db$['$transaction'].mock.calls[0]?.[0] as unknown[];
    expect(Array.isArray(args)).toBe(true);
    expect((args as unknown[]).length).toBe(4);
  });

  it('returns early without DB writes when payment is already PAID', async () => {
    db$.payment['findUnique'].mockResolvedValue({ ...MOCK_PAYMENT, status: 'PAID' });

    await handleFailedPayment(TX_REF);

    expect(db$['$transaction']).not.toHaveBeenCalled();
    expect(db$.orderItem['findMany']).not.toHaveBeenCalled();
  });
});
