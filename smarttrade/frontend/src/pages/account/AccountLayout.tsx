import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { Avatar } from '@/components/ui/Avatar';
import {
  HomeIcon, UserIcon, PackageIcon, ShieldCheckIcon, MapPinIcon, LogOutIcon,
} from '@/components/ui/Icons';

const NAV = [
  { to: '/account',          label: 'Dashboard',  icon: <HomeIcon size={18} />,        end: true  },
  { to: '/account/profile',  label: 'Profile',    icon: <UserIcon size={18} />,         end: false },
  { to: '/account/orders',   label: 'Orders',     icon: <PackageIcon size={18} />,      end: false },
  { to: '/account/security', label: 'Security',   icon: <ShieldCheckIcon size={18} />,  end: false },
  { to: '/account/addresses',label: 'Addresses',  icon: <MapPinIcon size={18} />,       end: false },
];

const sideClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-brand px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary/8 text-primary' : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
  }`;

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
    isActive ? 'text-primary' : 'text-neutral-400 hover:text-neutral-700'
  }`;

export default function AccountLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearCart = useCartStore((s) => s.clearCart);
  const user      = useAuthStore((s) => s.user);

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled:  () => { clearAuth(); clearCart(); navigate('/login'); },
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Mobile top tab bar ──────────────────────────────────────────────── */}
      <nav
        aria-label="Account navigation"
        className="sticky top-16 z-20 flex border-b border-neutral-100 bg-white sm:hidden"
      >
        {NAV.map((n) => {
          const isActive = n.end
            ? location.pathname === n.to
            : location.pathname.startsWith(n.to);
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={tabClass({ isActive })}
              aria-current={isActive ? 'page' : undefined}
            >
              <span aria-hidden="true">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mx-auto flex max-w-5xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* ── Desktop sidebar ────────────────────────────────────────────────── */}
        <aside className="hidden w-52 shrink-0 sm:block">
          <div className="sticky top-24 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
            {/* Avatar */}
            <div className="mb-4 flex flex-col items-center gap-2 border-b border-neutral-100 pb-4">
              <Avatar seed={user?.userId} name={user?.full_name} size="lg" />
              <p className="text-sm font-semibold text-neutral-900 text-center">{user?.full_name}</p>
              <p className="max-w-full truncate text-xs text-neutral-400">{user?.email}</p>
            </div>

            <nav aria-label="Account sections" className="space-y-0.5">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={sideClass}
                  aria-label={n.label}
                >
                  <span aria-hidden="true" className="shrink-0">{n.icon}</span>
                  {n.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-4 border-t border-neutral-100 pt-4">
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                aria-label="Sign out of your account"
                className="flex w-full items-center gap-3 rounded-brand px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                <LogOutIcon size={18} aria-hidden="true" />
                {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </aside>

        {/* ── Page content ───────────────────────────────────────────────────── */}
        <main className="min-h-[400px] flex-1 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
