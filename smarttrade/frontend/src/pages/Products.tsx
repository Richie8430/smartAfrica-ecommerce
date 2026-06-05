import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/products.api';
import { ProductCard } from '@/components/products/ProductCard';
import { FadeIn } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import {
  SearchIcon, GridIcon, ListIcon, SlidersIcon, ChevronLeftIcon, ChevronRightIcon,
} from '@/components/ui/Icons';
import type { Category } from '@/types';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
] as const;

const LIMIT = 12;

export default function Products() {
  const [params, setParams] = useSearchParams();

  const page       = Number(params.get('page') ?? 1);
  const categoryId = params.get('category') ?? '';
  const sort       = (params.get('sort') ?? 'newest') as 'newest' | 'price_asc' | 'price_desc';
  const rawSearch  = params.get('q') ?? '';

  const [searchInput, setSearchInput]   = useState(rawSearch);
  const [viewMode, setViewMode]         = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters]   = useState(false);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (searchInput) { next.set('q', searchInput); next.delete('page'); }
      else             { next.delete('q'); }
      setParams(next, { replace: true });
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);  // eslint-disable-line react-hooks/exhaustive-deps

  const { data: productsData, isLoading, isError } = useQuery({
    queryKey: ['products', { page, categoryId, sort, q: rawSearch }],
    queryFn: () =>
      productsApi.list({
        page,
        limit:       LIMIT,
        category_id: categoryId || undefined,
        sort,
      }).then((r) => r.data),
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => productsApi.listCategories().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const categories: Category[] = catsData?.data ?? [];
  const products   = productsData?.data ?? [];
  const total      = productsData?.total ?? 0;
  const totalPages = productsData?.totalPages ?? 1;

  const setFilter = useCallback(
    (key: string, val: string | null) => {
      const next = new URLSearchParams(params);
      if (val) next.set(key, val); else next.delete(key);
      next.delete('page');
      setParams(next);
    },
    [params, setParams],
  );

  const setPage = (p: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 border-b border-neutral-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              placeholder="Search products…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 w-full rounded-brand border border-neutral-200 bg-white pl-9 pr-3 text-sm placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setFilter('sort', e.target.value)}
            className="h-9 rounded-brand border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-primary focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Filter toggle (mobile) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            leftIcon={<SlidersIcon size={15} />}
            className="sm:hidden"
          >
            Filter
          </Button>

          {/* View toggle */}
          <div className="hidden sm:flex items-center gap-1 rounded-brand border border-neutral-200 p-1">
            {(['grid', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`rounded p-1.5 transition-colors ${viewMode === v ? 'bg-primary text-white' : 'text-neutral-400 hover:text-neutral-700'}`}
              >
                {v === 'grid' ? <GridIcon size={16} /> : <ListIcon size={16} />}
              </button>
            ))}
          </div>

          {total > 0 && (
            <span className="hidden sm:block text-sm text-neutral-500 whitespace-nowrap">
              {total} product{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside
          className={`
            w-56 shrink-0 space-y-1
            ${showFilters ? 'block' : 'hidden'} sm:block
          `}
        >
          <FadeIn>
            <div className="rounded-2xl border border-neutral-100 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Category
              </p>
              <button
                onClick={() => setFilter('category', null)}
                className={`w-full rounded-brand px-3 py-2 text-left text-sm transition-colors ${
                  !categoryId
                    ? 'bg-primary/8 font-semibold text-primary'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                All Products
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.category_id}
                  onClick={() => setFilter('category', cat.category_id)}
                  className={`w-full rounded-brand px-3 py-2 text-left text-sm transition-colors ${
                    categoryId === cat.category_id
                      ? 'bg-primary/8 font-semibold text-primary'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </FadeIn>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Loading skeletons */}
          {isLoading && (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {Array.from({ length: LIMIT }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton rounded-2xl"
                  style={{ height: viewMode === 'grid' ? 300 : 96 }}
                />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center py-20 text-center">
              <p className="text-lg font-semibold text-neutral-700">Failed to load products</p>
              <p className="mt-1 text-sm text-neutral-500">Please check your connection and try again.</p>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && products.length === 0 && (
            <FadeIn className="flex flex-col items-center py-20 text-center">
              <div className="mb-4 rounded-full bg-neutral-100 p-6">
                <SearchIcon size={32} className="text-neutral-300" />
              </div>
              <p className="text-lg font-semibold text-neutral-700">No products found</p>
              <p className="mt-1 text-sm text-neutral-500">Try adjusting your search or filters.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setParams({})}>
                Clear filters
              </Button>
            </FadeIn>
          )}

          {/* Grid / List */}
          {!isLoading && products.length > 0 && (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                  : 'flex flex-col gap-3'
              }
            >
              {products.map((product, i) => (
                <FadeIn key={product.product_id} delay={i * 40}>
                  <ProductCard product={product} listView={viewMode === 'list'} />
                </FadeIn>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                leftIcon={<ChevronLeftIcon />}
              >
                Prev
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - page) <= 2)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-9 w-9 rounded-brand text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-primary text-white'
                        : 'border border-neutral-200 text-neutral-600 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {p}
                  </button>
                ))}

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                rightIcon={<ChevronRightIcon />}
              >
                Next
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
