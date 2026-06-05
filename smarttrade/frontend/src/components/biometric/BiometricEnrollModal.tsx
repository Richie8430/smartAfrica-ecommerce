import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { clsx } from 'clsx';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { Button } from '@/components/ui/Button';
import { FingerprintIcon, CheckCircleIcon, ShieldCheckIcon } from '@/components/ui/Icons';
import { toast } from '@/components/ui/Toast';

const DISMISS_KEY = 'biometric_prompt_dismissed';

interface BiometricEnrollModalProps {
  open:        boolean;
  onClose:     () => void;
  onEnrolled?: () => void;
}

export function BiometricEnrollModal({ open, onClose, onEnrolled }: BiometricEnrollModalProps) {
  const { enrollBiometric, loading, isSupported } = useWebAuthn();
  const [enrolled, setEnrolled] = useState(false);

  if (!isSupported) return null;

  async function handleEnroll() {
    const result = await enrollBiometric();
    if (result.success) {
      setEnrolled(true);
      onEnrolled?.();
      toast.success('Biometric login enabled!', 'Sign in instantly next time.');
      setTimeout(onClose, 2000);
    } else {
      toast.error('Enrollment failed', result.error);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, 'true');
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm
                     data-[state=open]:animate-[fade-in_0.2s_ease-out_both]
                     data-[state=closed]:animate-[fade-in_0.15s_reverse_ease-in_both]"
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2
                     rounded-2xl bg-white p-8 shadow-2xl
                     data-[state=open]:animate-[scale-in_0.3s_cubic-bezier(0.34,1.56,0.64,1)_both]
                     data-[state=closed]:animate-[scale-in_0.2s_reverse_ease-in_both]"
        >
          {enrolled ? (
            /* ── Success state ─────────────────────────────────────────── */
            <div
              className="flex flex-col items-center gap-5 py-4 text-center"
              style={{ animation: 'scale-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircleIcon size={40} className="text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900">All set!</p>
                <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
                  Fingerprint login is enabled. Sign in instantly on your next visit.
                </p>
              </div>
            </div>
          ) : (
            /* ── Enroll prompt ─────────────────────────────────────────── */
            <>
              {/* Animated icon */}
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                    <FingerprintIcon size={40} />
                  </div>
                  {/* Pulse rings */}
                  <span className="absolute inset-0 -z-10 animate-[pulse-soft_2s_ease-in-out_infinite] rounded-2xl bg-primary/10" />
                  <span className="absolute inset-0 -z-10 animate-[pulse-soft_2s_0.5s_ease-in-out_infinite] rounded-2xl bg-primary/6 scale-110" />
                </div>

                <Dialog.Title className="text-xl font-extrabold text-neutral-900">
                  Enable fingerprint login
                </Dialog.Title>
                <Dialog.Description className="text-sm leading-relaxed text-neutral-500">
                  Skip passwords on every visit. Your biometric data stays on your device — we never store it.
                </Dialog.Description>
              </div>

              {/* Trust badges */}
              <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                {[
                  { icon: <ShieldCheckIcon size={18} />, label: 'On-device only' },
                  { icon: <CheckCircleIcon size={18} />, label: 'No storage'      },
                  { icon: <FingerprintIcon size={18} />, label: 'Instant login'   },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className={clsx(
                      'flex flex-col items-center gap-1 rounded-xl bg-neutral-50 px-2 py-3 text-xs',
                      'font-medium text-neutral-600',
                    )}
                  >
                    <span className="text-primary">{icon}</span>
                    {label}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <Button fullWidth loading={loading} onClick={handleEnroll} size="lg">
                  Enable fingerprint login
                </Button>
                <Button variant="ghost" fullWidth onClick={handleDismiss} className="text-neutral-500">
                  Maybe later
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
