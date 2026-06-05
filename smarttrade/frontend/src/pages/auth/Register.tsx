import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { AuthLayout } from './AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { authApi } from '@/api/auth.api';
import { toast } from '@/components/ui/Toast';
import type { ApiResponse } from '@/types';

const schema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email:     z.string().email('Enter a valid email address'),
  phone:     z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Use international format, e.g. +2348012345678'),
  password:  z
    .string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number')
    .regex(/[^a-zA-Z0-9]/, 'Must include a special character'),
});

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const password = watch('password', '');

  async function onSubmit(data: FormValues) {
    try {
      const { data: res } = await authApi.register(data);
      if (!res.data) throw new Error('Registration failed');
      toast.success('Account created!', 'Check your email for a 6-digit code.');
      navigate(`/verify-email?userId=${res.data.userId}`);
    } catch (err) {
      const apiError = err as AxiosError<ApiResponse>;
      if (apiError.response?.status === 409) {
        setError('email', { message: 'This email is already registered' });
      } else if (apiError.response?.data?.errors) {
        const errs = apiError.response.data.errors;
        Object.entries(errs).forEach(([field, msg]) =>
          setError(field as keyof FormValues, { message: msg }),
        );
      } else {
        toast.error('Registration failed', 'Something went wrong — please try again.');
      }
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join SmartTrade Africa today">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Full name"
          placeholder="Ada Okonkwo"
          required
          autoComplete="name"
          error={errors.full_name?.message}
          {...register('full_name')}
        />

        <Input
          label="Email address"
          type="email"
          placeholder="ada@example.com"
          required
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Phone number"
          type="tel"
          placeholder="+2348012345678"
          required
          autoComplete="tel"
          helperText="International format with country code"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div>
          <Input
            label="Password"
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
          <PasswordStrengthIndicator password={password} />
        </div>

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
