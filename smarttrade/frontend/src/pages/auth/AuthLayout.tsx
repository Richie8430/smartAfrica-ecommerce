import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/ui/Icons';

interface AuthLayoutProps {
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 bg-neutral-50">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-primary-light/8 blur-3xl" />
      </div>

      <div
        className="relative w-full max-w-md"
        style={{ animation: 'fade-up 0.45s cubic-bezier(0,0,0.2,1) both' }}
      >
        {/* Brand header */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 group">
            <LogoMark size={36} className="text-primary transition-transform duration-300 group-hover:scale-110" />
            <span className="text-xl font-bold text-primary">
              SmartTrade<span className="text-primary-light"> Africa</span>
            </span>
          </Link>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-neutral-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p>}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm
                     transition-shadow duration-300 hover:shadow-md"
          style={{ animation: 'scale-in 0.4s 0.05s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
