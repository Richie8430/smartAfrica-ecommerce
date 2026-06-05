import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { AlertCircleIcon } from '@/components/ui/Icons';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:      string;
  error?:      string;
  helperText?: string;
  leftAddon?:  React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftAddon, rightAddon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-neutral-700 transition-colors"
          >
            {label}
            {props.required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}

        <div className="group relative flex items-center">
          {leftAddon && (
            <span className="pointer-events-none absolute left-3 text-neutral-400 transition-colors group-focus-within:text-primary">
              {leftAddon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-brand border bg-white text-sm text-neutral-900',
              'placeholder:text-neutral-400',
              'h-10 px-3 py-2',
              // Animated focus ring
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                : 'border-neutral-200 hover:border-neutral-300 focus:border-primary focus:ring-primary/20',
              leftAddon  && 'pl-9',
              rightAddon && 'pr-10',
              className,
            )}
            {...props}
          />

          {rightAddon && (
            <span className="absolute right-3 flex items-center">
              {rightAddon}
            </span>
          )}
        </div>

        {/* Animated error message */}
        {error && (
          <p
            className="flex items-center gap-1 text-xs text-red-600"
            style={{ animation: 'fade-up 0.2s cubic-bezier(0,0,0.2,1) both' }}
          >
            <AlertCircleIcon size={13} className="shrink-0" />
            {error}
          </p>
        )}

        {!error && helperText && (
          <p className="text-xs text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
