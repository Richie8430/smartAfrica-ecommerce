/**
 * Global E2E teardown — removes test fixtures created by globalSetup.
 */

export default async function globalTeardown() {
  try {
    await fetch('http://localhost:4000/api/v1/dev/cleanup', {
      method:  'DELETE',
      headers: { 'X-CSRF-Token': 'skip' },
    });
    console.log('[teardown] Test fixtures cleaned up');
  } catch {
    console.warn('[teardown] Could not clean up test fixtures (server may be down)');
  }
}
