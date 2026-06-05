import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

// ─── Layout & Guards ──────────────────────────────────────────────────────────
import { RootLayout }        from '@/components/layout/RootLayout';
import { ProtectedRoute }    from '@/components/guards/ProtectedRoute';
import { GuestRoute }        from '@/components/guards/GuestRoute';
import { AdminRoute }        from '@/components/guards/AdminRoute';
import { FullscreenSpinner } from '@/components/ui/Spinner';

// ─── Lazy pages ───────────────────────────────────────────────────────────────
const Home              = lazy(() => import('@/pages/Home'));
const NotFound          = lazy(() => import('@/pages/NotFound'));
const ServerError       = lazy(() => import('@/pages/ServerError'));
const Privacy           = lazy(() => import('@/pages/Privacy'));
const Terms             = lazy(() => import('@/pages/Terms'));
const Products          = lazy(() => import('@/pages/Products'));
const ProductDetail     = lazy(() => import('@/pages/ProductDetail'));
const Cart              = lazy(() => import('@/pages/Cart'));
const Checkout          = lazy(() => import('@/pages/Checkout'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const PaymentFailed     = lazy(() => import('@/pages/PaymentFailed'));
const Orders            = lazy(() => import('@/pages/Orders'));

// Auth
const Register          = lazy(() => import('@/pages/auth/Register'));
const VerifyEmail       = lazy(() => import('@/pages/auth/VerifyEmail'));
const Login             = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword    = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword     = lazy(() => import('@/pages/auth/ResetPassword'));

// Account
const AccountLayout     = lazy(() => import('@/pages/account/AccountLayout'));
const AccountDashboard  = lazy(() => import('@/pages/account/Dashboard'));
const Profile           = lazy(() => import('@/pages/account/Profile'));
const OrderHistory      = lazy(() => import('@/pages/account/OrderHistory'));
const Security          = lazy(() => import('@/pages/account/Security'));
const Addresses         = lazy(() => import('@/pages/account/Addresses'));

// Admin
const AdminLayout       = lazy(() => import('@/pages/admin/AdminLayout'));
const Dashboard         = lazy(() => import('@/pages/admin/Dashboard'));
const AdminProducts     = lazy(() => import('@/pages/admin/AdminProducts'));
const AdminOrders       = lazy(() => import('@/pages/admin/AdminOrders'));
const AdminAuditLogs    = lazy(() => import('@/pages/admin/AdminAuditLogs'));

// ─── Router ───────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  // ── Main app (Navbar + Footer) ──────────────────────────────────────────
  {
    path:    '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },

      // Static pages
      { path: 'privacy', element: <Privacy /> },
      { path: 'terms',   element: <Terms /> },
      { path: '500',     element: <ServerError /> },

      // Guest-only
      {
        element: <GuestRoute />,
        children: [
          { path: 'register',        element: <Register /> },
          { path: 'login',           element: <Login /> },
          { path: 'verify-email',    element: <VerifyEmail /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
          { path: 'reset-password',  element: <ResetPassword /> },
        ],
      },

      // Public product routes
      { path: 'products',     element: <Products /> },
      { path: 'products/:id', element: <ProductDetail /> },

      // Protected customer routes
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'cart',                        element: <Cart /> },
          { path: 'checkout',                    element: <Checkout /> },
          { path: 'order-confirmation/:orderId', element: <OrderConfirmation /> },
          { path: 'payment-failed',              element: <PaymentFailed /> },
          { path: 'orders',                      element: <Orders /> },

          // Account nested layout
          {
            path:    'account',
            element: <AccountLayout />,
            children: [
              { index: true,       element: <AccountDashboard /> },
              { path: 'profile',   element: <Profile /> },
              { path: 'orders',    element: <OrderHistory /> },
              { path: 'security',  element: <Security /> },
              { path: 'addresses', element: <Addresses /> },
            ],
          },
        ],
      },

      // 404 inside app shell
      { path: '*', element: <NotFound /> },
    ],
  },

  // ── Admin (full-screen sidebar, no Navbar/Footer) ───────────────────────
  {
    path:    '/admin',
    element: <AdminRoute />,
    children: [{
      element: <AdminLayout />,
      children: [
        { index: true,         element: <Dashboard /> },
        { path: 'products',    element: <AdminProducts /> },
        { path: 'orders',      element: <AdminOrders /> },
        { path: 'audit-logs',  element: <AdminAuditLogs /> },
      ],
    }],
  },
]);

// ─── Query client ─────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<FullscreenSpinner />}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  </StrictMode>,
);
