import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangleIcon, CloseIcon } from '@/components/ui/Icons';

const FLAG = 'new_device_alert';

export function NewDeviceAlert() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(FLAG) === 'true') setVisible(true);
  }, []);

  const dismiss = () => { localStorage.removeItem(FLAG); setVisible(false); };

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
    >
      <AlertTriangleIcon size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">New device login detected</p>
        <p className="mt-0.5 text-sm text-amber-700">
          We noticed a login from a new device. If this wasn&apos;t you,{' '}
          <Link to="/account/security" className="font-semibold underline">
            review your security settings
          </Link>
          .
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss new device alert"
        className="shrink-0 rounded-lg p-1 text-amber-500 hover:bg-amber-100 transition-colors"
      >
        <CloseIcon size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
