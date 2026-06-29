# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: webauthn.spec.ts >> WebAuthn / Biometric flows — cancellation and revoke >> Test 4 — Revoke credential
- Location: e2e/tests/webauthn.spec.ts:133:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Enable fingerprint login' })
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByRole('heading', { name: 'Enable fingerprint login' })

```

```yaml
- banner:
  - link "SmartTrade Africa":
    - /url: /
    - img
    - text: SmartTrade Africa
  - textbox "Search products…"
  - img
  - navigation:
    - link "Products":
      - /url: /products
  - link "Cart, 0 items":
    - /url: /cart
    - img
  - button "Test Customer":
    - img "Test Customer"
    - img
  - paragraph: Test Customer
  - paragraph: customer@smarttrade.test
  - navigation:
    - link "My Account":
      - /url: /account
    - link "Orders":
      - /url: /account/orders
    - link "Profile":
      - /url: /account/profile
    - link "Security":
      - /url: /account/security
    - button "Sign out"
- main:
  - complementary:
    - img "Test Customer"
    - paragraph: Test Customer
    - paragraph: customer@smarttrade.test
    - navigation "Account sections":
      - link "Dashboard":
        - /url: /account
      - link "Profile":
        - /url: /account/profile
      - link "Orders":
        - /url: /account/orders
      - link "Security":
        - /url: /account/security
      - link "Addresses":
        - /url: /account/addresses
    - button "Sign out of your account":
      - img
      - text: Sign out
  - main:
    - heading "Good afternoon, Test!" [level=2]
    - paragraph: Here's what's happening with your account.
    - status "Biometric verification active":
      - img
      - text: Biometric Verified
    - link "0 Total orders":
      - /url: /account/orders
      - paragraph: "0"
      - paragraph: Total orders
    - link "– Loyalty points":
      - /url: /account
      - paragraph: –
      - paragraph: Loyalty points
    - link "0 Saved addresses":
      - /url: /account/addresses
      - paragraph: "0"
      - paragraph: Saved addresses
    - heading "Recent orders" [level=3]
    - link "View all":
      - /url: /account/orders
      - text: View all
      - img
    - img
    - paragraph: No orders yet
    - link "Start shopping":
      - /url: /products
      - button "Start shopping":
        - text: Start shopping
        - img
- contentinfo:
  - paragraph: SmartTrade Africa
  - paragraph: Your trusted marketplace across Africa.
  - paragraph: Shop
  - list:
    - listitem:
      - link "Products":
        - /url: /products
    - listitem:
      - link "Categories":
        - /url: /products
    - listitem:
      - link "New Arrivals":
        - /url: /products?sort=newest
  - paragraph: Account
  - list:
    - listitem:
      - link "My Orders":
        - /url: /account/orders
    - listitem:
      - link "Profile":
        - /url: /account/profile
    - listitem:
      - link "Security":
        - /url: /account/security
  - paragraph: Legal
  - list:
    - listitem:
      - link "Privacy Policy":
        - /url: /privacy
    - listitem:
      - link "Terms of Use":
        - /url: /terms
  - text: © 2026 SmartTrade Africa. All rights reserved.
- region "Notifications (F8)":
  - list
- dialog "Cookie consent":
  - paragraph:
    - text: We use cookies to improve your experience.
    - link "View our Privacy Policy":
      - /url: /privacy
    - text: .
  - button "Reject non-essential"
  - button "Accept all"
