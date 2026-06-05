/**
 * Unit tests for order.service.ts
 * Prisma db (including $transaction) and audit are mocked.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../../src/utils/db.js', () => ({
  db: {
    cartItem:  { findMany: jest.fn(), deleteMany: jest.fn() },
    product:   { findUnique: jest.fn(), update: jest.fn() },
    order:     { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    orderItem: { createMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../src/utils/audit.js', () => ({ writeAuditLog: jest.fn() }));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { createOrder, getOrder } from '../../src/services/order.service.js';
import { db }                    from '../../src/utils/db.js';

// ─── Typed accessors ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<(...args: any[]) => any>;

const db$ = db as unknown as {
  cartItem:     Record<string, AnyMock>;
  product:      Record<string, AnyMock>;
  order:        Record<string, AnyMock>;
  orderItem:    Record<string, AnyMock>;
  $transaction: AnyMock;
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SHIPPING = {
  street:     '12 Lagos Rd',
  city:       'Abuja',
  state:      'FCT',
  country:    'Nigeria',
  postalCode: '900211',
};

const PRODUCT_A = {
  product_id: 'prod-a',
  name:       'Wireless Headphones',
  price:      199.99,
  stock_qty:  10,
  is_active:  true,
};

const PRODUCT_B = {
  product_id: 'prod-b',
  name:       'Yoga Mat',
  price:      30,
  stock_qty:  5,
  is_active:  true,
};

const CART_ITEMS = [
  { cart_item_id: 'ci-1', product_id: 'prod-a', user_id: 'user-1', quantity: 2, product: PRODUCT_A },
  { cart_item_id: 'ci-2', product_id: 'prod-b', user_id: 'user-1', quantity: 3, product: PRODUCT_B },
];

const CREATED_ORDER = {
  order_id:         'order-abc',
  user_id:          'user-1',
  status:           'PENDING',
  total_amount:     490.0,
  shipping_address: SHIPPING,
  created_at:       new Date(),
  updated_at:       new Date(),
};

/** Helper: mock $transaction to call callback immediately with the mocked db. */
function mockTransaction() {
  db$['$transaction'].mockImplementation(
    async (cb: (tx: typeof db) => Promise<unknown>) => cb(db as unknown as typeof db),
  );
}

beforeEach(() => { jest.clearAllMocks(); });

// ─── createOrder ──────────────────────────────────────────────────────────────

describe('createOrder', () => {
  it('throws 400 when the cart is empty', async () => {
    db$.cartItem['findMany'].mockResolvedValue([]);

    await expect(createOrder('user-1', SHIPPING)).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('empty'),
    });
    expect(db$['$transaction']).not.toHaveBeenCalled();
  });

  it('throws 400 when a cart item has insufficient stock (pre-flight check)', async () => {
    db$.cartItem['findMany'].mockResolvedValue([
      { ...CART_ITEMS[0], quantity: 99, product: { ...PRODUCT_A, stock_qty: 5 } },
    ]);

    await expect(createOrder('user-1', SHIPPING)).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('unavailable'),
    });
    expect(db$['$transaction']).not.toHaveBeenCalled();
  });

  it('decrements stock_qty for each item inside the transaction', async () => {
    db$.cartItem['findMany'].mockResolvedValue(CART_ITEMS);
    mockTransaction();

    // Within the tx: re-check returns same products with enough stock
    db$.product['findUnique']
      .mockResolvedValueOnce(PRODUCT_A)
      .mockResolvedValueOnce(PRODUCT_B);
    db$.product['update'].mockResolvedValue({});
    db$.order['create'].mockResolvedValue(CREATED_ORDER);
    db$.orderItem['createMany'].mockResolvedValue({ count: 2 });
    db$.cartItem['deleteMany'].mockResolvedValue({ count: 2 });
    db$.order['findUnique'].mockResolvedValue({ ...CREATED_ORDER, order_items: [] });

    await createOrder('user-1', SHIPPING);

    // Both products must have been decremented
    expect(db$.product['update']).toHaveBeenCalledTimes(2);
    expect(db$.product['update']).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock_qty: { decrement: 2 } } }),
    );
    expect(db$.product['update']).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock_qty: { decrement: 3 } } }),
    );
  });

  it('clears the cart after successfully creating the order', async () => {
    db$.cartItem['findMany'].mockResolvedValue(CART_ITEMS);
    mockTransaction();

    db$.product['findUnique']
      .mockResolvedValueOnce(PRODUCT_A)
      .mockResolvedValueOnce(PRODUCT_B);
    db$.product['update'].mockResolvedValue({});
    db$.order['create'].mockResolvedValue(CREATED_ORDER);
    db$.orderItem['createMany'].mockResolvedValue({ count: 2 });
    db$.cartItem['deleteMany'].mockResolvedValue({ count: 2 });
    db$.order['findUnique'].mockResolvedValue({ ...CREATED_ORDER, order_items: [] });

    await createOrder('user-1', SHIPPING);

    expect(db$.cartItem['deleteMany']).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 'user-1' } }),
    );
  });

  it('rolls back: order.create is NOT called when stock fails mid-transaction', async () => {
    db$.cartItem['findMany'].mockResolvedValue(CART_ITEMS);
    mockTransaction();

    // First product ok, second has insufficient stock inside tx
    db$.product['findUnique']
      .mockResolvedValueOnce(PRODUCT_A)
      .mockResolvedValueOnce({ ...PRODUCT_B, stock_qty: 0 });
    db$.product['update'].mockResolvedValue({});

    await expect(createOrder('user-1', SHIPPING)).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('Insufficient stock'),
    });

    expect(db$.order['create']).not.toHaveBeenCalled();
  });
});

// ─── getOrder ─────────────────────────────────────────────────────────────────

describe('getOrder', () => {
  it('returns the order when orderId and userId match', async () => {
    db$.order['findFirst'].mockResolvedValue({ ...CREATED_ORDER, order_items: [], payment: null });

    const result = await getOrder('order-abc', 'user-1');
    expect(result.order_id).toBe('order-abc');
  });

  it('throws 404 when the order belongs to a different user', async () => {
    // findFirst with user_id filter returns null for wrong user
    db$.order['findFirst'].mockResolvedValue(null);

    await expect(getOrder('order-abc', 'wrong-user')).rejects.toMatchObject({
      statusCode: 404,
      message:    expect.stringContaining('not found'),
    });
  });
});
