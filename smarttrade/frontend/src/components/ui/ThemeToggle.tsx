import { clsx } from 'clsx';
import { useThemeStore } from '@/stores/theme.store';

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface ThemeToggleProps {
  className?: string;
  /**
   * 'default' — for light page chrome (Navbar, account sidebar).
   * 'inverted' — for surfaces that are always dark regardless of site theme
   * (e.g. the admin sidebar, which is bg-primary navy in both themes).
   */
  tone?: 'default' | 'inverted';
}

const toneClasses: Record<'default' | 'inverted', string> = {
  default:  'text-neutral-600 hover:bg-neutral-100 hover:text-primary',
  inverted: 'text-white/70 hover:bg-white/10 hover:text-white',
};

/**
 * Two-state light/dark toggle (not a 3-way system/light/dark switch) — simpler
 * for users, and "system" remains the default until they explicitly choose.
 */
export function ThemeToggle({ className, tone = 'default' }: ThemeToggleProps) {
  const theme    = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const isDark = theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className={clsx(
        'flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200',
        toneClasses[tone],
        className,
      )}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
