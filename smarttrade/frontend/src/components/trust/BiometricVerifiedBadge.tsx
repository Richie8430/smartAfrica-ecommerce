import { FingerprintIcon } from '@/components/ui/Icons';

export function BiometricVerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Biometric verification active"
      className={`inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ${className ?? ''}`}
    >
      <FingerprintIcon size={13} aria-hidden="true" />
      Biometric Verified
    </span>
  );
}
