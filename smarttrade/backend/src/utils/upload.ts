import multer from 'multer';
import { createHash } from 'node:crypto';

const CLOUD_NAME  = process.env['CLOUDINARY_CLOUD_NAME']  ?? '';
const API_KEY     = process.env['CLOUDINARY_API_KEY']     ?? '';
const API_SECRET  = process.env['CLOUDINARY_API_SECRET']  ?? '';

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

// ─── Cloudinary upload via native fetch (SDK v2 broken on Node 22) ────────────

export async function uploadToCloudinary(
  buffer: Buffer,
  publicId: string,
): Promise<string> {
  const timestamp = Math.round(Date.now() / 1000);

  // Signature: sha256 of sorted param string + secret
  const toSign    = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
  const signature = createHash('sha256').update(toSign).digest('hex');

  const form = new FormData();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.append('file', new Blob([arrayBuffer]), 'upload');
  form.append('api_key',   API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('public_id', publicId);
  form.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${body}`);
  }

  const json = await res.json() as { secure_url: string };
  return json.secure_url;
}
