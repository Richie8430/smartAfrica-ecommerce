import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Encountered two children')) errors.push(m.text()); });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  const htmlHasDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  console.log('Initial dark class present?', await htmlHasDark());

  // Click the theme toggle (first icon-only button in the navbar's right controls)
  const toggle = page.getByRole('button', { name: /switch to (dark|light) mode/i });
  await toggle.waitFor({ state: 'visible', timeout: 5000 });
  await toggle.click();
  await page.waitForTimeout(200);
  console.log('After 1 click, dark class present?', await htmlHasDark());

  // Reload to confirm persistence
  await page.reload({ waitUntil: 'networkidle' });
  console.log('After reload, dark class present (should persist)?', await htmlHasDark());

  // Screenshot home in dark mode
  await page.screenshot({ path: '/tmp/home-dark.png', fullPage: false });

  // Toggle back to light
  await toggle.click();
  await page.waitForTimeout(200);
  console.log('After 2nd click, dark class present (should be false)?', await htmlHasDark());
  await page.screenshot({ path: '/tmp/home-light.png', fullPage: false });

  // Visit a few key pages in dark mode and check for console/page errors
  await toggle.click(); // back to dark
  for (const path of ['/products', '/login', '/register']) {
    await page.goto(`http://localhost:5173${path}`, { waitUntil: 'load' });
    await page.waitForTimeout(800);
  }

  console.log('Console/page errors collected:', JSON.stringify(errors.slice(0, 10)));
  await browser.close();
})();
