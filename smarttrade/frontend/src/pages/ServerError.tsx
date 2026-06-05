import { Button } from '@/components/ui/Button';
import { RefreshCwIcon, MailIcon } from '@/components/ui/Icons';
import { FadeIn } from '@/components/ui/Motion';

export default function ServerError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <FadeIn className="flex flex-col items-center">
        {/* Illustration */}
        <div className="relative mb-8">
          <div
            className="flex h-28 w-28 items-center justify-center rounded-3xl bg-red-50"
            style={{ animation: 'scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
            aria-hidden="true"
          >
            <span className="text-6xl font-black text-red-200 select-none">5<span className="text-red-400">0</span>0</span>
          </div>
          <div
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-400"
            style={{ animation: 'pulse-soft 2s ease-in-out infinite' }}
            aria-hidden="true"
          />
        </div>

        <h1 className="text-2xl font-bold text-neutral-900">Something went wrong</h1>
        <p className="mt-3 max-w-sm text-neutral-500">
          Our servers ran into an unexpected problem. The team has been notified.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            leftIcon={<RefreshCwIcon size={16} aria-hidden="true" />}
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
          <a href="mailto:support@smarttrade.africa">
            <Button variant="outline" leftIcon={<MailIcon size={16} aria-hidden="true" />}>
              Contact support
            </Button>
          </a>
        </div>
      </FadeIn>
    </div>
  );
}
