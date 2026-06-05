import type { Response } from 'express';
import type { ApiResponse, PaginatedResponse } from '../types/index.js';

export function success<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
): void {
  const body: ApiResponse<T> = { success: true, data };
  if (message) body.message = message;
  res.status(statusCode).json(body);
}

export function error(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown,
): void {
  const body: Record<string, unknown> = { success: false, error: message };
  if (errors !== undefined) body['errors'] = errors;
  res.status(statusCode).json(body);
}

export function paginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
): void {
  const totalPages = Math.ceil(total / limit);
  const body: { success: true } & PaginatedResponse<T> = {
    success: true,
    data,
    total,
    page,
    totalPages,
    limit,
  };
  res.status(200).json(body);
}
