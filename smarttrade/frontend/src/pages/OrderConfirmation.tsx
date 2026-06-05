import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders.api';
import { FadeIn } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import {
  CheckCircleIcon, PackageIcon, TruckIcon, CartIcon,
  ImageIcon, ArrowRightIcon,
} from '@/components/ui/Icons';

const STATUS_STEPS = ['CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowCheck(true), 200);
    return () => clearTimeout(t);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn:  () => ordersApi.get(orderId!).then((r) => r.data),
    enabled:  !!orderId,
  });

  const order = data?.data;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="skeleton h-20 w-20 rounded-full" />
      <div className="skeleton h-8 w-64 rounded-xl" />
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 text-center">
        {/* Success icon */}
        <div
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-50"
          style={{ animation: showCheck ? 'scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none' }}
        >
          <CheckCircleIcon size={52} className="text-green-500" />
        </div>

        <FadeIn delay={150}>
          <h1 className="text-3xl font-bold text-neutral-900">Order confirmed!</h1>
          <p className="mt-2 text-neutral-500">
            Thank you for your purchase. We'll send you shipping updates by email.
          </p>
        </FadeIn>

        {order && (
          <FadeIn delay={250}>
            <div className="mt-8 rounded-2xl border border-neutral-100 bg-white p-6 text-left shadow-sm">
              {/* Order ID + status */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Order ID</p>
                  <p className="font-mono text-sm font-semibold text-neutral-900">
                    #{order.order_id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  order.payment_status === 'PAID'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {order.payment_status}
                </span>
              </div>

              {/* Progress tracker */}
              <div className="mb-6 flex items-center justify-between">
                {STATUS_STEPS.map((step, i) => {
                  const reached = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]) >= i;
                  return (
                    <div key={step} className="flex flex-1 flex-col items-center gap-2">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                        reached
                          ? 'border-primary bg-primary text-white'
                          : 'border-neutral-200 bg-white text-neutral-300'
                      }`}>
                        {step === 'CONFIRMED' && <CheckCircleIcon size={18} />}
                        {step === 'SHIPPED'   && <TruckIcon size={18} />}
                        {step === 'DELIVERED' && <PackageIcon size={18} />}
                      </div>
                      <span className={`text-xs font-medium ${reached ? 'text-primary' : 'text-neutral-400'}`}>
                        {step}
                      </span>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`absolute mt-4 h-0.5 w-1/4 ${reached ? 'bg-primary' : 'bg-neutral-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Items */}
              {order.order_items && order.order_items.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Items</p>
                  {order.order_items.map((item) => (
                    <div key={item.order_item_id} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-50">
                        {item.product?.image_url ? (
                          <img src={item.product.image_url} alt={item.product.name} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-neutral-300">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {item.product?.name ?? `Product #${item.product_id.slice(0, 6)}`}
                        </p>
                        <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold text-neutral-800">
                        ${Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="mt-5 flex justify-between border-t border-neutral-100 pt-4 text-base font-bold text-neutral-900">
                <span>Total paid</span>
                <span className="text-primary">${Number(order.total_amount).toFixed(2)}</span>
              </div>

              {/* Delivery */}
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary">
                <TruckIcon size={16} />
                <span>Estimated delivery: 3–5 business days</span>
              </div>
            </div>
          </FadeIn>
        )}

        <FadeIn delay={350} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/orders">
            <Button variant="outline" leftIcon={<PackageIcon size={16} />}>View my orders</Button>
          </Link>
          <Link to="/products">
            <Button rightIcon={<ArrowRightIcon size={16} />}>
              <CartIcon size={16} className="mr-1" /> Continue shopping
            </Button>
          </Link>
        </FadeIn>
      </div>
    </div>
  );
}
