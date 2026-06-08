import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { AuthLayout } from './AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BiometricLoginButton } from '@/components/biometric/BiometricLoginButton';
import { BiometricEnrollModal } from '@/components/biometric/BiometricEnrollModal';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';

const BIOMETRIC_DISMISS_KEY = 'biometric_prompt_dismissed';

const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const navigate      = useNavigate();
  const [searchParams]= useSearchParams();
  const returnUrl     = searchParams.get('returnUrl') ?? '/account';
  const { setAuth }   = useAuthStore();
  const [showPw, setShowPw]                     = useState(false);
  const [showEnrollModal, setShowEnrollModal]   = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const emailValue = watch('email', '');

  async function onSubmit(data: FormValues) {
    try {
      const { data: res } = await authApi.login(data);
      if (!res.data) throw new Error();
      const { user, accessToken } = res.data;
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);

      const destination = user.role === 'ADMIN' ? '/admin' : returnUrl;

      // Prompt biometric enroll if not enrolled and not dismissed
      if (!user.biometric_enrolled && !localStorage.getItem(BIOMETRIC_DISMISS_KEY)) {
        setShowEnrollModal(true);
      } else {
        navigate(destination, { replace: true });
      }
    } catch (err) {
      const apiError = err as AxiosError<ApiResponse>;
      const status   = apiError.response?.status;

      if (status === 401) {
        setError('password', { message: 'Invalid email or password' });
      } else if (status === 403) {
        toast.error('Email not verified', 'Check your inbox for the 6-digit verification code.');
      } else if (status === 423) {
        toast.error('Account locked', 'Too many failed attempts. Try again in 30 minutes.');
      } else {
        toast.error('Sign in failed', 'Something went wrong — please try again.');
      }
    }
  }

  return (
    <>
      <AuthLayout title="Sign in to SmartTrade" subtitle="Welcome back — glad to see you!">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700">
                Password <span className="text-red-500">*</span>
              </label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              error={errors.password?.message}
              className="mt-1"
              rightAddon={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              }
              {...register('password')}
            />
          </div>

          <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
            Sign in
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-neutral-400">or continue with</span>
            </div>
          </div>

          <BiometricLoginButton
            email={emailValue}
            onSuccess={() => {
              const role = useAuthStore.getState().user?.role;
              navigate(role === 'ADMIN' ? '/admin' : returnUrl, { replace: true });
            }}
          />
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          New to SmartTrade?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create account
          </Link>
        </p>
      </AuthLayout>

      <BiometricEnrollModal
        open={showEnrollModal}
        onClose={() => {
          setShowEnrollModal(false);
          const role = useAuthStore.getState().user?.role;
          navigate(role === 'ADMIN' ? '/admin' : returnUrl, { replace: true });
        }}
      />
    </>
  );
}
