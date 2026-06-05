/**
 * Unit tests for product.service.ts
 * Prisma, Redis cache, and audit are all mocked.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../../src/utils/db.js', () => ({
  db: {
    product: {
      findMany:  jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count:     jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
      delete:    jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
      findMany:   jest.fn(),
      create:     jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../../src/utils/token.store.js', () => ({
  getCachedProducts: jest.fn(),
  cacheProducts:     jest.fn(),
  bustProductCache:  jest.fn(),
}));

jest.mock('../../src/utils/audit.js', () => ({ writeAuditLog: jest.fn() }));

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  listProducts,
  getProductById,
  searchProducts,
  createProduct,
  deleteProduct,
} from '../../src/services/product.service.js';

import { db }          from '../../src/utils/db.js';
import * as tokenStore from '../../src/utils/token.store.js';

// ─── Typed accessors ──────────────────────────────────────────────────────────

// jest-mock's ResolveType<T> = ReturnType<T> extends PromiseLike<infer U> ? U : never.
// If ReturnType is `unknown` (not a PromiseLike), mockResolvedValue accepts `never`.
// Using `any` keeps all mock helpers (mockReturnValue, mockResolvedValue, etc.) open.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<(...args: any[]) => any>;

const db$ = db as unknown as {
  product:  Record<string, AnyMock>;
  category: Record<string, AnyMock>;
  $queryRaw: AnyMock;
};

const ts$ = tokenStore as unknown as Record<string, AnyMock>;

// ─── Fixture ──────────────────────────────────────────────────────────────────

const PRODUCT = {
  product_id:  'prod-001',
  name:        'Test Headphones',
  description: 'Great sound',
  price:       199.99,
  stock_qty:   50,
  category_id: 'cat-001',
  image_url:   null,
  is_active:   true,
  created_at:  new Date(),
  updated_at:  new Date(),
};

beforeEach(() => {jest.clearAllMocks();});

// ─── listProducts ─────────────────────────────────────────────────────────────

describe('listProducts', () => {
  it('returns cached data immediately on cache hit — no DB query', async () => {
    const cached = { data: [PRODUCT], total: 1, page: 1, totalPages: 1, limit: 20 };
    ts$['getCachedProducts'].mockResolvedValue(cached);

    const result = await listProducts({});

    expect(result).toEqual(cached);
    expect(db$.product['findMany']).not.toHaveBeenCalled();
    expect(db$.product['count']).not.toHaveBeenCalled();
  });

  it('queries DB, caches result, and returns paginated data on cache miss', async () => {
    ts$['getCachedProducts'].mockResolvedValue(null);
    db$.product['findMany'].mockResolvedValue([PRODUCT]);
    db$.product['count'].mockResolvedValue(1);
    ts$['cacheProducts'].mockResolvedValue(undefined);

    const result = await listProducts({ page: 1, limit: 20, sort: 'newest' });

    expect(db$.product['findMany']).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20, skip: 0 }),
    );
    expect(ts$['cacheProducts']).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });
});

// ─── getProductById ───────────────────────────────────────────────────────────

describe('getProductById', () => {
  it('returns the product when found and is_active=true', async () => {
    db$.product['findFirst'].mockResolvedValue(PRODUCT);
    const result = await getProductById('prod-001');
    expect(result.product_id).toBe('prod-001');
  });

  it('throws 404 when product is not found (inactive or missing)', async () => {
    db$.product['findFirst'].mockResolvedValue(null);
    await expect(getProductById('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      message:    expect.stringContaining('not found'),
    });
  });
});

// ─── searchProducts ───────────────────────────────────────────────────────────

describe('searchProducts', () => {
  it('throws 400 when the query is fewer than 2 characters', async () => {
    await expect(searchProducts('a')).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining('2 characters'),
    });
  });

  it('throws 400 when query contains only special characters', async () => {
    await expect(searchProducts('!!!')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('executes raw FTS query and returns results for a valid query', async () => {
    const ftsResults = [{ ...PRODUCT, rank: 0.9 }];
    db$['$queryRaw'].mockResolvedValue(ftsResults);

    const results = await searchProducts('headphones');
    expect(db$['$queryRaw']).toHaveBeenCalled();
    expect(results).toEqual(ftsResults);
  });
});

// ─── createProduct ────────────────────────────────────────────────────────────

describe('createProduct', () => {
  it('busts the product cache and writes an audit log on success', async () => {
    db$.category['findUnique'].mockResolvedValue({ category_id: 'cat-001' });
    db$.product['create'].mockResolvedValue(PRODUCT);
    ts$['bustProductCache'].mockResolvedValue(1);

    await createProduct(
      {
        name:        'Test',
        description: 'Test product',
        price:       9.99,
        stock_qty:   10,
        category_id: 'cat-001',
      },
      'admin-user-id',
    );

    expect(ts$['bustProductCache']).toHaveBeenCalled();
  });

  it('throws 404 when category_id does not exist', async () => {
    db$.category['findUnique'].mockResolvedValue(null);

    await expect(
      createProduct({
        name: 'X', description: 'y', price: 1, stock_qty: 0, category_id: 'bad-id',
      }),
    ).rejects.toMatchObject({ statusCode: 404, message: expect.stringContaining('Category') });
  });
});

// ─── deleteProduct ────────────────────────────────────────────────────────────

describe('deleteProduct', () => {
  it('soft-deletes by setting is_active=false — does not hard-delete', async () => {
    db$.product['findFirst'].mockResolvedValue(PRODUCT);
    db$.product['update'].mockResolvedValue({ ...PRODUCT, is_active: false });
    ts$['bustProductCache'].mockResolvedValue(1);

    await deleteProduct('prod-001', 'admin-user-id');

    // Verify update was called with is_active: false, NOT product.delete
    expect(db$.product['update']).toHaveBeenCalledWith(
      expect.objectContaining({ data: { is_active: false } }),
    );
    expect(db$.product['delete']).not.toHaveBeenCalled();
  });

  it('throws 404 when product is already inactive or missing', async () => {
    db$.product['findFirst'].mockResolvedValue(null);
    await expect(deleteProduct('ghost-id')).rejects.toMatchObject({ statusCode: 404 });
  });
});
