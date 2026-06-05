import DOMPurify from 'isomorphic-dompurify';
import { db }          from '../utils/db.js';
import * as tokenStore from '../utils/token.store.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError }      from '../utils/errors.js';
import type { ListProductsQuery, CreateProductInput, UpdateProductInput, CreateCategoryInput } from '../schemas/product.schema.js';

/** Strip all HTML — keeps plain text, removes script/style/iframe/etc. */
function sanitize(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// ─── Listing ──────────────────────────────────────────────────────────────────

export async function listProducts(params: Partial<ListProductsQuery>) {
  const {
    page        = 1,
    limit       = 20,
    category_id,
    min_price,
    max_price,
    sort        = 'newest',
  } = params;

  // Stable cache key — Zod always outputs keys in schema-definition order.
  const cacheKey = `list:${JSON.stringify({ page, limit, category_id, min_price, max_price, sort })}`;
  const cached = await tokenStore.getCachedProducts<ReturnType<typeof buildPaginatedResponse>>(cacheKey);
  if (cached) return cached;

  // Build Prisma where clause
  const where = {
    is_active: true,
    ...(category_id ? { category_id } : {}),
    ...((min_price !== undefined || max_price !== undefined)
      ? {
          price: {
            ...(min_price !== undefined ? { gte: min_price } : {}),
            ...(max_price !== undefined ? { lte: max_price } : {}),
          },
        }
      : {}),
  };

  const orderBy =
    sort === 'price_asc'  ? { price: 'asc'  as const } :
    sort === 'price_desc' ? { price: 'desc' as const } :
                            { created_at: 'desc' as const };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      take:    limit,
      skip:    (page - 1) * limit,
      include: { category: { select: { name: true, slug: true } } },
    }),
    db.product.count({ where }),
  ]);

  const result = buildPaginatedResponse(products, total, page, limit);
  await tokenStore.cacheProducts(cacheKey, result, 300);
  return result;
}

function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  };
}

// ─── Single product ───────────────────────────────────────────────────────────

export async function getProductById(productId: string) {
  const product = await db.product.findFirst({
    where:   { product_id: productId, is_active: true },
    include: { category: true },
  });
  if (!product) throw new AppError(404, 'Product not found');
  return product;
}

// ─── Full-text search ─────────────────────────────────────────────────────────

export async function searchProducts(query: string) {
  if (query.trim().length < 2) {
    throw new AppError(400, 'Search query must be at least 2 characters');
  }

  // Strip special characters so plainto_tsquery never sees dangerous input.
  // plainto_tsquery already handles operator removal; this is an extra safety layer.
  const sanitized = query.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  if (!sanitized) throw new AppError(400, 'Search query contains only unsupported characters');

  const results = await db.$queryRaw<unknown[]>`
    SELECT *,
      ts_rank(
        to_tsvector('english', name || ' ' || description),
        plainto_tsquery('english', ${sanitized})
      ) AS rank
    FROM "Product"
    WHERE is_active = true
      AND to_tsvector('english', name || ' ' || description)
          @@ plainto_tsquery('english', ${sanitized})
    ORDER BY rank DESC
    LIMIT 20
  `;

  return results;
}

// ─── CRUD (admin-only) ────────────────────────────────────────────────────────

export async function createProduct(data: CreateProductInput, userId?: string) {
  const category = await db.category.findUnique({
    where: { category_id: data.category_id },
  });
  if (!category) throw new AppError(404, 'Category not found');

  const sanitized = { ...data, name: sanitize(data.name), description: sanitize(data.description) };
  const product = await db.product.create({ data: sanitized });

  await tokenStore.bustProductCache();
  writeAuditLog({ userId, action: 'PRODUCT_CREATED', metadata: { product_id: product.product_id } });

  return product;
}

export async function updateProduct(
  productId: string,
  data: UpdateProductInput,
  userId?: string,
) {
  const existing = await db.product.findFirst({
    where: { product_id: productId, is_active: true },
  });
  if (!existing) throw new AppError(404, 'Product not found');

  const sanitized = {
    ...data,
    ...(data.name        !== undefined ? { name:        sanitize(data.name)        } : {}),
    ...(data.description !== undefined ? { description: sanitize(data.description) } : {}),
  };
  const product = await db.product.update({
    where: { product_id: productId },
    data:  sanitized,
  });

  await tokenStore.bustProductCache();
  writeAuditLog({ userId, action: 'PRODUCT_UPDATED', metadata: { product_id: productId } });

  return product;
}

export async function deleteProduct(productId: string, userId?: string) {
  const existing = await db.product.findFirst({
    where: { product_id: productId, is_active: true },
  });
  if (!existing) throw new AppError(404, 'Product not found');

  // Soft delete — preserves order history and audit trail.
  await db.product.update({
    where: { product_id: productId },
    data:  { is_active: false },
  });

  await tokenStore.bustProductCache();
  writeAuditLog({ userId, action: 'PRODUCT_DELETED', metadata: { product_id: productId } });
}

export async function uploadProductImage(productId: string, imageUrl: string) {
  const existing = await db.product.findFirst({
    where: { product_id: productId, is_active: true },
  });
  if (!existing) throw new AppError(404, 'Product not found');

  return db.product.update({
    where: { product_id: productId },
    data:  { image_url: imageUrl },
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listCategories() {
  return db.category.findMany({
    where:   { is_active: true },
    include: {
      _count: {
        select: { products: { where: { is_active: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(data: CreateCategoryInput) {
  const slug = data.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const existing = await db.category.findFirst({
    where: { OR: [{ name: data.name }, { slug }] },
  });
  if (existing) throw new AppError(409, 'Category name already exists');

  return db.category.create({ data: { ...data, slug } });
}
