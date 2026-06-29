import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { LogoMark } from '@/components/ui/Icons';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  BarChart2Icon, PackageIcon, CartIcon, LogOutIcon, HomeIcon, ShieldCheckIcon,
} from '@/components/ui/Icons';

const NAV = [
  { to: '/admin',             icon: <BarChart2Icon size={18} />,    label: 'Dashboard', end: true },
  { to: '/admin/products',    icon: <CartIcon size={18} />,         label: 'Products' },
  { to: '/admin/orders',      icon: <PackageIcon size={18} />,      label: 'Orders' },
  { to: '/admin/audit-logs',  icon: <ShieldCheckIcon size={18} />,  label: 'Audit Logs' },
];

// The sidebar is always dark navy (bg-primary) regardless of site theme — like
// the Footer — so these white-tint hover/active overlays must NOT flip with
// dark mode; they stay literal `white` always.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-brand px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-white/15 text-white'
      : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`;

export default function AdminLayout() {
  const navigate   = useNavigate();
  const clearAuth  = useAuthStore((s) => s.clearAuth);
  const clearCart  = useCartStore((s) => s.clearCart);
  const user       = useAuthStore((s) => s.user);

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled:  () => { clearAuth(); clearCart(); navigate('/login'); },
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-primary text-white">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
          <LogoMark size={28} className="text-white" />
          <div>
            <p className="font-bold text-sm leading-tight">SmartTrade</p>
            <p className="text-xs text-white/60">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
              <span className="shrink-0">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}

          <div className="pt-4 border-t border-white/10 mt-4">
            <NavLink to="/" className="flex items-center gap-3 rounded-brand px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <HomeIcon size={18} /> Storefront
            </NavLink>
          </div>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="mb-2 flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-white/50 truncate">{user?.email}</p>
            </div>
            <ThemeToggle tone="inverted" className="h-8 w-8 shrink-0" />
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="flex w-full items-center gap-3 rounded-brand px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOutIcon size={16} />
            {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-neutral-50 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
