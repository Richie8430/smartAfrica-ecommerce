import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { cartApi } from '@/api/cart.api';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/Button';
import { CartIcon, ImageIcon, TagIcon, StarIcon } from '@/components/ui/Icons';
import type { Product, CartItem } from '@/types';

interface ProductCardProps {
  product:   Product;
  className?: string;
  listView?:  boolean;
}

export function ProductCard({ product, className, listView = false }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const optimisticAdd = useCartStore((s) => s.optimisticAdd);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const addMutation = useMutation({
    mutationFn: () => cartApi.addItem(product.product_id, 1),
    onMutate: () => {
      optimisticAdd({
        cart_item_id: `temp-${product.product_id}`,
        user_id:      '',
        product_id:   product.product_id,
        quantity:     1,
        product,
        available:    true,
      } as CartItem);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const price  = Number(product.price);
  const inStock = product.stock_qty > 0;

  if (listView) {
    return (
      <div
        className={clsx(
          'group flex gap-4 rounded-2xl border border-neutral-100 bg-white p-4',
          'transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5',
          className,
        )}
      >
        <Link
          to={`/products/${product.product_id}`}
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-50"
        >
          {product.image_url && !imgError ? (
            <img
              src={product.image_url}
              alt={product.name}
              onError={() => setImgError(true)}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <ImageIcon size={32} />
            </div>
          )}
        </Link>

        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            {product.category && (
              <span className="mb-1 inline-flex items-center gap-1 text-xs text-primary font-medium">
                <TagIcon size={11} /> {product.category.name}
              </span>
            )}
            <Link to={`/products/${product.product_id}`}>
              <h3 className="font-semibold text-neutral-900 truncate hover:text-primary transition-colors">
                {product.name}
              </h3>
            </Link>
            <p className="mt-0.5 text-sm text-neutral-500 line-clamp-1">{product.description}</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-bold text-primary">${price.toFixed(2)}</span>
            <div className="flex items-center gap-2">
              <span className={clsx('text-xs font-medium', inStock ? 'text-green-600' : 'text-red-500')}>
                {inStock ? `${product.stock_qty} in stock` : 'Out of stock'}
              </span>
              {isAuthenticated && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!inStock}
                  loading={addMutation.isPending}
                  onClick={() => addMutation.mutate()}
                  leftIcon={<CartIcon size={14} />}
                >
                  Add
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'group relative flex flex-col rounded-2xl border border-neutral-100 bg-white overflow-hidden',
        'transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/8',
        className,
      )}
    >
      {/* Image */}
      <Link
        to={`/products/${product.product_id}`}
        className="relative aspect-[4/3] overflow-hidden bg-neutral-50"
      >
        {product.image_url && !imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            onError={() => setImgError(true)}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon size={48} className="text-neutral-200" />
          </div>
        )}

        {/* Overlay badges */}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-neutral-900/80 px-3 py-1 text-xs font-semibold text-white">
              Out of stock
            </span>
          </div>
        )}

        {/* Quick add overlay on hover */}
        {isAuthenticated && inStock && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
            <button
              onClick={(e) => { e.preventDefault(); addMutation.mutate(); }}
              disabled={addMutation.isPending}
              className="flex w-full items-center justify-center gap-2 bg-primary/90 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-primary"
            >
              <CartIcon size={16} />
              {addMutation.isPending ? 'Adding…' : 'Quick Add'}
            </button>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <span className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary">
            <TagIcon size={11} /> {product.category.name}
          </span>
        )}

        <Link to={`/products/${product.product_id}`} className="flex-1">
          <h3 className="font-semibold text-neutral-900 line-clamp-2 leading-snug hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-1">
          {[1,2,3,4,5].map((s) => (
            <StarIcon key={s} size={12} className={s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'} />
          ))}
          <span className="ml-1 text-xs text-neutral-400">(4.0)</span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">${price.toFixed(2)}</span>
          {isAuthenticated && (
            <Button
              size="sm"
              variant="ghost"
              disabled={!inStock || addMutation.isPending}
              loading={addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              <CartIcon size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
