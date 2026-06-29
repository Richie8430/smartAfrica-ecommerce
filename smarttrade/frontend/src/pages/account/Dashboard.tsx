import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders.api';
import { accountApi } from '@/api/account.api';
import { useAuthStore } from '@/stores/auth.store';
import { FadeIn } from '@/components/ui/Motion';
import { BiometricVerifiedBadge } from '@/components/trust/BiometricVerifiedBadge';
import { NewDeviceAlert } from '@/components/trust/NewDeviceAlert';
import { Button } from '@/components/ui/Button';
import {
  PackageIcon, MapPinIcon, ChevronRightIcon, ArrowRightIcon,
} from '@/components/ui/Icons';
import type { OrderStatus, PaymentStatus } from '@/types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  SHIPPED:   'bg-purple-50 text-purple-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
};

const PAY_COLORS: Record<PaymentStatus, string> = {
  UNPAID:   'bg-neutral-100 text-neutral-500',
  PENDING:  'bg-amber-50 text-amber-700',
  PAID:     'bg-green-50 text-green-700',
  FAILED:   'bg-red-50 text-red-600',
  REFUNDED: 'bg-purple-50 text-purple-700',
};

export default function AccountDashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 1],
    queryFn:  () => ordersApi.list({ page: 1, limit: 3 }).then((r) => r.data),
  });

  const { data: addressData } = useQuery({
    queryKey: ['addresses'],
    queryFn:  () => accountApi.getAddresses().then((r) => r.data),
  });

  const orders    = ordersData?.data ?? [];
  const addrCount = addressData?.data?.length ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <FadeIn>
      <NewDeviceAlert />

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">
            {greeting}, {user?.full_name?.split(' ')[0]}!
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500">Here's what's happening with your account.</p>
        </div>
        {user?.biometric_enrolled && <BiometricVerifiedBadge />}
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { icon: <PackageIcon size={20} />, label: 'Total orders',    value: ordersData?.total ?? 0, to: '/account/orders' },
          { icon: <span className="text-lg font-bold">✦</span>,        label: 'Loyalty points',   value: '–',              to: '#' },
          { icon: <MapPinIcon size={20} />,  label: 'Saved addresses', value: addrCount,            to: '/account/addresses' },
        ].map(({ icon, label, value, to }) => (
          <Link
            key={label}
            to={to}
            className="group rounded-2xl border border-neutral-100 bg-white dark:bg-neutral-100 p-4 text-center transition-all hover:border-primary/20 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="mb-1.5 flex justify-center text-primary" aria-hidden="true">{icon}</div>
            <p className="text-xl font-bold text-neutral-900">{value}</p>
            <p className="text-xs text-neutral-500">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-neutral-100 bg-white dark:bg-neutral-100">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <h3 className="font-semibold text-neutral-900">Recent orders</h3>
          <Link to="/account/orders" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark transition-colors">
            View all <ChevronRightIcon size={13} aria-hidden="true" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <PackageIcon size={28} className="mb-2 text-neutral-300" aria-hidden="true" />
            <p className="text-sm text-neutral-500">No orders yet</p>
            <Link to="/products" className="mt-3">
              <Button size="sm" rightIcon={<ArrowRightIcon size={14} aria-hidden="true" />}>Start shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-50">
            {orders.map((order) => (
              <Link
                key={order.order_id}
                to={`/order-confirmation/${order.order_id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50"
                aria-label={`Order ${order.order_id.slice(0, 8).toUpperCase()}, ${order.status}, $${Number(order.total_amount).toFixed(2)}`}
              >
                <span className="font-mono text-xs font-semibold text-neutral-700 shrink-0">
                  #{order.order_id.slice(0, 8).toUpperCase()}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                  {order.status}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PAY_COLORS[order.payment_status]}`}>
                  {order.payment_status}
                </span>
                <span className="flex-1" />
                <span className="font-bold text-sm text-primary">${Number(order.total_amount).toFixed(2)}</span>
                <ChevronRightIcon size={14} className="text-neutral-300" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </FadeIn>
  );
}
