import { LockIcon, ShieldCheckIcon, FingerprintIcon, CreditCardIcon } from '@/components/ui/Icons';

const BADGES = [
  { icon: <LockIcon size={18} />,         label: 'SSL Secured',       sub: 'TLS 1.3 encrypted',  color: 'text-green-600'  },
  { icon: <ShieldCheckIcon size={18} />,  label: '256-bit Encrypted', sub: 'Bank-grade security', color: 'text-primary'   },
  { icon: <FingerprintIcon size={18} />,  label: 'Biometric Auth',    sub: 'Passkey support',    color: 'text-primary'   },
  { icon: <CreditCardIcon size={18} />,   label: 'Secure Payments',   sub: 'Powered by Flutterwave', color: 'text-primary' },
];

export function TrustBadgeStrip({ className }: { className?: string }) {
  return (
    <div
      role="list"
      aria-label="Security trust badges"
      className={`flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-neutral-100 bg-white p-5 ${className ?? ''}`}
    >
      {BADGES.map(({ icon, label, sub, color }) => (
        <div key={label} role="listitem" className="flex items-center gap-2.5">
          <span className={color} aria-hidden="true">{icon}</span>
          <div>
            <p className="text-sm font-semibold text-neutral-800">{label}</p>
            <p className="text-xs text-neutral-400">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
