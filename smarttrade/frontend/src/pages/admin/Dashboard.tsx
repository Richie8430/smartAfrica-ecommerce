import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { FadeIn } from '@/components/ui/Motion';
import {
  BarChart2Icon, PackageIcon, UsersIcon, CreditCardIcon, ChevronRightIcon,
} from '@/components/ui/Icons';
import type { OrderStatus, PaymentStatus } from '@/types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  SHIPPED:   'bg-purple-50 text-purple-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
};

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn:  () => adminApi.getStats().then((r) => r.data.data),
  });

  const stats = [
    { icon: <CreditCardIcon size={22} />,  label: 'Total revenue',  value: `$${(data?.totalRevenue ?? 0).toFixed(2)}`, color: 'text-primary',  bg: 'bg-primary/8' },
    { icon: <PackageIcon size={22} />,     label: 'Total orders',   value: data?.totalOrders   ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: <BarChart2Icon size={22} />,   label: 'Products listed', value: data?.totalProducts ?? 0, color: 'text-blue-600',  bg: 'bg-blue-50' },
    { icon: <UsersIcon size={22} />,       label: 'Total users',    value: data?.totalUsers    ?? 0, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={i * 60}>
            <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${s.bg}`}>
                <span className={s.color}>{s.icon}</span>
              </div>
              {isLoading ? (
                <div className="skeleton h-7 w-20 rounded-xl mt-1 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
              )}
              <p className="text-sm text-neutral-500">{s.label}</p>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Recent orders */}
      <FadeIn delay={200}>
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <h2 className="font-bold text-neutral-900">Recent orders</h2>
            <Link to="/admin/orders" className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition-colors">
              View all <ChevronRightIcon size={15} />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
            </div>
          ) : (data?.recentOrders ?? []).length === 0 ? (
            <div className="py-12 text-center text-neutral-400">No orders yet.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {(data?.recentOrders ?? []).map((order) => (
                <Link
                  key={order.order_id}
                  to={`/admin/orders`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors"
                >
                  <span className="font-mono text-sm text-neutral-700">
                    #{order.order_id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                  <span className="flex-1" />
                  <span className="text-sm font-bold text-primary">
                    ${Number(order.total_amount).toFixed(2)}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
