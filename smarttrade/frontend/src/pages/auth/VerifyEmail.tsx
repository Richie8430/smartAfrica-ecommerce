import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { AuthLayout } from './AuthLayout';
import { Button } from '@/components/ui/Button';
import { MailIcon } from '@/components/ui/Icons';
import { authApi } from '@/api/auth.api';
import { toast } from '@/components/ui/Toast';

const OTP_LENGTH = 6;

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const userId         = searchParams.get('userId') ?? '';
  const navigate       = useNavigate();

  const [digits,    setDigits]   = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [shake, setShake] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null));

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const submitOTP = useCallback(async (otp: string) => {
    if (!userId) { toast.error('Missing user ID'); return; }
    setSubmitting(true);
    try {
      await authApi.verifyEmail(userId, otp);
      toast.success('Email verified!', 'Sign in to continue.');
      navigate('/login');
    } catch {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast.error('Invalid code', 'Double-check the 6-digit code and try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      refs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }, [userId, navigate]);

  function handleChange(index: number, value: string) {
    const single = value.replace(/\D/g, '').slice(-1);
    const next   = [...digits];
    next[index]  = single;
    setDigits(next);
    if (single && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
    const otp = next.join('');
    if (otp.length === OTP_LENGTH) void submitOTP(otp);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft'  && index > 0)             refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    pasted.split('').forEach((ch, i) => { if (i < OTP_LENGTH) next[i] = ch; });
    setDigits(next);
    const nextEmpty = next.findIndex((d) => !d);
    refs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();
    if (next.filter(Boolean).length === OTP_LENGTH) void submitOTP(next.join(''));
  }

  async function handleResend() {
    if (!userId || resendCooldown > 0) return;
    try {
      await authApi.resendOTP(userId);
      toast.info('New code sent', 'Check your inbox.');
      setResendCooldown(60);
      setDigits(Array(OTP_LENGTH).fill(''));
      refs.current[0]?.focus();
    } catch {
      toast.error('Could not resend', 'Too many attempts — wait and try again.');
    }
  }

  return (
    <AuthLayout title="Verify your email" subtitle="Enter the 6-digit code we sent to your inbox">
      <div className="flex flex-col items-center gap-6">
        {/* Mail icon with animation */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 text-primary"
          style={{ animation: 'bounce-soft 2s 0.5s ease-in-out infinite' }}
        >
          <MailIcon size={28} />
        </div>

        {/* OTP inputs */}
        <div
          onPaste={handlePaste}
          className={clsx(
            'flex gap-2 transition-transform',
            shake && 'animate-[shake_0.5s_ease-in-out]',
          )}
        >
          {/* Shake keyframe */}
          <style>{`
            @keyframes shake {
              0%,100% { transform: translateX(0); }
              20%      { transform: translateX(-8px); }
              40%      { transform: translateX(8px); }
              60%      { transform: translateX(-5px); }
              80%      { transform: translateX(5px); }
            }
          `}</style>

          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              autoFocus={i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={submitting}
              aria-label={`Digit ${i + 1}`}
              style={{ animationDelay: `${i * 60}ms` }}
              className={clsx(
                'h-14 w-12 rounded-xl text-center text-xl font-bold text-neutral-900',
                'border-2 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary/25',
                'disabled:opacity-50',
                'animate-[fade-up_0.3s_cubic-bezier(0,0,0.2,1)_both]',
                digit
                  ? 'border-primary bg-primary/5 text-primary shadow-sm'
                  : 'border-neutral-200 bg-white focus:border-primary',
              )}
            />
          ))}
        </div>

        <Button
          fullWidth
          size="lg"
          loading={submitting}
          onClick={() => { const otp = digits.join(''); if (otp.length === OTP_LENGTH) void submitOTP(otp); }}
        >
          Verify email
        </Button>

        <p className="text-sm text-neutral-500">
          Didn&apos;t get the code?{' '}
          {resendCooldown > 0 ? (
            <span className="font-medium text-neutral-400 tabular-nums">
              Resend in {resendCooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="font-medium text-primary underline-offset-2 hover:underline transition-colors"
            >
              Resend code
            </button>
          )}
        </p>
      </div>
    </AuthLayout>
  );
}
