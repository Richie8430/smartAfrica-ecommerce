import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/products.api';
import { cartApi } from '@/api/cart.api';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { FadeIn } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import {
  CartIcon, TagIcon, StarIcon, ChevronLeftIcon, ImageIcon,
  CheckCircleIcon, TruckIcon, ShieldCheckIcon, MinusIcon, PlusIcon,
} from '@/components/ui/Icons';
import type { CartItem } from '@/types';

export default function ProductDetail() {
  const { id }       = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const qc           = useQueryClient();
  const optimisticAdd = useCartStore((s) => s.optimisticAdd);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [qty,      setQty]      = useState(1);
  const [imgError, setImgError] = useState(false);
  const [added,    setAdded]    = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn:  () => productsApi.get(id!).then((r) => r.data),
    enabled:  !!id,
  });

  const product = data?.data;

  const addMutation = useMutation({
    mutationFn: () => cartApi.addItem(product!.product_id, qty),
    onMutate: () => {
      optimisticAdd({
        cart_item_id: `temp-${product!.product_id}`,
        user_id:      '',
        product_id:   product!.product_id,
        quantity:     qty,
        product:      product!,
        available:    true,
      } as CartItem);
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const buyNow = async () => {
    await addMutation.mutateAsync();
    navigate('/checkout');
  };

  if (isLoading) return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="skeleton aspect-square rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-8 w-3/4 rounded-xl" />
          <div className="skeleton h-6 w-1/3 rounded-xl" />
          <div className="skeleton h-32 rounded-xl" />
          <div className="skeleton h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );

  if (isError || !product) return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="text-lg font-semibold text-neutral-700">Product not found</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/products')}>
        <ChevronLeftIcon /> Back to products
      </Button>
    </div>
  );

  const price   = Number(product.price);
  const inStock = product.stock_qty > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-primary transition-colors">Products</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link to={`/products?category=${product.category_id}`} className="hover:text-primary transition-colors">
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-neutral-900 font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        <FadeIn>
          <div className="grid gap-10 md:grid-cols-2">
            {/* Image */}
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-white dark:bg-neutral-100 border border-neutral-100 shadow-sm">
              {product.image_url && !imgError ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  onError={() => setImgError(true)}
                  loading="eager"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon size={80} className="text-neutral-200" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col">
              {product.category && (
                <span className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  <TagIcon size={13} /> {product.category.name}
                </span>
              )}

              <h1 className="text-3xl font-bold text-neutral-900 leading-tight">{product.name}</h1>

              {/* Stars */}
              <div className="mt-2 flex items-center gap-1.5">
                {[1,2,3,4,5].map((s) => (
                  <StarIcon key={s} size={16} className={s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'} />
                ))}
                <span className="ml-1 text-sm text-neutral-500">4.0 · 42 reviews</span>
              </div>

              <div className="mt-4 text-4xl font-extrabold text-primary">${price.toFixed(2)}</div>

              <p className="mt-4 text-neutral-600 leading-relaxed">{product.description}</p>

              {/* Stock */}
              <div className="mt-4 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  inStock
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-600'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${inStock ? 'bg-green-500' : 'bg-red-500'}`} />
                  {inStock ? `In stock (${product.stock_qty} available)` : 'Out of stock'}
                </span>
              </div>

              {/* Qty + CTA */}
              {isAuthenticated && inStock && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-neutral-600">Qty:</span>
                    <div className="flex items-center rounded-brand border border-neutral-200">
                      <button
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        className="flex h-9 w-9 items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors"
                      >
                        <MinusIcon size={14} />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                      <button
                        onClick={() => setQty(Math.min(product.stock_qty, qty + 1))}
                        className="flex h-9 w-9 items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors"
                      >
                        <PlusIcon size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      fullWidth
                      loading={addMutation.isPending}
                      onClick={() => addMutation.mutate()}
                      leftIcon={added ? <CheckCircleIcon size={18} /> : <CartIcon size={18} />}
                      className={added ? '!bg-green-600' : ''}
                    >
                      {added ? 'Added to cart!' : 'Add to cart'}
                    </Button>
                    <Button
                      fullWidth
                      variant="secondary"
                      onClick={buyNow}
                      loading={addMutation.isPending}
                    >
                      Buy Now
                    </Button>
                  </div>
                </div>
              )}

              {!isAuthenticated && (
                <div className="mt-6">
                  <Link to="/login">
                    <Button fullWidth>Sign in to purchase</Button>
                  </Link>
                </div>
              )}

              {/* Trust badges */}
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-neutral-100 pt-6">
                {[
                  { icon: <TruckIcon size={20} />,        text: 'Free delivery over $50' },
                  { icon: <ShieldCheckIcon size={20} />,  text: 'Secure payments' },
                  { icon: <CheckCircleIcon size={20} />,  text: '30-day returns' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex flex-col items-center gap-1.5 text-center">
                    <span className="text-primary">{icon}</span>
                    <span className="text-xs text-neutral-500">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
