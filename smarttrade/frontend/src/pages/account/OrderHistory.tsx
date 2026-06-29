import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { ordersApi } from '@/api/orders.api';
import { FadeIn } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import {
  PackageIcon, ChevronRightIcon, ArrowRightIcon, CloseIcon,
  CheckCircleIcon, TruckIcon, CreditCardIcon,
} from '@/components/ui/Icons';
import type { Order, OrderStatus, PaymentStatus } from '@/types';

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

const TIMELINE_STEPS: Array<{ key: OrderStatus | 'PAID'; icon: React.ReactNode; label: string }> = [
  { key: 'CONFIRMED', icon: <CheckCircleIcon size={16} />, label: 'Confirmed'  },
  { key: 'PAID',      icon: <CreditCardIcon  size={16} />, label: 'Payment'    },
  { key: 'SHIPPED',   icon: <TruckIcon       size={16} />, label: 'Shipped'    },
  { key: 'DELIVERED', icon: <PackageIcon     size={16} />, label: 'Delivered'  },
];

function OrderDetailModal({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const statusIndex = ['PENDING','CONFIRMED','SHIPPED','DELIVERED'].indexOf(order.status);
  const isPaid = order.payment_status === 'PAID';

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-[fade-in_0.2s_ease]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white dark:bg-neutral-100 p-6 shadow-2xl data-[state=open]:animate-[scale-in_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
          aria-describedby="order-detail-desc"
        >
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="font-bold text-neutral-900">
              Order #{order.order_id.slice(0, 8).toUpperCase()}
            </Dialog.Title>
            <Dialog.Close
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Close order details"
            >
              <CloseIcon size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <p id="order-detail-desc" className="sr-only">
            Order details for {order.order_id.slice(0, 8).toUpperCase()}
          </p>

          {/* Timeline */}
          <div className="mb-5 flex items-center justify-between">
            {TIMELINE_STEPS.map(({ key, icon, label }, i) => {
              const reached = key === 'PAID'
                ? isPaid
                : statusIndex >= ['PENDING','CONFIRMED','SHIPPED','DELIVERED'].indexOf(key as OrderStatus);
              return (
                <div key={key} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${reached ? 'border-primary bg-primary text-white' : 'border-neutral-200 text-neutral-300'}`} aria-hidden="true">
                    {icon}
                  </div>
                  <span className={`text-[10px] font-medium ${reached ? 'text-primary' : 'text-neutral-400'}`}>{label}</span>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className="absolute mt-4 h-0.5 w-8 bg-neutral-100" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Statuses */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
              {order.status}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAY_COLORS[order.payment_status]}`}>
              {order.payment_status}
            </span>
          </div>

          {/* Items */}
          {order.order_items && order.order_items.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Items</p>
              {order.order_items.map((item) => (
                <div key={item.order_item_id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">{item.product?.name ?? `Item #${item.product_id.slice(0,6)}`}</span>
                  <span className="text-neutral-500">×{item.quantity}</span>
                  <span className="font-semibold text-neutral-900">${Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Shipping */}
          {order.shipping_address && (
            <div className="mb-4 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Shipping address</p>
              <p>{order.shipping_address.street}</p>
              <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postalCode}</p>
              <p>{order.shipping_address.country}</p>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between border-t border-neutral-100 pt-3 font-bold text-neutral-900">
            <span>Total</span>
            <span className="text-primary">${Number(order.total_amount).toFixed(2)}</span>
          </div>

          {/* Payment ref */}
          {order.payment?.tx_ref && (
            <p className="mt-2 text-xs text-neutral-400">
              Transaction ref: <code className="font-mono">{order.payment.tx_ref}</code>
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function OrderHistory() {
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page],
    queryFn:  () => ordersApi.list({ page, limit: 10 }).then((r) => r.data),
  });

  const orders     = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <FadeIn>
      <h2 className="mb-5 text-xl font-bold text-neutral-900">Order history</h2>

      {isLoading && (
        <div className="space-y-3" role="status" aria-label="Loading orders">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <PackageIcon size={36} className="mb-3 text-neutral-300" aria-hidden="true" />
          <p className="font-semibold text-neutral-600">No orders yet</p>
          <Link to="/products" className="mt-4">
            <Button size="sm" rightIcon={<ArrowRightIcon size={15} aria-hidden="true" />}>Start shopping</Button>
          </Link>
        </div>
      )}

      {!isLoading && orders.length > 0 && (
        <ul className="space-y-2" role="list" aria-label="Your orders">
          {orders.map((order) => (
            <li key={order.order_id}>
              <button
                onClick={() => setSelected(order)}
                className="group flex w-full items-center gap-3 rounded-xl border border-neutral-100 p-3 text-left transition-all hover:border-primary/20 hover:bg-primary/2"
                aria-label={`Order ${order.order_id.slice(0, 8).toUpperCase()}, ${order.status}, $${Number(order.total_amount).toFixed(2)}, view details`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary" aria-hidden="true">
                  <PackageIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-neutral-900">
                      #{order.order_id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PAY_COLORS[order.payment_status]}`}>
                      {order.payment_status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-primary">${Number(order.total_amount).toFixed(2)}</p>
                  <ChevronRightIcon className="ml-auto text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" size={15} aria-hidden="true" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2" aria-label="Order list pagination">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">Prev</Button>
          <span className="text-sm text-neutral-500" aria-live="polite">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">Next</Button>
        </div>
      )}

      {selected && (
        <OrderDetailModal order={selected} open={!!selected} onClose={() => setSelected(null)} />
      )}
    </FadeIn>
  );
}
