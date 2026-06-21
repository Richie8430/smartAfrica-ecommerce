import { Router } from 'express';
import {
  listProducts,
  getProduct,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  listCategories,
  createCategory,
} from '../controllers/product.controller.js';
import { authenticate }     from '../middlewares/authenticate.middleware.js';
import { requireRole }      from '../middlewares/require.role.middleware.js';
import { validateBody }     from '../middlewares/validate.middleware.js';
import { validateQuery }    from '../middlewares/validate.query.js';
import { uploadMiddleware }  from '../utils/upload.js';
import {
  listProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
} from '../schemas/product.schema.js';

const router = Router();

// ─── Static paths first — must precede /:id ───────────────────────────────────

/**
 * @openapi
 * /products/search:
 *   get:
 *     summary: Search products by keyword
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Matching products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { type: object } }
 *       400:
 *         description: Query parameter "q" is required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
// GET /products/search?q=...  (public)
router.get('/search', searchProducts);

/**
 * @openapi
 * /products/categories:
 *   get:
 *     summary: List all product categories
 *     tags: [Products]
 *     security: []
 *     responses:
 *       200:
 *         description: List of categories
 */
// GET /products/categories     (public)
router.get('/categories', listCategories);

/**
 * @openapi
 * /products/categories:
 *   post:
 *     summary: Create a product category (admin only)
 *     description: Requires ADMIN role.
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 100 }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Category created successfully
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
// POST /products/categories    (admin)
router.post(
  '/categories',
  authenticate,
  requireRole('ADMIN'),
  validateBody(createCategorySchema),
  createCategory,
);

// ─── Collection routes ────────────────────────────────────────────────────────

/**
 * @openapi
 * /products:
 *   get:
 *     summary: List products with pagination, sorting, and filters
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: category_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: min_price
 *         schema: { type: number, minimum: 0 }
 *       - in: query
 *         name: max_price
 *         schema: { type: number, minimum: 0 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, price_asc, price_desc], default: newest }
 *     responses:
 *       200:
 *         description: Paginated list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { type: object } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 totalPages: { type: integer }
 *                 limit: { type: integer }
 */
// GET /products?page=&limit=&sort=&category_id=  (public)
router.get('/', validateQuery(listProductsQuerySchema), listProducts);

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Create a product (admin only)
 *     description: Requires ADMIN role.
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, price, stock_qty, category_id]
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 200 }
 *               description: { type: string, minLength: 1 }
 *               price: { type: number, exclusiveMinimum: 0 }
 *               stock_qty: { type: integer, minimum: 0 }
 *               category_id: { type: string, format: uuid }
 *               image_url: { type: string, format: uri }
 *     responses:
 *       201:
 *         description: Product created successfully
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
// POST /products  (admin)
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validateBody(createProductSchema),
  createProduct,
);

// ─── Resource routes (:id last so static paths are matched first) ─────────────

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
// GET /products/:id   (public)
router.get('/:id', getProduct);

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     summary: Update a product (admin only)
 *     description: Requires ADMIN role. All fields optional (partial update).
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 200 }
 *               description: { type: string, minLength: 1 }
 *               price: { type: number, exclusiveMinimum: 0 }
 *               stock_qty: { type: integer, minimum: 0 }
 *               category_id: { type: string, format: uuid }
 *               image_url: { type: string, format: uri }
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
// PUT /products/:id   (admin)
router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateBody(updateProductSchema),
  updateProduct,
);

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Delete a product (admin only)
 *     description: Requires ADMIN role.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
// DELETE /products/:id  (admin)
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  deleteProduct,
);

/**
 * @openapi
 * /products/{id}/images:
 *   post:
 *     summary: Upload a product image (admin only)
 *     description: Requires ADMIN role. Multipart form upload, field name "image".
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Product image uploaded successfully
 *       400:
 *         description: "Image file is required (field name: image)"
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
// POST /products/:id/images  (admin)
router.post(
  '/:id/images',
  authenticate,
  requireRole('ADMIN'),
  uploadMiddleware,
  uploadImage,
);

export default router;
