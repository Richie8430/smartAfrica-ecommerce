import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders.api';
import { FadeIn } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import {
  PackageIcon, ChevronRightIcon, ArrowRightIcon,
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

const LIMIT = 10;

export default function Orders() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page],
    queryFn:  () => ordersApi.list({ page, limit: LIMIT }).then((r) => r.data),
  });

  const orders     = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-bold text-neutral-900">My orders</h1>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <FadeIn className="flex flex-col items-center py-24 text-center">
            <div className="mb-4 rounded-full bg-neutral-100 p-6">
              <PackageIcon size={36} className="text-neutral-300" />
            </div>
            <p className="text-lg font-semibold text-neutral-700">No orders yet</p>
            <p className="mt-1 text-sm text-neutral-500">Once you place an order it'll appear here.</p>
            <Link to="/products" className="mt-5">
              <Button rightIcon={<ArrowRightIcon size={16} />}>Start shopping</Button>
            </Link>
          </FadeIn>
        )}

        {!isLoading && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((order, i) => (
              <FadeIn key={order.order_id} delay={i * 40}>
                <Link
                  to={`/order-confirmation/${order.order_id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white dark:bg-neutral-100 p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                    <PackageIcon size={22} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-neutral-900">
                        #{order.order_id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAY_COLORS[order.payment_status]}`}>
                        {order.payment_status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
                      <span>{new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>·</span>
                      <span>{order.order_items?.length ?? 0} item{(order.order_items?.length ?? 0) !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">${Number(order.total_amount).toFixed(2)}</p>
                    <ChevronRightIcon className="ml-auto mt-1 text-neutral-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-neutral-500">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
