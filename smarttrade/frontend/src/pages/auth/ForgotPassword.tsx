import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { AuthLayout } from './AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth.api';
import { toast } from '@/components/ui/Toast';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = [false, (_: boolean) => {}]; // eslint-disable-line
  const [submitted, setSubmitted] = [false, (_: boolean) => {}]; // eslint-disable-line

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit({ email }: FormValues) {
    try {
      await authApi.forgotPassword(email);
    } catch { /* swallowed — always show success to prevent enumeration */ }
    toast.success(
      'Reset link sent',
      'If that email is registered, you will receive instructions shortly.',
    );
  }

  void sent; void submitted; void setSent; void setSubmitted;

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send a reset link"
    >
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

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Remember your password?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
