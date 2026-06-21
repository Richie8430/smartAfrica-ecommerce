import { useMemo } from 'react';
import { clsx } from 'clsx';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

interface AvatarProps {
  src?:      string | null;
  /** Unique, stable identifier (e.g. userId or email) used to generate a per-user placeholder avatar. */
  seed?:     string;
  name?:     string;
  size?:     'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base' };

export function Avatar({ src, seed, name, size = 'md', className }: AvatarProps) {
  const placeholder = useMemo(
    () => createAvatar(avataaars, { seed: seed ?? name ?? 'guest' }).toDataUri(),
    [seed, name],
  );

  return (
    <img
      src={src ?? placeholder}
      alt={name ?? 'avatar'}
      className={clsx('rounded-full object-cover ring-2 ring-white', sizeMap[size], className)}
    />
  );
}
