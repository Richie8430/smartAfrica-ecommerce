# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication flows >> OTP verification flow
- Location: e2e/tests/auth.spec.ts:48:3

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
    - generic [ref=e27]:
      - generic [ref=e28]:
        - generic [ref=e33]:
          - generic [ref=e34]:
            - generic [ref=e35]: Africa's trusted marketplace
            - heading "Shop smarter across Africa" [level=1] [ref=e37]:
              - text: Shop smarter
              - generic [ref=e38]: across Africa
            - paragraph [ref=e39]: Thousands of products, secure Flutterwave payments, biometric-protected accounts, and real-time order tracking — all in one place.
            - generic [ref=e40]:
              - link "Start shopping" [ref=e41] [cursor=pointer]:
                - /url: /products
                - button "Start shopping" [ref=e42]:
                  - text: Start shopping
                  - img [ref=e44]
              - link "Create account" [ref=e46] [cursor=pointer]:
                - /url: /register
                - button "Create account" [ref=e47]
            - generic [ref=e48]:
              - generic [ref=e49]:
                - img [ref=e51]
                - text: Biometric security
              - generic [ref=e54]:
                - img [ref=e56]
                - text: Fast delivery
              - generic [ref=e61]:
                - img [ref=e63]
                - text: Secure payments
          - generic [ref=e65]:
            - generic [ref=e66]:
              - paragraph [ref=e67]: 50K+
              - paragraph [ref=e68]: Products
            - generic [ref=e69]:
              - paragraph [ref=e70]: 98%
              - paragraph [ref=e71]: Satisfaction
            - generic [ref=e72]:
              - paragraph [ref=e73]: 200K+
              - paragraph [ref=e74]: Customers
            - generic [ref=e75]:
              - paragraph [ref=e76]: 30+
              - paragraph [ref=e77]: Countries
        - img [ref=e79]
      - generic [ref=e82]:
        - generic [ref=e84]:
          - paragraph [ref=e85]: Why SmartTrade Africa?
          - heading "Built for Africa, secured for everyone" [level=2] [ref=e86]
          - paragraph [ref=e87]: We combine cutting-edge security with a seamless shopping experience designed specifically for the African market.
        - generic [ref=e88]:
          - generic [ref=e90]:
            - img [ref=e93]
            - generic [ref=e96]:
              - heading "Biometric Login" [level=3] [ref=e97]
              - paragraph [ref=e98]: Sign in with your fingerprint. Your biometric data never leaves your device.
          - generic [ref=e100]:
            - img [ref=e103]
            - generic [ref=e106]:
              - heading "Lightning Fast" [level=3] [ref=e107]
              - paragraph [ref=e108]: Optimized for low-bandwidth connections. Loads instantly anywhere in Africa.
          - generic [ref=e110]:
            - img [ref=e113]
            - generic [ref=e118]:
              - heading "Real-time Tracking" [level=3] [ref=e119]
              - paragraph [ref=e120]: Follow every step — from warehouse to your doorstep with live updates.
          - generic [ref=e122]:
            - img [ref=e125]
            - generic [ref=e127]:
              - heading "24/7 Support" [level=3] [ref=e128]
              - paragraph [ref=e129]: Our team is always available across all time zones to help you.
      - generic [ref=e131]:
        - generic [ref=e133]:
          - paragraph [ref=e134]: How it works
          - heading "Three steps to your order" [level=2] [ref=e135]
        - generic [ref=e136]:
          - generic [ref=e138]:
            - generic [ref=e140]:
              - img [ref=e141]
              - generic [ref=e144]: "1"
            - generic [ref=e145]:
              - heading "Create account" [level=3] [ref=e146]
              - paragraph [ref=e147]: Register free and enable biometric sign-in for instant access.
          - generic [ref=e149]:
            - generic [ref=e151]:
              - img [ref=e152]
              - generic [ref=e155]: "2"
            - generic [ref=e156]:
              - heading "Browse & add" [level=3] [ref=e157]
              - paragraph [ref=e158]: Find your products, add to cart, and choose your delivery address.
          - generic [ref=e160]:
            - generic [ref=e162]:
              - img [ref=e163]
              - generic [ref=e167]: "3"
            - generic [ref=e168]:
              - heading "Pay & receive" [level=3] [ref=e169]
              - paragraph [ref=e170]: Checkout with Flutterwave and track your order to the door.
      - generic [ref=e172]:
        - heading "Loved by shoppers across Africa" [level=2] [ref=e174]
        - generic [ref=e175]:
          - generic [ref=e177]:
            - generic [ref=e178]:
              - img [ref=e179]
              - img [ref=e181]
              - img [ref=e183]
              - img [ref=e185]
              - img [ref=e187]
            - paragraph [ref=e189]: "\"The biometric login is a game changer. I never have to type my password again!\""
            - generic [ref=e190]:
              - generic [ref=e191]: A
              - generic [ref=e192]:
                - paragraph [ref=e193]: Amara K.
                - paragraph [ref=e194]: Lagos, Nigeria
          - generic [ref=e196]:
            - generic [ref=e197]:
              - img [ref=e198]
              - img [ref=e200]
              - img [ref=e202]
              - img [ref=e204]
              - img [ref=e206]
            - paragraph [ref=e208]: "\"Fast, reliable, and the customer service is incredible. My go-to marketplace.\""
            - generic [ref=e209]:
              - generic [ref=e210]: K
              - generic [ref=e211]:
                - paragraph [ref=e212]: Kwame A.
                - paragraph [ref=e213]: Accra, Ghana
          - generic [ref=e215]:
            - generic [ref=e216]:
              - img [ref=e217]
              - img [ref=e219]
              - img [ref=e221]
              - img [ref=e223]
              - img [ref=e225]
            - paragraph [ref=e227]: "\"Real-time tracking makes me confident every purchase is safe. Highly recommend.\""
            - generic [ref=e228]:
              - generic [ref=e229]: F
              - generic [ref=e230]:
                - paragraph [ref=e231]: Fatima D.
                - paragraph [ref=e232]: Nairobi, Kenya
      - generic [ref=e236]:
        - img [ref=e238]
        - heading "Ready to start shopping?" [level=2] [ref=e241]
        - paragraph [ref=e242]: Join 200,000+ smart shoppers across Africa — for free.
        - generic [ref=e243]:
          - link "Create free account" [ref=e244] [cursor=pointer]:
            - /url: /register
            - button "Create free account" [ref=e245]
          - link "Browse products" [ref=e246] [cursor=pointer]:
            - /url: /products
            - button "Browse products" [ref=e247]
        - generic [ref=e248]:
          - generic [ref=e249]:
            - img [ref=e250]
            - text: No credit card required
          - generic [ref=e253]:
            - img [ref=e254]
            - text: Free to browse
          - generic [ref=e257]:
            - img [ref=e258]
            - text: Biometric security included
  - contentinfo [ref=e261]:
    - generic [ref=e262]:
      - generic [ref=e263]:
        - generic [ref=e264]:
          - paragraph [ref=e265]: SmartTrade Africa
          - paragraph [ref=e266]: Your trusted marketplace across Africa.
        - generic [ref=e267]:
          - paragraph [ref=e268]: Shop
          - list [ref=e269]:
            - listitem [ref=e270]:
              - link "Products" [ref=e271] [cursor=pointer]:
                - /url: /products
            - listitem [ref=e272]:
              - link "Categories" [ref=e273] [cursor=pointer]:
                - /url: /products
            - listitem [ref=e274]:
              - link "New Arrivals" [ref=e275] [cursor=pointer]:
                - /url: /products?sort=newest
        - generic [ref=e276]:
          - paragraph [ref=e277]: Account
          - list [ref=e278]:
            - listitem [ref=e279]:
              - link "My Orders" [ref=e280] [cursor=pointer]:
                - /url: /account/orders
            - listitem [ref=e281]:
              - link "Profile" [ref=e282] [cursor=pointer]:
                - /url: /account/profile
            - listitem [ref=e283]:
              - link "Security" [ref=e284] [cursor=pointer]:
                - /url: /account/security
        - generic [ref=e285]:
          - paragraph [ref=e286]: Legal
          - list [ref=e287]:
            - listitem [ref=e288]:
              - link "Privacy Policy" [ref=e289] [cursor=pointer]:
                - /url: /privacy
            - listitem [ref=e290]:
              - link "Terms of Use" [ref=e291] [cursor=pointer]:
                - /url: /terms
      - generic [ref=e292]: © 2026 SmartTrade Africa. All rights reserved.
  - region "Notifications (F8)":
    - list
  - dialog "Cookie consent" [ref=e293]:
    - generic [ref=e294]:
      - paragraph [ref=e295]:
        - text: We use cookies to improve your experience.
        - link "View our Privacy Policy" [ref=e296] [cursor=pointer]:
          - /url: /privacy
        - text: .
      - generic [ref=e297]:
        - button "Reject non-essential" [ref=e298]
        - button "Accept all" [ref=e299]
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