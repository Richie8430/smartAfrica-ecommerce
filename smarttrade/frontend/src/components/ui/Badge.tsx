import { clsx } from 'clsx';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?:  Variant;
  children:  React.ReactNode;
  className?: string;
}

const variants: Record<Variant, string> = {
  success: 'bg-green-100  text-green-800',
  warning: 'bg-amber-100  text-amber-800',
  danger:  'bg-red-100    text-red-700',
  info:    'bg-blue-100   text-blue-800',
  neutral: 'bg-neutral-100 text-neutral-700',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