```

# Test source

```ts
  41  |     cdp     = await context.newCDPSession(page);
  42  |     await addVirtualAuthenticator(cdp);
  43  |   });
  44  | 
  45  |   test.afterAll(async () => {
  46  |     await context.close();
  47  |   });
  48  | 
  49  |   test('Test 1 — Enrollment flow', async () => {
  50  |     await loginAsCustomer(page);
  51  | 
  52  |     // The post-login enroll prompt should appear automatically for a user
  53  |     // without biometric_enrolled yet.
  54  |     await expect(page.getByRole('heading', { name: 'Enable fingerprint login' })).toBeVisible({ timeout: 8_000 });
  55  | 
  56  |     await page.getByRole('button', { name: 'Enable fingerprint login' }).click();
  57  | 
  58  |     // Virtual authenticator auto-approves the ceremony.
  59  |     await expect(page.getByText('Fingerprint enabled!')).toBeVisible({ timeout: 15_000 });
  60  | 
  61  |     await page.getByRole('button', { name: 'Got it' }).click();
  62  |     await page.waitForURL((url) => url.pathname.startsWith('/account'), { timeout: 10_000 });
  63  |     await expect(page).toHaveURL(/\/account/);
  64  | 
  65  |     // Verify the DB state — navigating to Security triggers a real authenticated
  66  |     // GET /auth/webauthn/credentials, so a populated list is a direct read of
  67  |     // what verifyRegistration() persisted (credential row + biometric_enrolled).
  68  |     await page.goto('/account/security');
  69  |     await page.waitForLoadState('networkidle');
  70  |     await expect(page.locator('li', { hasText: 'Enrolled' }).first()).toBeVisible({ timeout: 8_000 });
  71  |   });
  72  | 
  73  |   test('Test 2 — Biometric login flow', async () => {
  74  |     // Log out (clear client-side session) — the credential from Test 1 is
  75  |     // still registered with the same virtual authenticator on this page.
  76  |     await context.clearCookies();
  77  |     await page.evaluate(() => localStorage.removeItem('smarttrade_auth'));
  78  | 
  79  |     await page.goto('/login');
  80  |     await page.waitForLoadState('networkidle');
  81  | 
  82  |     await page.locator('input[type="email"]').first().fill(CUSTOMER_EMAIL);
  83  |     await page.getByRole('button', { name: /sign in with fingerprint/i }).click();
  84  | 
  85  |     await page.waitForURL((url) => url.pathname.startsWith('/account'), { timeout: 15_000 });
  86  |     await expect(page).toHaveURL(/\/account/);
  87  |     await expect(page.getByText(/welcome back|test customer/i).first()).toBeVisible({ timeout: 5_000 });
  88  |   });
  89  | });
  90  | 
  91  | test.describe('WebAuthn / Biometric flows — cancellation and revoke', () => {
  92  | 
  93  |   test('Test 3 — Cancellation is handled gracefully', async ({ browser }) => {
  94  |     const context = await browser.newContext();
  95  |     const page    = await context.newPage();
  96  |     const cdp     = await context.newCDPSession(page);
  97  |     const authId  = await addVirtualAuthenticator(cdp);
  98  | 
  99  |     try {
  100 |       // Enroll a credential first so the auth-challenge step succeeds and we
  101 |       // actually reach the authenticator ceremony (otherwise we'd just hit the
  102 |       // "no fingerprint enrolled" case instead of a cancellation).
  103 |       await loginAsCustomer(page);
  104 |       await expect(page.getByRole('heading', { name: 'Enable fingerprint login' })).toBeVisible({ timeout: 8_000 });
  105 |       await page.getByRole('button', { name: 'Enable fingerprint login' }).click();
  106 |       await expect(page.getByText('Fingerprint enabled!')).toBeVisible({ timeout: 15_000 });
  107 |       await page.getByRole('button', { name: 'Got it' }).click();
  108 | 
  109 |       await context.clearCookies();
  110 |       await page.evaluate(() => localStorage.removeItem('smarttrade_auth'));
  111 | 
  112 |       // Remove the virtual authenticator — the next ceremony has nothing to
  113 |       // respond with, which is what we use to provoke the "cancelled" path.
  114 |       await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId: authId });
  115 | 
  116 |       await page.goto('/login');
  117 |       await page.waitForLoadState('networkidle');
  118 |       await page.locator('input[type="email"]').first().fill(CUSTOMER_EMAIL);
  119 |       await page.getByRole('button', { name: /sign in with fingerprint/i }).click();
  120 | 
  121 |       // Expect a visible error — not a crash, not a silent hang.
  122 |       await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 15_000 });
  123 | 
  124 |       // The login form must still be visible and usable.
  125 |       await expect(page.locator('input[type="email"]')).toBeVisible();
  126 |       await expect(page.locator('input[type="password"]')).toBeVisible();
  127 |       await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  128 |     } finally {
  129 |       await context.close();
  130 |     }
  131 |   });
  132 | 
  133 |   test('Test 4 — Revoke credential', async ({ browser }) => {
  134 |     const context = await browser.newContext();
  135 |     const page    = await context.newPage();
  136 |     const cdp     = await context.newCDPSession(page);
  137 |     await addVirtualAuthenticator(cdp);
  138 | 
  139 |     try {
  140 |       await loginAsCustomer(page);
> 141 |       await expect(page.getByRole('heading', { name: 'Enable fingerprint login' })).toBeVisible({ timeout: 8_000 });
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  142 |       await page.getByRole('button', { name: 'Enable fingerprint login' }).click();
  143 |       await expect(page.getByText('Fingerprint enabled!')).toBeVisible({ timeout: 15_000 });
  144 |       await page.getByRole('button', { name: 'Got it' }).click();
  145 | 
  146 |       await page.goto('/account/security');
  147 |       await page.waitForLoadState('networkidle');
  148 | 
  149 |       const credentialRow = page.locator('li', { hasText: 'Enrolled' }).first();
  150 |       await expect(credentialRow).toBeVisible({ timeout: 8_000 });
  151 | 
  152 |       // Security.tsx's revoke confirmation is a native browser confirm() dialog.
  153 |       page.once('dialog', (dialog) => dialog.accept());
  154 |       await credentialRow.getByRole('button', { name: 'Revoke' }).click();
  155 | 
  156 |       await expect(credentialRow).not.toBeVisible({ timeout: 8_000 });
  157 |       await expect(page.getByText('No fingerprint enrolled on this account')).toBeVisible({ timeout: 5_000 });
  158 |     } finally {
  159 |       await context.close();
  160 |     }
  161 |   });
  162 | });
  163 | 
```