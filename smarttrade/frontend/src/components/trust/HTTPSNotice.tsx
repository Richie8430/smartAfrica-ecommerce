import { LockIcon } from '@/components/ui/Icons';

export function HTTPSNotice({ domain = 'smarttrade.africa' }: { domain?: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs text-green-600">
      <LockIcon size={12} aria-hidden="true" />
      <span aria-label="Secure HTTPS connection">https://{domain}</span>
    </div>
  );
}
