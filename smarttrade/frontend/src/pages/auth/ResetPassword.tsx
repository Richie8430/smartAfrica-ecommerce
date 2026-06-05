import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { authApi } from '@/api/auth.api';
import { toast } from '@/components/ui/Toast';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[0-9]/, 'Must include a number')
      .regex(/[^a-zA-Z0-9]/, 'Must include a special character'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPassword() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const token          = searchParams.get('token') ?? '';
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const password = watch('password', '');

  async function onSubmit({ password: pw, confirmPassword }: FormValues) {
    if (!token) {
      toast.error('Invalid link', 'Request a new password reset link.');
      return;
    }
    try {
      await authApi.resetPassword(token, pw, confirmPassword);
      toast.success('Password updated!', 'Sign in with your new password.');
      navigate('/login');
    } catch {
      toast.error('Reset failed', 'The link may have expired. Request a new one.');
    }
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password you haven't used before">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <Input
            label="New password"
            type={showPw ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            required
            autoComplete="new-password"
            error={errors.password?.message}
            rightAddon={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={showPw
                      ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'
                      : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'}
                  />
                </svg>
              </button>
            }
            {...register('password')}
          />
          <PasswordStrengthIndicator password={password} />
        </div>

        <Input
          label="Confirm new password"
          type="password"
          placeholder="Repeat your password"
          required
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          Set new password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
