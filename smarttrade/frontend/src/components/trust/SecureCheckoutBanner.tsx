import { LockIcon } from '@/components/ui/Icons';

export function SecureCheckoutBanner() {
  return (
    <div
      role="note"
      aria-label="Secure connection notice"
      className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-700"
    >
      <LockIcon size={15} className="shrink-0 text-blue-600" aria-hidden="true" />
      <span>Your connection is secured with <strong>TLS 1.3</strong> — all data is encrypted end-to-end.</span>
    </div>
  );
}
