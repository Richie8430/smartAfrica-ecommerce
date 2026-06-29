import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user:                    User | null;
  accessToken:             string | null;
  isAuthenticated:         boolean;
  // GuestRoute redirects away from /login the instant isAuthenticated flips true,
  // unmounting Login.tsx before it can show the post-login enroll modal — so the
  // decision to prompt is carried across the redirect via this flag instead.
  pendingBiometricPrompt:  boolean;
}

interface AuthActions {
  setAuth:                    (user: User, token: string) => void;
  clearAuth:                  () => void;
  updateUser:                 (partial: Partial<User>) => void;
  setPendingBiometricPrompt:  (pending: boolean) => void;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    return (payload.exp as number) * 1000 < Date.now();
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user:                   null,
      accessToken:            null,
      isAuthenticated:        false,
      pendingBiometricPrompt: false,

      setAuth: (user, token) =>
        set({ user, accessToken: token, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, pendingBiometricPrompt: false }),

      updateUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },

      setPendingBiometricPrompt: (pending) => set({ pendingBiometricPrompt: pending }),
    }),
    {
      name: 'smarttrade_auth',
      // On rehydration from localStorage, clear expired tokens
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && isTokenExpired(state.accessToken)) {
          state.clearAuth();
        }
      },
    },
  ),
);
