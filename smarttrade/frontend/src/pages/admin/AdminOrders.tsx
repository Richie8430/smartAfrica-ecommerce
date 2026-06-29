import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { FadeIn } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import { PackageIcon, TruckIcon, CheckCircleIcon, XCircleIcon } from '@/components/ui/Icons';
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

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: 'SHIPPED',
  SHIPPED:   'DELIVERED',
};

const STATUS_FILTERS: Array<OrderStatus | 'ALL'> = ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminOrders() {
  const qc                      = useQueryClient();
  const [page, setPage]         = useState(1);
  const [filter, setFilter]     = useState<OrderStatus | 'ALL'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, filter],
    queryFn:  () =>
      adminApi.listOrders({ page, limit: 20, status: filter === 'ALL' ? undefined : filter })
        .then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const orders     = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Orders</h1>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === s
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-neutral-100 border border-neutral-200 text-neutral-600 hover:border-primary/30 hover:text-primary'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-100 bg-white dark:bg-neutral-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Order ID</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Payment</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Total</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded-lg" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">No orders found.</td>
                </tr>
              )}
              {!isLoading && orders.map((order, i) => {
                const next = NEXT_STATUS[order.status];
                return (
                  <FadeIn key={order.order_id} as="tr" delay={i * 30}
                    className="hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary">
                          <PackageIcon size={15} />
                        </div>
                        <span className="font-mono text-xs font-semibold text-neutral-900">
                          #{order.order_id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAY_COLORS[order.payment_status]}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-neutral-900">
                      ${Number(order.total_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {next && (
                          <button
                            onClick={() => updateMutation.mutate({ id: order.order_id, status: next })}
                            disabled={updateMutation.isPending}
                            title={`Mark as ${next}`}
                            className="rounded-lg p-1.5 text-neutral-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            {next === 'SHIPPED'   ? <TruckIcon size={15} /> : <CheckCircleIcon size={15} />}
                          </button>
                        )}
                        {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                          <button
                            onClick={() => { if (confirm('Cancel this order?')) updateMutation.mutate({ id: order.order_id, status: 'CANCELLED' }); }}
                            disabled={updateMutation.isPending}
                            title="Cancel order"
                            className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <XCircleIcon size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </FadeIn>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-neutral-100 p-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="text-sm text-neutral-500">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
