/**
 * Lightweight scroll-driven animation primitives.
 * Uses IntersectionObserver + CSS transitions — no extra dependencies.
 */

import { clsx } from 'clsx';
import { useInView } from '@/hooks/useInView';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface FadeInProps {
  children:   React.ReactNode;
  direction?: Direction;
  delay?:     number;
  duration?:  number;
  className?: string;
  threshold?: number;
  as?:        React.ElementType;
}

const dirMap: Record<Direction, string> = {
  up:    'translate-y-8',
  down:  '-translate-y-8',
  left:  'translate-x-8',
  right: '-translate-x-8',
  none:  '',
};

/** Fades + slides in when the element enters the viewport. */
export function FadeIn({
  children,
  direction = 'up',
  delay     = 0,
  duration  = 500,
  threshold = 0.12,
  className,
  as: Tag   = 'div',
}: FadeInProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold });

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      style={{
        transitionDuration:  `${duration}ms`,
        transitionDelay:     `${delay}ms`,
        transitionProperty:  'opacity, transform',
        transitionTimingFunction: 'cubic-bezier(0,0,0.2,1)',
      }}
      className={clsx(
        'will-change-transform',
        inView
          ? 'opacity-100 translate-x-0 translate-y-0'
          : `opacity-0 ${dirMap[direction]}`,
        className,
      )}
    >
      {children}
    </Tag>
  );
}

interface StaggerProps {
  children:   React.ReactNode[];
  staggerMs?: number;
  direction?: Direction;
  className?: string;
}

/** Renders children with staggered FadeIn delays. */
export function Stagger({
  children,
  staggerMs = 100,
  direction = 'up',
  className,
}: StaggerProps) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <FadeIn key={i} direction={direction} delay={i * staggerMs}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}

/** Scale + fade on scroll. */
export function ScaleIn({
  children,
  delay   = 0,
  className,
}: {
  children:   React.ReactNode;
  delay?:     number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.15 });

  return (
    <div
      ref={ref}
      style={{ transitionDuration: '400ms', transitionDelay: `${delay}ms`, transitionProperty: 'opacity, transform', transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)' }}
      className={clsx('will-change-transform', inView ? 'opacity-100 scale-100' : 'opacity-0 scale-90', className)}
    >
      {children}
    </div>
  );
}
