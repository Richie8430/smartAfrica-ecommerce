/**
 * Typed HTTP error.  Throw inside services; controllers catch and call error().
 * Using `new.target.prototype` ensures instanceof checks survive TypeScript
 * transpilation to CommonJS (where extends Error is broken without it).
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
