import { ShieldCheckIcon } from '@/components/ui/Icons';

export function SecurePaymentFooter() {
  return (
    <div
      role="contentinfo"
      aria-label="Payment security information"
      className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400"
    >
      <span className="flex items-center gap-1">
        <ShieldCheckIcon size={13} className="text-green-500" aria-hidden="true" />
        256-bit SSL
      </span>
      <span aria-hidden="true">·</span>
      <span className="font-semibold text-neutral-500">Powered by Flutterwave</span>
      <span aria-hidden="true">·</span>
      <span className="flex items-center gap-1 font-semibold">
        <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">VISA</span>
        <span className="rounded bg-red-500 px-1 py-0.5 text-[10px] font-bold text-white">MC</span>
      </span>
      <span aria-hidden="true">·</span>
      <span>PCI DSS compliant</span>
    </div>
  );
}
