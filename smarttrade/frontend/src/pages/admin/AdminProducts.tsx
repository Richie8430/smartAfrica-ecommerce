import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { productsApi } from '@/api/products.api';
import { adminApi, type CreateProductPayload } from '@/api/admin.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FadeIn } from '@/components/ui/Motion';
import {
  PlusIcon, EditIcon, TrashIcon, SearchIcon, ImageIcon, CloseIcon,
} from '@/components/ui/Icons';
import type { Product } from '@/types';

const schema = z.object({
  name:        z.string().min(2),
  description: z.string().min(10),
  price:       z.coerce.number().positive(),
  stock_qty:   z.coerce.number().int().min(0),
  category_id: z.string().min(1, 'Select a category'),
  image_url:   z.string().url().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function AdminProducts() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [page, setPage]             = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page],
    queryFn:  () => productsApi.list({ page, limit: 20 }).then((r) => r.data),
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => productsApi.listCategories().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const products   = (data?.data ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = data?.totalPages ?? 1;
  const categories = catsData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openCreate = () => { setEditProduct(null); reset({}); setModalOpen(true); };
  const openEdit   = (p: Product) => {
    setEditProduct(p);
    reset({
      name:        p.name,
      description: p.description,
      price:       Number(p.price),
      stock_qty:   p.stock_qty,
      category_id: p.category_id,
      image_url:   p.image_url ?? '',
    });
    setModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: FormData) => adminApi.createProduct(data as CreateProductPayload),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); setModalOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => adminApi.updateProduct(editProduct!.product_id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); setModalOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const onSubmit = (data: FormData) =>
    editProduct ? updateMutation.mutate(data) : createMutation.mutate(data);

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Products</h1>
        <Button size="sm" leftIcon={<PlusIcon size={15} />} onClick={openCreate}>
          Add product
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={15} />
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-brand border border-neutral-200 bg-white pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-600">Category</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Price</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-600">Stock</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="skeleton h-4 rounded-lg" />
                    </td>
                  ))}
                </tr>
              ))}
              {!isLoading && products.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">No products found.</td>
                </tr>
              )}
              {!isLoading && products.map((p, i) => (
                <FadeIn key={p.product_id} as="tr" delay={i * 30}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-neutral-50 overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-neutral-200">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-neutral-900 line-clamp-1">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900">${Number(p.price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.stock_qty <= 5 ? 'text-red-500 font-semibold' : 'text-neutral-700'}>
                      {p.stock_qty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.is_active ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {p.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <EditIcon size={15} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.product_id); }}
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </td>
                </FadeIn>
              ))}
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

      {/* Create / Edit modal */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 data-[state=open]:animate-[fade-in_0.2s_ease]" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl data-[state=open]:animate-[scale-in_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
          >
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-lg font-bold text-neutral-900">
                {editProduct ? 'Edit product' : 'Add product'}
              </Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors">
                <CloseIcon size={18} />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <Input label="Name" error={errors.name?.message} {...register('name')} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Description</label>
                <textarea
                  rows={3}
                  className="w-full rounded-brand border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  {...register('description')}
                />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Price ($)" type="number" step="0.01" error={errors.price?.message} {...register('price')} />
                <Input label="Stock qty" type="number" error={errors.stock_qty?.message} {...register('stock_qty')} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700">Category</label>
                <select
                  className="h-10 w-full rounded-brand border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none"
                  {...register('category_id')}
                >
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>{c.name}</option>
                  ))}
                </select>
                {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id.message}</p>}
              </div>
              <Input label="Image URL (optional)" placeholder="https://…" error={errors.image_url?.message} {...register('image_url')} />

              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>
                <Button type="submit" loading={isSubmitting}>
                  {editProduct ? 'Save changes' : 'Create product'}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
