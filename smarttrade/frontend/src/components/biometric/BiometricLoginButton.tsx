import { useWebAuthn } from '@/hooks/useWebAuthn';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useNavigate } from 'react-router-dom';

interface BiometricLoginButtonProps {
  email: string;
  onSuccess?: () => void;
}

function FingerprintIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
    </svg>
  );
}

export function BiometricLoginButton({ email, onSuccess }: BiometricLoginButtonProps) {
  const { isSupported, loading, error, loginWithBiometric, clearError } = useWebAuthn();
  const navigate = useNavigate();

  if (!isSupported) return null;

  async function handleClick() {
    if (!email.trim()) {
      toast.error('Enter your email first', 'Type your email address above, then try biometric sign-in.');
      return;
    }
    const result = await loginWithBiometric(email);
    if (result.success) {
      toast.success('Signed in!', 'Welcome back.');
      onSuccess ? onSuccess() : navigate('/account');
    }
    // On failure, the inline error message below the button (driven by the
    // hook's `error` state) is the single source of truth — no toast here,
    // so the user isn't shown two different error messages at once.
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        fullWidth
        loading={loading}
        leftIcon={<FingerprintIcon />}
        onClick={handleClick}
      >
        Sign in with fingerprint
      </Button>

      {error && (
        <div className="mt-2 text-sm text-red-600" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={clearError}
            className="mt-0.5 text-xs font-medium text-neutral-500 underline hover:text-neutral-700"
          >
            Use your password instead
          </button>
        </div>
      )}
    </div>
  );
}
