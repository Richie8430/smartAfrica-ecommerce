import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { Readable } from 'node:stream';

// ─── Cloudinary config (reads from env at module load) ────────────────────────
cloudinary.config({
  cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
  api_key:    process.env['CLOUDINARY_API_KEY'],
  api_secret: process.env['CLOUDINARY_API_SECRET'],
  secure:     true,
});

// ─── Multer — memory storage (no disk writes) ─────────────────────────────────
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted'));
    }
  },
}).single('image');

// ─── Cloudinary stream upload ─────────────────────────────────────────────────

/**
 * Uploads a Buffer to Cloudinary via a writable stream.
 * Returns the secure CDN URL of the uploaded image.
 */
export function uploadToCloudinary(
  buffer: Buffer,
  publicId: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id:     `smarttrade/products/${publicId}`,
        resource_type: 'image',
        overwrite:     true,
        format:        'webp',   // auto-convert to WebP for size savings
        quality:       'auto',
      },
      (error: Error | undefined, result: UploadApiResponse | undefined) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary returned no result'));
        resolve(result.secure_url);
      },
    );

    // Pipe buffer into the upload stream
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}
