# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication flows >> login with valid credentials lands on account
- Location: e2e/tests/auth.spec.ts:63:3

# Error details

```
TimeoutError: apiRequestContext.get: Timeout 10000ms exceeded.
Call log:
  - → GET http://localhost:4000/api/v1/products
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.96 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

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
          - generic [ref=e43]:
            - generic [ref=e44]:
              - generic [ref=e45]: Password *
              - link "Forgot password?" [ref=e46] [cursor=pointer]:
                - /url: /forgot-password
            - generic [ref=e48]:
              - textbox "••••••••" [ref=e49]
              - button "Show password" [ref=e51]:
                - img [ref=e52]
          - button "Sign in" [ref=e55]
          - generic [ref=e60]: or continue with
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
> 25  |   const res        = await page.request.get(`${API_DIRECT}/products`);
      |                                         ^ TimeoutError: apiRequestContext.get: Timeout 10000ms exceeded.
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
  44  | /** Returns a random 10.x.y.z IP unique per call — avoids authLimiter contamination. */
  45  | function uniqueTestIp(): string {
  46  |   const a = Math.floor(Math.random() * 254) + 1;
  47  |   const b = Math.floor(Math.random() * 254) + 1;
  48  |   return `10.50.${a}.${b}`;
  49  | }
  50  | 
  51  | /** Fills and submits the login form, then waits for redirect away from /login. */
  52  | async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  53  |   // Spoof a unique IP via page.route so this test gets its own authLimiter counter.
  54  |   // Without this, sequential tests from 127.0.0.1 exhaust the 5-request window.
  55  |   const ip = uniqueTestIp();
  56  |   await page.route('**/api/v1/auth/**', async (route) => {
  57  |     await route.continue({ headers: { ...route.request().headers(), 'X-Forwarded-For': ip } });
  58  |   });
  59  | 
  60  |   await page.goto('/login');
  61  |   await page.waitForLoadState('networkidle');
  62  | 
  63  |   // Inject CSRF token before the POST
  64  |   await warmCsrf(page);
  65  | 
  66  |   await page.locator('input[type="email"]').first().fill(email);
  67  |   await page.locator('input[type="password"]').first().fill(password);
  68  | 
  69  |   // exact: true distinguishes "Sign in" from "Sign in with fingerprint"
  70  |   await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  71  | 
  72  |   await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
  73  | }
  74  | 
  75  | export async function loginAsAdmin(page: Page): Promise<void> {
  76  |   await fillLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  77  | }
  78  | 
  79  | export async function loginAsCustomer(page: Page): Promise<void> {
  80  |   await fillLoginForm(page, CUST_EMAIL, CUST_PASSWORD);
  81  | }
  82  | 
  83  | export interface RegisterOptions {
  84  |   email:     string;
  85  |   password:  string;
  86  |   full_name: string;
  87  |   phone?:    string;
  88  | }
  89  | 
  90  | /**
  91  |  * Registers + verifies a user via direct API calls (using page.request so
  92  |  * we can extract and send CSRF tokens), then logs in via the UI.
  93  |  *
  94  |  * Relies on the backend returning `otp` in non-production mode.
  95  |  */
  96  | export async function registerAndLogin(page: Page, opts: RegisterOptions): Promise<void> {
  97  |   await page.goto('/');
  98  |   await page.waitForLoadState('networkidle');
  99  | 
  100 |   const token = await warmCsrf(page);
  101 |   if (!token) throw new Error('Could not obtain CSRF token from the backend');
  102 | 
  103 |   // Unique IP per call — keeps this helper's register/login requests in their own
  104 |   // authLimiter bucket, isolated from UI tests running from 127.0.0.1
  105 |   const ip = uniqueTestIp();
  106 |   const authHeaders = {
  107 |     'X-CSRF-Token':    token,
  108 |     'Cookie':          `csrf_token=${token}`,
  109 |     'X-Forwarded-For': ip,
  110 |   };
  111 | 
  112 |   // Register — use page.request so we can set custom headers
  113 |   const regRes  = await page.request.post(`${API_DIRECT}/auth/register`, {
  114 |     data:    {
  115 |       email:     opts.email,
  116 |       password:  opts.password,
  117 |       full_name: opts.full_name,
  118 |       // Generate a unique phone per call so concurrent runs don't clash on the unique constraint
  119 |       phone:     opts.phone ?? `+234${String(Date.now()).slice(-10)}`,
  120 |     },
  121 |     headers: authHeaders,
  122 |   });
  123 | 
  124 |   const regBody = await regRes.json() as {
  125 |     success: boolean;
```