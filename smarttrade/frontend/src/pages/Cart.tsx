import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/api/cart.api';
import { useCartStore } from '@/stores/cart.store';
import { FadeIn } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import {
  CartIcon, TrashIcon, MinusIcon, PlusIcon, ArrowRightIcon,
  ImageIcon, TruckIcon,
} from '@/components/ui/Icons';
import { SecureCheckoutBanner } from '@/components/trust/SecureCheckoutBanner';

const FREE_SHIPPING_THRESHOLD = 50;

export default function Cart() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { items, total, itemCount, setCart, optimisticRemove } = useCartStore();

  const { isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn:  () => cartApi.get().then((r) => { if (r.data.data) setCart(r.data.data); return r.data; }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => cartApi.updateItem(id, qty),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => cartApi.removeItem(id),
    onMutate:   (id) => optimisticRemove(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const clearMutation = useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const shippingFee   = total >= FREE_SHIPPING_THRESHOLD ? 0 : 5.99;
  const orderTotal    = total + shippingFee;

  if (isLoading) return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton h-24 rounded-2xl" />
      ))}
    </div>
  );

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div
        className="mb-6 rounded-full bg-primary/8 p-8"
        style={{ animation: 'fade-up 0.5s cubic-bezier(0,0,0.2,1) both' }}
      >
        <CartIcon size={48} className="text-primary" />
      </div>
      <h2
        className="text-2xl font-bold text-neutral-900"
        style={{ animation: 'fade-up 0.5s 0.1s cubic-bezier(0,0,0.2,1) both' }}
      >
        Your cart is empty
      </h2>
      <p
        className="mt-2 text-neutral-500"
        style={{ animation: 'fade-up 0.5s 0.2s cubic-bezier(0,0,0.2,1) both' }}
      >
        Add some products and they'll appear here.
      </p>
      <Link to="/products" style={{ animation: 'fade-up 0.5s 0.3s cubic-bezier(0,0,0.2,1) both' }}>
        <Button className="mt-6" leftIcon={<ArrowRightIcon size={16} />}>Start shopping</Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">
            Cart <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-base font-semibold text-primary">{itemCount}</span>
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearMutation.mutate()}
            loading={clearMutation.isPending}
          >
            Clear cart
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Items */}
          <div className="space-y-3">
            {items.map((item, i) => (
              <FadeIn key={item.cart_item_id} delay={i * 50}>
                <div className="flex gap-4 rounded-2xl border border-neutral-100 bg-white p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5">
                  <Link
                    to={`/products/${item.product_id}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-50"
                  >
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-300">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/products/${item.product_id}`}>
                        <h3 className="font-semibold text-neutral-900 truncate hover:text-primary transition-colors">
                          {item.product.name}
                        </h3>
                      </Link>
                      <button
                        onClick={() => removeMutation.mutate(item.cart_item_id)}
                        disabled={removeMutation.isPending}
                        className="shrink-0 rounded-lg p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Qty controls */}
                      <div className="flex items-center rounded-brand border border-neutral-200">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? updateMutation.mutate({ id: item.cart_item_id, qty: item.quantity - 1 })
                              : removeMutation.mutate(item.cart_item_id)
                          }
                          className="flex h-8 w-8 items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                          <MinusIcon size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateMutation.mutate({ id: item.cart_item_id, qty: item.quantity + 1 })
                          }
                          disabled={item.quantity >= item.product.stock_qty}
                          className="flex h-8 w-8 items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-30"
                        >
                          <PlusIcon size={13} />
                        </button>
                      </div>

                      <span className="text-base font-bold text-primary">
                        ${(Number(item.product.price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Summary */}
          <FadeIn delay={100}>
            <div className="sticky top-24 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-neutral-900">Order summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                  <span className="font-medium text-neutral-900">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Shipping</span>
                  {shippingFee === 0 ? (
                    <span className="font-medium text-green-600">Free</span>
                  ) : (
                    <span className="font-medium text-neutral-900">${shippingFee.toFixed(2)}</span>
                  )}
                </div>
                {total < FREE_SHIPPING_THRESHOLD && (
                  <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary">
                    Add ${(FREE_SHIPPING_THRESHOLD - total).toFixed(2)} more for free shipping!
                  </p>
                )}
                <div className="border-t border-neutral-100 pt-3 flex justify-between text-base font-bold text-neutral-900">
                  <span>Total</span>
                  <span className="text-primary">${orderTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                className="mt-5"
                rightIcon={<ArrowRightIcon size={18} />}
                onClick={() => navigate('/checkout')}
              >
                Proceed to checkout
              </Button>

              <div className="mt-3">
                <SecureCheckoutBanner />
              </div>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                <TruckIcon size={13} aria-hidden="true" />
                <span>3–5 business day delivery</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
