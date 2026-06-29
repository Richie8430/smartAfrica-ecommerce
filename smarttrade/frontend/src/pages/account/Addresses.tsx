import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { accountApi, type AddressPayload } from '@/api/account.api';
import { FadeIn } from '@/components/ui/Motion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { MapPinIcon, PlusIcon, EditIcon, TrashIcon, CheckCircleIcon, CloseIcon } from '@/components/ui/Icons';

const schema = z.object({
  full_name:    z.string().min(2,  'Enter a name'),
  address_line: z.string().min(5,  'Enter a street address'),
  city:         z.string().min(2,  'Enter a city'),
  state:        z.string().min(2,  'Enter a state'),
  country:      z.string().min(2,  'Enter a country'),
  zip_code:     z.string().min(3,  'Enter a postal code'),
  phone:        z.string().optional(),
  is_default:   z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function AddressFormModal({
  open, onClose, initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: import('@/api/account.api').Address | null;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: initial
        ? { full_name: initial.full_name, address_line: initial.address_line, city: initial.city,
            state: initial.state, country: initial.country, zip_code: initial.zip_code,
            phone: initial.phone ?? '', is_default: initial.is_default }
        : {},
    });

  const saveMutation = useMutation({
    mutationFn: (d: FormData) =>
      initial
        ? accountApi.updateAddress(initial.address_id, d as AddressPayload)
        : accountApi.createAddress(d as AddressPayload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] });
      toast.success(initial ? 'Address updated' : 'Address added');
      reset();
      onClose();
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-[fade-in_0.2s_ease]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white dark:bg-neutral-100 p-6 shadow-2xl data-[state=open]:animate-[scale-in_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
          aria-describedby="address-form-desc"
        >
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="font-bold text-neutral-900">
              {initial ? 'Edit address' : 'Add new address'}
            </Dialog.Title>
            <Dialog.Close
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100"
              aria-label="Close address form"
            >
              <CloseIcon size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <p id="address-form-desc" className="sr-only">Fill in your address details</p>

          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-3">
            <Input label="Full name" error={errors.full_name?.message} aria-required="true" {...register('full_name')} />
            <Input label="Street address" error={errors.address_line?.message} aria-required="true" {...register('address_line')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" error={errors.city?.message} aria-required="true" {...register('city')} />
              <Input label="State" error={errors.state?.message} aria-required="true" {...register('state')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Country" error={errors.country?.message} aria-required="true" {...register('country')} />
              <Input label="Postal code" error={errors.zip_code?.message} aria-required="true" {...register('zip_code')} />
            </div>
            <Input label="Phone (optional)" {...register('phone')} />
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" className="accent-primary" {...register('is_default')} />
              Set as default address
            </label>

            {saveMutation.isError && (
              <p role="alert" className="text-sm text-red-600">Failed to save address.</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button variant="outline" type="button" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              </Dialog.Close>
              <Button type="submit" loading={isSubmitting || saveMutation.isPending}>
                {initial ? 'Save changes' : 'Add address'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function Addresses() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<import('@/api/account.api').Address | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn:  () => accountApi.getAddresses().then((r) => r.data),
  });

  const addresses = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountApi.deleteAddress(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address removed'); },
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => accountApi.updateAddress(id, { is_default: true }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });

  return (
    <FadeIn>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPinIcon className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-bold text-neutral-900">Saved addresses</h2>
        </div>
        <Button
          size="sm"
          leftIcon={<PlusIcon size={15} aria-hidden="true" />}
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          aria-label="Add a new address"
        >
          Add address
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3" role="status" aria-label="Loading addresses">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && addresses.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-neutral-100 p-5">
            <MapPinIcon size={30} className="text-neutral-300" aria-hidden="true" />
          </div>
          <p className="font-semibold text-neutral-600">No saved addresses</p>
          <p className="mt-1 text-sm text-neutral-400">Add an address to speed up checkout.</p>
        </div>
      )}

      {!isLoading && addresses.length > 0 && (
        <ul className="space-y-3" role="list" aria-label="Your saved addresses">
          {addresses.map((addr) => (
            <li
              key={addr.address_id}
              className="rounded-2xl border border-neutral-100 bg-white dark:bg-neutral-100 p-4"
              aria-label={`${addr.is_default ? 'Default address: ' : ''}${addr.full_name}, ${addr.city}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-neutral-900">{addr.full_name}</p>
                    {addr.is_default && (
                      <span
                        role="note"
                        className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700"
                      >
                        <CheckCircleIcon size={11} aria-hidden="true" /> Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">
                    {addr.address_line}, {addr.city}, {addr.state} {addr.zip_code}
                  </p>
                  <p className="text-sm text-neutral-600">{addr.country}</p>
                  {addr.phone && <p className="text-sm text-neutral-400">{addr.phone}</p>}
                </div>

                <div className="flex shrink-0 gap-1">
                  {!addr.is_default && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => defaultMutation.mutate(addr.address_id)}
                      loading={defaultMutation.isPending}
                      aria-label={`Set ${addr.full_name} address as default`}
                    >
                      Set default
                    </Button>
                  )}
                  <button
                    onClick={() => { setEditTarget(addr); setModalOpen(true); }}
                    aria-label={`Edit ${addr.full_name} address`}
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                  >
                    <EditIcon size={15} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Remove this address?')) deleteMutation.mutate(addr.address_id); }}
                    disabled={deleteMutation.isPending}
                    aria-label={`Delete ${addr.full_name} address`}
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <TrashIcon size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editTarget}
      />
    </FadeIn>
  );
}
