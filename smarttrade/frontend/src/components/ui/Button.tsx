import { forwardRef, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  fullWidth?: boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow-md hover:shadow-primary/25',
  secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
  danger:    'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md hover:shadow-red-400/25',
  ghost:     'text-primary hover:bg-primary/8',
  outline:   'border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8  px-3 text-sm  gap-1.5',
  md: 'h-10 px-4 text-sm  gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, fullWidth = false,
     leftIcon, rightIcon, disabled, children, className, onClick, ...props }, ref) => {
    const innerRef  = useRef<HTMLButtonElement>(null);
    const buttonRef = (ref as React.RefObject<HTMLButtonElement>) ?? innerRef;

    const isDisabled = disabled || loading;

    // Ripple effect
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        const btn = buttonRef.current;
        if (!btn || isDisabled) return;

        const rect   = btn.getBoundingClientRect();
        const x      = e.clientX - rect.left;
        const y      = e.clientY - rect.top;
        const ripple = document.createElement('span');

        ripple.style.cssText = `
          position:absolute;left:${x}px;top:${y}px;
          width:0;height:0;border-radius:50%;
          background:rgba(255,255,255,0.35);
          transform:translate(-50%,-50%);
          pointer-events:none;
          animation:ripple 500ms ease-out forwards;
        `;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 520);
        onClick?.(e);
      },
      [isDisabled, onClick, buttonRef],
    );

    return (
      <>
        {/* Ripple keyframe — injected once */}
        <style>{`
          @keyframes ripple {
            to { width: 300px; height: 300px; opacity: 0; }
          }
        `}</style>
        <button
          ref={buttonRef}
          disabled={isDisabled}
          onClick={handleClick}
          className={clsx(
            'relative inline-flex items-center justify-center overflow-hidden rounded-brand font-medium',
            'transition-all duration-200 focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
            variantClasses[variant],
            sizeClasses[size],
            fullWidth && 'w-full',
            className,
          )}
          {...props}
        >
          {loading ? <Spinner size="sm" /> : leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </button>
      </>
    );
  },
);

Button.displayName = 'Button';
