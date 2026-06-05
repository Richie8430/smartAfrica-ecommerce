/**
 * One-time helper — run via:  npm run generate:keys
 * Writes RSA-2048 PEM key pair to  backend/keys/
 * The keys/ directory is git-ignored and must never be committed.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve keys/ relative to this script so it always lands in backend/keys/
// regardless of the cwd from which the script is invoked.
const keysDir = path.resolve(__dirname, '../../keys');

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey, { mode: 0o600 });
fs.writeFileSync(path.join(keysDir, 'public.pem'), publicKey, { mode: 0o644 });

console.log(`Keys generated at  ${keysDir}`);
console.log('  private.pem  (mode 0600 — keep secret)');
console.log('  public.pem   (mode 0644)');
