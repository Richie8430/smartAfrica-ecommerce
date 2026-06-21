import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { authApi } from '@/api/auth.api';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from '@/components/ui/Toast';
import {
  SearchIcon, CartIcon, MenuIcon, CloseIcon,
  ChevronDownIcon, LogoMark,
} from '@/components/ui/Icons';

// ─── Search bar ───────────────────────────────────────────────────────────────

function SearchBar({ className }: { className?: string }) {
  const [q,       setQ]       = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length >= 2) navigate(`/products?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={handleSubmit} className={clsx('relative', className)}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search products…"
        className={clsx(
          'w-full rounded-full border py-2 pl-10 pr-4 text-sm bg-neutral-50 transition-all duration-200',
          focused
            ? 'border-primary ring-2 ring-primary/20 shadow-sm'
            : 'border-neutral-200 hover:border-neutral-300',
        )}
      />
      <SearchIcon
        size={16}
        className={clsx(
          'absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200',
          focused ? 'text-primary' : 'text-neutral-400',
        )}
      />
    </form>
  );
}

// ─── Cart icon ────────────────────────────────────────────────────────────────

function CartButton() {
  const itemCount = useCartStore((s) => s.itemCount);
  return (
    <Link
      to="/cart"
      className="relative flex h-10 w-10 items-center justify-center rounded-full
                 text-neutral-600 transition-all duration-200 hover:bg-neutral-100 hover:text-primary"
      aria-label={`Cart, ${itemCount} items`}
    >
      <CartIcon size={20} />
      {itemCount > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center
                     rounded-full bg-primary text-[10px] font-bold text-white
                     animate-[scale-in_0.25s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}

// ─── User menu ────────────────────────────────────────────────────────────────

function UserMenu() {
  const { user, clearAuth } = useAuthStore();
  const [open, setOpen]     = useState(false);
  const ref                 = useRef<HTMLDivElement>(null);
  const navigate            = useNavigate();

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
    navigate('/login');
    toast.success('Logged out successfully');
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full p-1 transition-all duration-200 hover:bg-neutral-100"
        aria-expanded={open}
      >
        <Avatar seed={user?.userId} name={user?.full_name} size="sm" />
        <ChevronDownIcon
          size={14}
          className={clsx('text-neutral-400 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      <div
        className={clsx(
          'absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-neutral-100',
          'bg-white shadow-xl transition-all duration-200 origin-top-right',
          open
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none',
        )}
      >
        <div className="border-b border-neutral-100 px-4 py-3">
          <p className="truncate text-sm font-semibold text-neutral-900">{user?.full_name}</p>
          <p className="truncate text-xs text-neutral-500">{user?.email}</p>
        </div>

        <nav className="py-1">
          {[
            { label: 'My Account',  to: '/account' },
            { label: 'Orders',      to: '/account/orders' },
            { label: 'Profile',     to: '/account/profile' },
            { label: 'Security',    to: '/account/security' },
          ].map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-primary"
            >
              {label}
            </Link>
          ))}

          {user?.role === 'ADMIN' && (
            <>
              <div className="my-1 border-t border-neutral-100" />
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
              >
                Admin Dashboard
              </Link>
            </>
          )}

          <div className="my-1 border-t border-neutral-100" />
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            Sign out
          </button>
        </nav>
      </div>
    </div>
  );
}

// ─── Mobile drawer ────────────────────────────────────────────────────────────

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAuthenticated } = useAuthStore();

  return (
    <>
      <div
        onClick={onClose}
        className={clsx(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden',
          'transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl lg:hidden',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-4">
          <div className="flex items-center gap-2">
            <LogoMark size={28} className="text-primary" />
            <span className="font-bold text-primary">SmartTrade</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="p-4">
          <SearchBar className="mb-4" />
          <nav className="flex flex-col gap-0.5">
            {[
              { label: 'Products', to: '/products' },
              { label: 'Cart',     to: '/cart' },
              ...(isAuthenticated
                ? [
                    { label: 'Account',  to: '/account' },
                    { label: 'Orders',   to: '/account/orders' },
                    { label: 'Security', to: '/account/security' },
                  ]
                : [
                    { label: 'Sign In',  to: '/login' },
                    { label: 'Register', to: '/register' },
                  ]),
            ].map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-primary"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const { isAuthenticated }         = useAuthStore();
  const location                    = useLocation();

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close drawer on route change
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <header
      className={clsx(
        'sticky top-0 z-30 transition-all duration-300',
        scrolled
          ? 'border-b border-neutral-100 bg-white/95 shadow-sm backdrop-blur-md'
          : 'border-b border-transparent bg-white',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 lg:hidden"
          aria-label="Open menu"
        >
          <MenuIcon size={20} />
        </button>

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80">
          <LogoMark size={28} className="text-primary" />
          <span className="hidden text-base font-bold text-primary sm:block">
            SmartTrade<span className="text-primary-light"> Africa</span>
          </span>
        </Link>

        {/* Search — desktop */}
        <SearchBar className="hidden flex-1 max-w-md lg:block" />

        {/* Spacer */}
        <div className="flex-1 lg:hidden" />

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            to="/products"
            className={clsx(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname.startsWith('/products')
                ? 'bg-primary/8 text-primary'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-primary',
            )}
          >
            Products
          </Link>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <CartButton />

          {isAuthenticated ? (
            <div className="ml-1">
              <UserMenu />
            </div>
          ) : (
            <div className="ml-2 hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-primary"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-brand bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-dark hover:shadow-md hover:shadow-primary/25"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
