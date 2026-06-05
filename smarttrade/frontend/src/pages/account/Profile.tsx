import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { accountApi } from '@/api/account.api';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FadeIn } from '@/components/ui/Motion';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { CheckCircleIcon, UserIcon, KeyIcon, AlertTriangleIcon } from '@/components/ui/Icons';

// ─── Profile form ─────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone:     z.string().min(7, 'Enter a valid phone number').optional().or(z.literal('')),
});
type ProfileForm = z.infer<typeof profileSchema>;

// ─── Change password form ─────────────────────────────────────────────────────

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword:     z.string().min(8).regex(
    /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/,
    'Must have uppercase, number, and special character',
  ),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});
type PwForm = z.infer<typeof pwSchema>;

// ─── Delete account form ──────────────────────────────────────────────────────

const deleteSchema = z.object({
  confirmation: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE exactly' }) }),
  password:     z.string().min(1, 'Enter your password'),
});
type DeleteForm = z.infer<typeof deleteSchema>;

export default function Profile() {
  const user       = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const clearAuth  = useAuthStore((s) => s.clearAuth);
  const clearCart  = useCartStore((s) => s.clearCart);
  const navigate   = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  // ── Profile ────────────────────────────────────────────────────────────────
  const { register: rp, handleSubmit: hp, reset: resetP, watch: watchP,
          formState: { errors: ep, isDirty: dirtyP } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name ?? '', phone: user?.phone ?? '' },
  });

  useEffect(() => {
    resetP({ full_name: user?.full_name ?? '', phone: user?.phone ?? '' });
  }, [user, resetP]);

  const profileMutation = useMutation({
    mutationFn: (d: ProfileForm) => accountApi.updateProfile({ full_name: d.full_name, phone: d.phone || null }),
    onSuccess:  (res) => {
      const u = res.data.data;
      if (u) updateUser({ full_name: u.full_name, phone: u.phone });
      resetP({ full_name: res.data.data?.full_name ?? '', phone: res.data.data?.phone ?? '' });
    },
  });

  // ── Change password ────────────────────────────────────────────────────────
  const { register: rw, handleSubmit: hw, reset: resetW, watch: watchW,
          formState: { errors: ew } } = useForm<PwForm>({ resolver: zodResolver(pwSchema) });

  const pwMutation = useMutation({
    mutationFn: (d: PwForm) =>
      authApi.resetPassword(d.currentPassword, d.newPassword, d.confirmPassword),
    onSuccess: () => resetW(),
  });

  // ── Delete account ─────────────────────────────────────────────────────────
  const { register: rd, handleSubmit: hd, formState: { errors: ed, isSubmitting: deletingAcc } } =
    useForm<DeleteForm>({ resolver: zodResolver(deleteSchema) });

  const deleteMutation = useMutation({
    mutationFn: (d: DeleteForm) => accountApi.deleteAccount(d.password),
    onSuccess:  () => { clearAuth(); clearCart(); navigate('/'); },
  });

  return (
    <FadeIn>
      <div className="flex items-center gap-2 mb-6">
        <UserIcon className="text-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold text-neutral-900">Profile</h2>
      </div>

      <div className="space-y-10 max-w-md">
        {/* ── Edit profile ─────────────────────────────────────────────────── */}
        <section aria-labelledby="profile-heading">
          <h3 id="profile-heading" className="mb-4 font-semibold text-neutral-800">Personal information</h3>
          <form onSubmit={hp((d) => profileMutation.mutate(d))} className="space-y-4">
            <Input
              label="Full name"
              placeholder="Your name"
              error={ep.full_name?.message}
              aria-required="true"
              {...rp('full_name')}
            />
            <Input
              label="Phone number"
              placeholder="+2348012345678"
              error={ep.phone?.message}
              {...rp('phone')}
            />
            <div>
              <label className="text-sm font-medium text-neutral-700">Email</label>
              <p className="mt-1.5 rounded-brand border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
                {user?.email}
              </p>
              <p className="mt-1 text-xs text-neutral-400">Email cannot be changed.</p>
            </div>

            {profileMutation.isError && (
              <p role="alert" className="text-sm text-red-600">Failed to update profile. Please try again.</p>
            )}
            {profileMutation.isSuccess && (
              <p role="status" className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircleIcon size={15} aria-hidden="true" /> Profile updated.
              </p>
            )}
            <Button type="submit" loading={profileMutation.isPending} disabled={!dirtyP}>
              Save changes
            </Button>
          </form>
        </section>

        {/* ── Change password ───────────────────────────────────────────────── */}
        <section aria-labelledby="pw-heading" className="border-t border-neutral-100 pt-8">
          <div className="mb-4 flex items-center gap-2">
            <KeyIcon size={16} className="text-neutral-500" aria-hidden="true" />
            <h3 id="pw-heading" className="font-semibold text-neutral-800">Change password</h3>
          </div>
          <form onSubmit={hw((d) => pwMutation.mutate(d))} className="space-y-3">
            <Input label="Current password" type="password" error={ew.currentPassword?.message} {...rw('currentPassword')} />
            <div>
              <Input label="New password" type="password" error={ew.newPassword?.message} {...rw('newPassword')} />
              <PasswordStrengthIndicator password={watchW('newPassword') ?? ''} />
            </div>
            <Input label="Confirm new password" type="password" error={ew.confirmPassword?.message} {...rw('confirmPassword')} />

            {pwMutation.isError && (
              <p role="alert" className="text-sm text-red-600">
                {(pwMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to change password.'}
              </p>
            )}
            {pwMutation.isSuccess && (
              <p role="status" className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircleIcon size={15} aria-hidden="true" /> Password updated. You've been signed out on other devices.
              </p>
            )}
            <Button type="submit" loading={pwMutation.isPending}>Update password</Button>
          </form>
        </section>

        {/* ── Delete account ────────────────────────────────────────────────── */}
        <section aria-labelledby="delete-heading" className="border-t border-neutral-100 pt-8">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangleIcon size={16} className="text-red-500" aria-hidden="true" />
            <h3 id="delete-heading" className="font-semibold text-red-600">Danger zone</h3>
          </div>
          <p className="mb-4 text-sm text-neutral-500">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!showDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDelete(true)}
              aria-expanded={showDelete}
              aria-controls="delete-form"
            >
              Delete my account
            </Button>
          )}

          {showDelete && (
            <div
              id="delete-form"
              role="alert"
              aria-live="polite"
              className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3"
            >
              <p className="text-sm font-semibold text-red-700">
                Type <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono">DELETE</code> to confirm.
              </p>
              <form onSubmit={hd((d) => deleteMutation.mutate(d))} className="space-y-3">
                <Input
                  placeholder="Type DELETE"
                  error={ed.confirmation?.message}
                  aria-label="Type DELETE to confirm account deletion"
                  {...rd('confirmation')}
                />
                <Input
                  type="password"
                  placeholder="Your password"
                  error={ed.password?.message}
                  aria-label="Your current password"
                  {...rd('password')}
                />
                {deleteMutation.isError && (
                  <p role="alert" className="text-sm text-red-700">
                    {(deleteMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete account.'}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" variant="danger" size="sm" loading={deletingAcc || deleteMutation.isPending}>
                    Delete permanently
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowDelete(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </FadeIn>
  );
}
