import * as RadixToast from '@radix-ui/react-toast';
import { clsx } from 'clsx';
import { create } from 'zustand';
import { CheckCircleIcon, XCircleIcon, InfoIcon, AlertCircleIcon, CloseIcon } from '@/components/ui/Icons';

// ─── Store ────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id:          string;
  title:       string;
  description?: string;
  variant:     ToastVariant;
}

interface ToastStore {
  toasts: ToastItem[];
  add:    (item: Omit<ToastItem, 'id'>) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add:    (item) =>
    set((s) => ({ toasts: [...s.toasts, { ...item, id: crypto.randomUUID() }] })),
  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().add({ title, description, variant: 'success' }),
  error:   (title: string, description?: string) =>
    useToastStore.getState().add({ title, description, variant: 'error' }),
  info:    (title: string, description?: string) =>
    useToastStore.getState().add({ title, description, variant: 'info' }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().add({ title, description, variant: 'warning' }),
};

// ─── Icons & styles ───────────────────────────────────────────────────────────

const config: Record<ToastVariant, { icon: React.ReactNode; bar: string; bg: string }> = {
  success: { icon: <CheckCircleIcon  size={18} className="text-green-500" />, bar: 'bg-green-500', bg: 'hover:bg-green-50/50' },
  error:   { icon: <XCircleIcon      size={18} className="text-red-500"   />, bar: 'bg-red-500',   bg: 'hover:bg-red-50/50'   },
  info:    { icon: <InfoIcon         size={18} className="text-blue-500"  />, bar: 'bg-blue-500',  bg: 'hover:bg-blue-50/50'  },
  warning: { icon: <AlertCircleIcon  size={18} className="text-amber-500" />, bar: 'bg-amber-500', bg: 'hover:bg-amber-50/50' },
};

// ─── Toaster ──────────────────────────────────────────────────────────────────

export function Toaster() {
  const { toasts, remove } = useToastStore();

  return (
    <RadixToast.Provider swipeDirection="right">
      {toasts.map((t) => {
        const { icon, bar, bg } = config[t.variant];
        return (
          <RadixToast.Root
            key={t.id}
            duration={4500}
            onOpenChange={(open) => { if (!open) remove(t.id); }}
            className={clsx(
              'relative flex w-full max-w-sm items-start gap-3 overflow-hidden',
              'rounded-xl border border-neutral-100 bg-white px-4 py-3.5 shadow-lg',
              'transition-all duration-200',
              bg,
              // Radix state-driven animations
              'data-[state=open]:animate-[slide-in-right_0.35s_cubic-bezier(0,0,0.2,1)_both]',
              'data-[state=closed]:animate-[fade-in_0.2s_reverse_ease-in_both]',
              'data-[swipe=move]:translate-x-[--radix-toast-swipe-move-x]',
              'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
              'data-[swipe=end]:animate-[slide-in-right_0.2s_reverse_ease-in_both]',
            )}
          >
            {/* Accent bar */}
            <span className={clsx('absolute left-0 top-0 h-full w-1 rounded-l-xl', bar)} />

            <span className="mt-0.5 ml-2 shrink-0">{icon}</span>

            <div className="min-w-0 flex-1">
              <RadixToast.Title className="text-sm font-semibold text-neutral-900">
                {t.title}
              </RadixToast.Title>
              {t.description && (
                <RadixToast.Description className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                  {t.description}
                </RadixToast.Description>
              )}
            </div>

            <RadixToast.Close
              className="shrink-0 text-neutral-300 transition-colors hover:text-neutral-600"
              aria-label="Close"
            >
              <CloseIcon size={14} />
            </RadixToast.Close>
          </RadixToast.Root>
        );
      })}

      <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2" />
    </RadixToast.Provider>
  );
}
