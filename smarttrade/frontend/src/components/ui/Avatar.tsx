import { clsx } from 'clsx';

interface AvatarProps {
  src?:      string | null;
  name?:     string;
  size?:     'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base' };

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  return src ? (
    <img
      src={src}
      alt={name ?? 'avatar'}
      className={clsx('rounded-full object-cover ring-2 ring-white', sizeMap[size], className)}
    />
  ) : (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full bg-primary font-semibold text-white ring-2 ring-white',
        sizeMap[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
