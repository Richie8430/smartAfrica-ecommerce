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

// GET /products/search?q=...  (public)
router.get('/search', searchProducts);

// GET /products/categories     (public)
router.get('/categories', listCategories);

// POST /products/categories    (admin)
router.post(
  '/categories',
  authenticate,
  requireRole('ADMIN'),
  validateBody(createCategorySchema),
  createCategory,
);

// ─── Collection routes ────────────────────────────────────────────────────────

// GET /products?page=&limit=&sort=&category_id=  (public)
router.get('/', validateQuery(listProductsQuerySchema), listProducts);

// POST /products  (admin)
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validateBody(createProductSchema),
  createProduct,
);

// ─── Resource routes (:id last so static paths are matched first) ─────────────

// GET /products/:id   (public)
router.get('/:id', getProduct);

// PUT /products/:id   (admin)
router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validateBody(updateProductSchema),
  updateProduct,
);

// DELETE /products/:id  (admin)
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  deleteProduct,
);

// POST /products/:id/images  (admin)
router.post(
  '/:id/images',
  authenticate,
  requireRole('ADMIN'),
  uploadMiddleware,
  uploadImage,
);

export default router;
