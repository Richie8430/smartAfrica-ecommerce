import axios, { type AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/stores/auth.store';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Token refresh state ───────────────────────────────────────────────────────

let isRefreshing   = false;
let failedQueue:   Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token?: string) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token),
  );
  failedQueue = [];
}

// ─── Request interceptor — attach Bearer + CSRF ────────────────────────────────

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;

  const csrf = Cookies.get('csrf_token');
  if (csrf) config.headers['X-CSRF-Token'] = csrf;

  return config;
});

// ─── Response interceptor — transparent token rotation ────────────────────────

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Skip token refresh for auth endpoints — 401 there means wrong credentials,
    // not an expired token. Let the calling code handle it directly.
    const reqUrl = (original.url ?? '').replace(/^\//, '');
    const isAuthEndpoint = reqUrl.startsWith('auth/');

    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAuth(useAuthStore.getState().user!, newToken);
        processQueue(null, newToken);
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error as unknown);
  },
);
