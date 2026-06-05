import type { Request, Response, NextFunction } from 'express';
import * as productService from '../services/product.service.js';
import { uploadToCloudinary } from '../utils/upload.js';
import { AppError }          from '../utils/errors.js';
import { success, error }    from '../utils/response.js';
import type { ListProductsQuery, CreateProductInput, UpdateProductInput, CreateCategoryInput } from '../schemas/product.schema.js';

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof AppError) { error(res, err.message, err.statusCode); return; }
  next(err);
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // validateQuery middleware has already coerced and replaced req.query
    const params = req.query as unknown as ListProductsQuery;
    const result = await productService.listProducts(params);
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = String(req.params['id'] ?? '');
    const product   = await productService.getProductById(productId);
    success(res, product);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = String(req.query['q'] ?? '');
    if (!q) { error(res, 'Query parameter "q" is required', 400); return; }

    const results = await productService.searchProducts(q);
    success(res, results);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId  = req.user!.userId;
    const product = await productService.createProduct(req.body as CreateProductInput, userId);
    success(res, product, 201, 'Product created successfully');
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = String(req.params['id'] ?? '');
    const userId    = req.user!.userId;
    const product   = await productService.updateProduct(
      productId,
      req.body as UpdateProductInput,
      userId,
    );
    success(res, product, 200, 'Product updated successfully');
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = String(req.params['id'] ?? '');
    const userId    = req.user!.userId;
    await productService.deleteProduct(productId, userId);
    success(res, null, 200, 'Product deleted successfully');
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = String(req.params['id'] ?? '');
    if (!req.file) {
      error(res, 'Image file is required (field name: image)', 400);
      return;
    }

    const publicId  = `product-${productId}-${Date.now()}`;
    const secureUrl = await uploadToCloudinary(req.file.buffer, publicId);
    const product   = await productService.uploadProductImage(productId, secureUrl);
    success(res, product, 200, 'Product image uploaded successfully');
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await productService.listCategories();
    success(res, categories);
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await productService.createCategory(req.body as CreateCategoryInput);
    success(res, category, 201, 'Category created successfully');
  } catch (err) {
    handleError(err, res, next);
  }
}
