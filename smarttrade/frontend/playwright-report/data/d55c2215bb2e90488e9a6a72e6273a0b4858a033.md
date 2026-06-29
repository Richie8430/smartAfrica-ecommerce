# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: webauthn.spec.ts >> WebAuthn / Biometric flows — enrollment then login >> Test 1 — Enrollment flow
- Location: e2e/tests/webauthn.spec.ts:49:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Target page, context or browser has been closed
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - link "SmartTrade Africa" [ref=e6] [cursor=pointer]:
        - /url: /
        - img [ref=e7]
        - generic [ref=e10]: SmartTrade Africa
      - generic [ref=e11]:
        - textbox "Search products…" [ref=e12]
        - img [ref=e13]
      - navigation [ref=e16]:
        - link "Products" [ref=e17] [cursor=pointer]:
          - /url: /products
      - generic [ref=e18]:
        - link "Cart, 0 items" [ref=e19] [cursor=pointer]:
          - /url: /cart
          - img [ref=e20]
        - generic [ref=e23]:
          - link "Sign in" [ref=e24] [cursor=pointer]:
            - /url: /login
          - link "Register" [ref=e25] [cursor=pointer]:
            - /url: /register
  - main [ref=e26]:
    - generic [ref=e28]:
      - generic [ref=e29]:
        - link "SmartTrade Africa" [ref=e30] [cursor=pointer]:
          - /url: /
          - img [ref=e31]
          - generic [ref=e34]: SmartTrade Africa
        - heading "Sign in to SmartTrade" [level=1] [ref=e35]
        - paragraph [ref=e36]: Welcome back — glad to see you!
      - generic [ref=e37]:
        - generic [ref=e38]:
          - generic [ref=e39]:
            - generic [ref=e40]: Email address*
            - textbox "Email address*" [ref=e42]:
              - /placeholder: you@example.com
              - text: customer@smarttrade.test
          - generic [ref=e43]:
            - generic [ref=e44]:
              - generic [ref=e45]: Password *
              - link "Forgot password?" [ref=e46] [cursor=pointer]:
                - /url: /forgot-password
            - generic [ref=e48]:
              - textbox "••••••••" [ref=e49]: Customer@1234
              - button "Show password" [ref=e51]:
                - img [ref=e52]
          - button "Sign in" [disabled]:
            - img
            - text: Sign in
          - generic [ref=e59]: or continue with
          - button "Sign in with fingerprint" [ref=e61]:
            - img [ref=e63]
            - text: Sign in with fingerprint
        - paragraph [ref=e65]:
          - text: New to SmartTrade?
          - link "Create account" [ref=e66] [cursor=pointer]:
            - /url: /register
  - contentinfo [ref=e67]:
    - generic [ref=e68]:
      - generic [ref=e69]:
        - generic [ref=e70]:
          - paragraph [ref=e71]: SmartTrade Africa
          - paragraph [ref=e72]: Your trusted marketplace across Africa.
        - generic [ref=e73]:
          - paragraph [ref=e74]: Shop
          - list [ref=e75]:
            - listitem [ref=e76]:
              - link "Products" [ref=e77] [cursor=pointer]:
                - /url: /products
            - listitem [ref=e78]:
              - link "Categories" [ref=e79] [cursor=pointer]:
                - /url: /products
            - listitem [ref=e80]:
              - link "New Arrivals" [ref=e81] [cursor=pointer]:
                - /url: /products?sort=newest
        - generic [ref=e82]:
          - paragraph [ref=e83]: Account
          - list [ref=e84]:
            - listitem [ref=e85]:
              - link "My Orders" [ref=e86] [cursor=pointer]:
                - /url: /account/orders
            - listitem [ref=e87]:
              - link "Profile" [ref=e88] [cursor=pointer]:
                - /url: /account/profile
            - listitem [ref=e89]:
              - link "Security" [ref=e90] [cursor=pointer]:
                - /url: /account/security
        - generic [ref=e91]:
          - paragraph [ref=e92]: Legal
          - list [ref=e93]:
            - listitem [ref=e94]:
              - link "Privacy Policy" [ref=e95] [cursor=pointer]:
                - /url: /privacy
            - listitem [ref=e96]:
              - link "Terms of Use" [ref=e97] [cursor=pointer]:
                - /url: /terms
      - generic [ref=e98]: © 2026 SmartTrade Africa. All rights reserved.
  - region "Notifications (F8)":
    - list
  - dialog "Cookie consent" [ref=e99]:
    - generic [ref=e100]:
      - paragraph [ref=e101]:
        - text: We use cookies to improve your experience.
        - link "View our Privacy Policy" [ref=e102] [cursor=pointer]:
          - /url: /privacy
        - text: .
      - generic [ref=e103]:
        - button "Reject non-essential" [ref=e104]
        - button "Accept all" [ref=e105]
