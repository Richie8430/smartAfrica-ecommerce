/**
 * 2D brand-blue SVG icon set.
 * All icons use currentColor — set text-primary / text-primary-light etc. on the parent.
 */

import { clsx } from 'clsx';

type IconProps = { className?: string; size?: number };

const base = (size = 24) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

/* ── Navigation ─────────────────────────────────────────────────────────────── */

export const SearchIcon    = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

export const CartIcon = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

export const MenuIcon = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>
  </svg>
);

export const CloseIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

export const ChevronDownIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export const ChevronRightIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export const ArrowRightIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

/* ── Auth & Security ─────────────────────────────────────────────────────── */

export const EyeIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

export const EyeOffIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
  </svg>
);

export const FingerprintIcon = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
  </svg>
);

export const LockIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export const ShieldCheckIcon = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

export const MailIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

export const UserIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>
  </svg>
);

export const PhoneIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 9.81a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 14.92"/>
  </svg>
);

/* ── Commerce ────────────────────────────────────────────────────────────── */

export const PackageIcon = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>
  </svg>
);

export const TruckIcon = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
  </svg>
);

export const CreditCardIcon = ({ className, size = 22 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <rect width="22" height="16" x="1" y="4" rx="2" ry="2"/><line x1="1" x2="23" y1="10" y2="10"/>
  </svg>
);

export const TagIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>
  </svg>
);

export const StarIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

/* ── Status & Feedback ───────────────────────────────────────────────────── */

export const CheckCircleIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

export const AlertCircleIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

export const InfoIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
);

export const XCircleIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
  </svg>
);

export const TrashIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

export const EditIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export const PlusIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
  </svg>
);

export const MinusIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <line x1="5" x2="19" y1="12" y2="12"/>
  </svg>
);

/* ── Feature icons (decorative, slightly thicker stroke) ──────────────────── */

export const SpeedIcon = ({ className, size = 40 }: IconProps) => (
  <svg {...base(size)} strokeWidth={1.5} className={clsx('shrink-0', className)}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    <circle cx="12" cy="12" r="4"/>
  </svg>
);

export const DeliveryIcon = ({ className, size = 40 }: IconProps) => (
  <svg {...base(size)} strokeWidth={1.5} className={clsx('shrink-0', className)}>
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><path d="M9 17h6"/><path d="M13 5h8l2 10h-9.5"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
  </svg>
);

export const SecureIcon = ({ className, size = 40 }: IconProps) => (
  <svg {...base(size)} strokeWidth={1.5} className={clsx('shrink-0', className)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);

export const SupportIcon = ({ className, size = 40 }: IconProps) => (
  <svg {...base(size)} strokeWidth={1.5} className={clsx('shrink-0', className)}>
    <path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z"/>
  </svg>
);

/* ── Admin & misc ──────────────────────────────────────────────────────── */

export const FilterIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <line x1="4" x2="20" y1="6" y2="6"/><circle cx="7" cy="6" r="2.2" fill="currentColor" stroke="none"/>
    <line x1="4" x2="20" y1="12" y2="12"/><circle cx="17" cy="12" r="2.2" fill="currentColor" stroke="none"/>
    <line x1="4" x2="20" y1="18" y2="18"/><circle cx="10" cy="18" r="2.2" fill="currentColor" stroke="none"/>
  </svg>
);

export const GridIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);

export const ListIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/>
    <circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none"/>
    <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none"/>
    <circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

export const HomeIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

export const SettingsIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export const ChevronLeftIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="m15 18-6-6 6-6"/>
  </svg>
);

export const RefreshCwIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
  </svg>
);

export const BarChart2Icon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/>
    <line x1="6" x2="6" y1="20" y2="14"/>
  </svg>
);

export const UsersIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export const MapPinIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

export const LogOutIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/>
    <line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);

export const CheckIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export const ExternalLinkIcon = ({ className, size = 18 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>
  </svg>
);

export const ImageIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

export const AlertTriangleIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

export const KeyIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>
  </svg>
);

export const SlidersIcon = ({ className, size = 20 }: IconProps) => (
  <svg {...base(size)} className={clsx('shrink-0', className)}>
    <line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/>
    <line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/>
    <line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/>
    <line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/>
    <line x1="17" x2="23" y1="16" y2="16"/>
  </svg>
);

/* ── Logo mark ────────────────────────────────────────────────────────────── */

export function LogoMark({ className, size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={clsx('shrink-0', className)}>
      {/* Hexagon background */}
      <path d="M16 2 28 9v14L16 30 4 23V9z" fill="currentColor" opacity={0.15}/>
      {/* S-shaped trade path */}
      <path d="M11 12c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4s-1.8 4-4 4h-2c-2.2 0-4 1.8-4 4s1.8 4 4 4h2c2.2 0 4-1.8 4-4"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
