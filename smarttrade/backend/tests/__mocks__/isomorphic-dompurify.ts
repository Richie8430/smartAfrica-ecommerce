/**
 * Lightweight DOMPurify stub for Jest's CommonJS environment.
 * isomorphic-dompurify → jsdom → @exodus/bytes uses ESM export {} syntax
 * which cannot be parsed in CJS mode without a full Babel transform.
 *
 * This stub replicates the behaviour used by the product service:
 *   DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
 *
 * It strips:
 *  - script/style tags WITH their inner content (dangerous code removed)
 *  - all other HTML tags (text content preserved)
 *  - inline event handlers via attribute patterns
 */

function sanitize(dirty: string): string {
  return dirty
    // Remove script/style blocks including their content
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Remove remaining HTML tags (keep text nodes)
    .replace(/<[^>]+>/g, '')
    // Collapse multiple spaces left by removed tags
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

const DOMPurify = { sanitize };

// Support both default import and named import patterns
export default DOMPurify;
export { sanitize };
module.exports         = DOMPurify;
module.exports.default = DOMPurify;
module.exports.sanitize = sanitize;