```

# Test source

```ts
  1   | /**
  2   |  * Auth helpers for Playwright E2E tests.
  3   |  *
  4   |  * CSRF strategy:
  5   |  *  - page.request.get() exposes Set-Cookie response headers (unlike browser fetch)
  6   |  *  - We extract the csrf_token value and inject it via page.context().addCookies()
  7   |  *  - The React apiClient then reads document.cookie and sends X-CSRF-Token header
  8   |  */
  9   | 
  10  | import type { Page } from '@playwright/test';
  11  | 
  12  | const ADMIN_EMAIL    = 'admin@smarttrade.test';
  13  | const ADMIN_PASSWORD = 'Admin@1234';
  14  | const CUST_EMAIL     = 'customer@smarttrade.test';
  15  | const CUST_PASSWORD  = 'Customer@1234';
  16  | const API_DIRECT     = 'http://localhost:4000/api/v1';
  17  | 
  18  | /**
  19  |  * Obtains a fresh CSRF token from the backend and injects it directly
  20  |  * into the browser's cookie jar. After this call, js-cookie (`Cookies.get`)
  21  |  * will return the token and apiClient will add the X-CSRF-Token header.
  22  |  */
  23  | export async function warmCsrf(page: Page): Promise<string> {
  24  |   // page.request uses Playwright's HTTP client — it exposes Set-Cookie headers
  25  |   const res        = await page.request.get(`${API_DIRECT}/products`);
  26  |   const setCookie  = res.headers()['set-cookie'] ?? '';
  27  |   const rawToken   = setCookie.match(/csrf_token=([^;]+)/)?.[1] ?? '';
  28  |   const token      = decodeURIComponent(rawToken);
  29  | 
  30  |   if (token) {
  31  |     // Inject into the browser's cookie jar so the React apiClient can read it
  32  |     await page.context().addCookies([{
  33  |       name:   'csrf_token',
  34  |       value:  token,
  35  |       domain: 'localhost',
  36  |       path:   '/',
  37  |       // Do NOT set httpOnly — the client-side apiClient must be able to read it
  38  |     }]);
  39  |   }
  40  | 
  41  |   return token;
  42  | }
  43  | 
  44  | /** Fills and submits the login form, then waits for redirect away from /login. */
  45  | async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  46  |   await page.goto('/login');
  47  |   await page.waitForLoadState('networkidle');
  48  | 
  49  |   // Inject CSRF token before the POST
  50  |   await warmCsrf(page);
  51  | 
  52  |   await page.locator('input[type="email"]').first().fill(email);
  53  |   await page.locator('input[type="password"]').first().fill(password);
  54  | 
  55  |   // exact: true distinguishes "Sign in" from "Sign in with fingerprint"
  56  |   await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  57  | 
> 58  |   await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
      |              ^ Error: page.waitForURL: Target page, context or browser has been closed
  59  | }
  60  | 
  61  | export async function loginAsAdmin(page: Page): Promise<void> {
  62  |   await fillLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  63  | }
  64  | 
  65  | export async function loginAsCustomer(page: Page): Promise<void> {
  66  |   await fillLoginForm(page, CUST_EMAIL, CUST_PASSWORD);
  67  | }
  68  | 
  69  | export interface RegisterOptions {
  70  |   email:     string;
  71  |   password:  string;
  72  |   full_name: string;
  73  |   phone?:    string;
  74  | }
  75  | 
  76  | /**
  77  |  * Registers + verifies a user via direct API calls (using page.request so
  78  |  * we can extract and send CSRF tokens), then logs in via the UI.
  79  |  *
  80  |  * Relies on the backend returning `otp` in non-production mode.
  81  |  */
  82  | export async function registerAndLogin(page: Page, opts: RegisterOptions): Promise<void> {
  83  |   await page.goto('/');
  84  |   await page.waitForLoadState('networkidle');
  85  | 
  86  |   const token = await warmCsrf(page);
  87  |   if (!token) throw new Error('Could not obtain CSRF token from the backend');
  88  | 
  89  |   const authHeaders = {
  90  |     'X-CSRF-Token': token,
  91  |     'Cookie':       `csrf_token=${token}`,
  92  |   };
  93  | 
  94  |   // Register — use page.request so we can set custom headers
  95  |   const regRes  = await page.request.post(`${API_DIRECT}/auth/register`, {
  96  |     data:    {
  97  |       email:     opts.email,
  98  |       password:  opts.password,
  99  |       full_name: opts.full_name,
  100 |       // Generate a unique phone per call so concurrent runs don't clash on the unique constraint
  101 |       phone:     opts.phone ?? `+234${String(Date.now()).slice(-10)}`,
  102 |     },
  103 |     headers: authHeaders,
  104 |   });
  105 | 
  106 |   const regBody = await regRes.json() as {
  107 |     success: boolean;
  108 |     data?: { userId: string; otp?: string };
  109 |     error?: string;
  110 |   };
  111 | 
  112 |   if (!regRes.ok || !regBody.data) {
  113 |     throw new Error(`Registration failed: ${regBody.error ?? regRes.status()}`);
  114 |   }
  115 | 
  116 |   const { userId, otp } = regBody.data;
  117 |   if (!otp) throw new Error('OTP not returned — is NODE_ENV set to production?');
  118 | 
  119 |   // Verify email
  120 |   const verifyRes = await page.request.post(`${API_DIRECT}/auth/verify-email`, {
  121 |     data:    { userId, otp },
  122 |     headers: authHeaders,
  123 |   });
  124 |   if (!verifyRes.ok) throw new Error(`OTP verification failed: ${verifyRes.status()}`);
  125 | 
  126 |   // Log in via UI (CSRF cookie already injected into the browser above)
  127 |   await page.goto('/login');
  128 |   await page.waitForLoadState('networkidle');
  129 | 
  130 |   await page.locator('input[type="email"]').first().fill(opts.email);
  131 |   await page.locator('input[type="password"]').first().fill(opts.password);
  132 |   await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  133 |   await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
  134 | }
  135 | 
```