import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const KEY = 'cookie_consent';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  const accept = () => { localStorage.setItem(KEY, 'accepted');  setVisible(false); };
  const reject = () => { localStorage.setItem(KEY, 'rejected');  setVisible(false); };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-100 bg-white/95 px-4 py-4 shadow-2xl backdrop-blur-sm sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">
          We use cookies to improve your experience.{' '}
          <Link to="/privacy" className="font-medium text-primary hover:underline">
            View our Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={reject}>
            Reject non-essential
          </Button>
          <Button size="sm" onClick={accept}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
