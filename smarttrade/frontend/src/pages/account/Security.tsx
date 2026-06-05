import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '@/api/account.api';
import { webauthnApi } from '@/api/webauthn.api';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { FadeIn } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import { BiometricEnrollModal } from '@/components/biometric/BiometricEnrollModal';
import { toast } from '@/components/ui/Toast';
import {
  ShieldCheckIcon, FingerprintIcon, LockIcon, LogOutIcon,
  CheckCircleIcon, XCircleIcon, AlertTriangleIcon,
} from '@/components/ui/Icons';
import { useNavigate } from 'react-router-dom';

function formatRelative(iso: string) {
  const ms  = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60)  return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60)  return `${min}m ago`;
  const hr  = Math.floor(min / 60);
  if (hr  < 24)  return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

const ACTION_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  LOGIN_SUCCESS:    { label: 'Signed in',       color: 'bg-green-50 text-green-700',  icon: <CheckCircleIcon size={13} /> },
  LOGIN_FAIL:       { label: 'Failed login',     color: 'bg-red-50 text-red-600',      icon: <XCircleIcon size={13} /> },
  LOGOUT:           { label: 'Signed out',       color: 'bg-neutral-100 text-neutral-500', icon: <LogOutIcon size={13} /> },
  LOGOUT_ALL:       { label: 'All sessions ended', color: 'bg-neutral-100 text-neutral-500', icon: <LogOutIcon size={13} /> },
  PASSWORD_CHANGED: { label: 'Password changed', color: 'bg-blue-50 text-blue-700',   icon: <LockIcon size={13} /> },
  BIOMETRIC_LOGIN:  { label: 'Biometric sign-in',color: 'bg-primary/10 text-primary', icon: <FingerprintIcon size={13} /> },
  BIOMETRIC_ENROLLED:{ label: 'Biometric enrolled', color: 'bg-primary/10 text-primary', icon: <FingerprintIcon size={13} /> },
  BIOMETRIC_REVOKED:{ label: 'Biometric revoked', color: 'bg-amber-50 text-amber-700', icon: <AlertTriangleIcon size={13} /> },
};

export default function Security() {
  const qc          = useQueryClient();
  const user        = useAuthStore((s) => s.user);
  const updateUser  = useAuthStore((s) => s.updateUser);
  const clearAuth   = useAuthStore((s) => s.clearAuth);
  const clearCart   = useCartStore((s) => s.clearCart);
  const navigate    = useNavigate();
  const { isSupported } = useWebAuthn();
  const [bioOpen, setBioOpen] = useState(false);

  // Login history
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn:  () => accountApi.getAuditLog().then((r) => r.data),
  });

  const loginEvents = (auditData?.data ?? []).filter((e) =>
    ['LOGIN_SUCCESS','LOGIN_FAIL','LOGOUT','LOGOUT_ALL','PASSWORD_CHANGED','BIOMETRIC_LOGIN','BIOMETRIC_ENROLLED','BIOMETRIC_REVOKED'].includes(e.action),
  ).slice(0, 20);

  // Trusted devices (WebAuthn credentials)
  const { data: credsData, isLoading: credsLoading } = useQuery({
    queryKey: ['webauthn-credentials'],
    queryFn:  () => webauthnApi.listCredentials().then((r) => r.data),
  });

  const credentials = credsData?.data ?? [];

  const revokeMutation = useMutation({
    mutationFn: (id: string) => webauthnApi.revokeCredential(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['webauthn-credentials'] });
      toast.success('Device revoked', 'The device can no longer use biometric login.');
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => accountApi.logoutAll(),
    onSuccess:  () => { clearAuth(); clearCart(); navigate('/login'); },
  });

  return (
    <FadeIn>
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheckIcon className="text-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold text-neutral-900">Security</h2>
      </div>

      <div className="space-y-8">
        {/* Biometric / trusted devices */}
        <section aria-labelledby="devices-heading">
          <div className="mb-3 flex items-center gap-2">
            <FingerprintIcon size={16} className="text-neutral-500" aria-hidden="true" />
            <h3 id="devices-heading" className="font-semibold text-neutral-800">Trusted devices</h3>
          </div>

          {isSupported && (
            <Button
              size="sm"
              variant={user?.biometric_enrolled ? 'outline' : 'primary'}
              onClick={() => setBioOpen(true)}
              leftIcon={<FingerprintIcon size={15} aria-hidden="true" />}
              aria-label="Enroll a new biometric device"
              className="mb-4"
            >
              Enroll new device
            </Button>
          )}

          {credsLoading ? (
            <div className="space-y-2" role="status" aria-label="Loading trusted devices">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
            </div>
          ) : credentials.length === 0 ? (
            <p className="text-sm text-neutral-400">No enrolled devices.</p>
          ) : (
            <ul className="space-y-2" role="list" aria-label="Enrolled biometric devices">
              {credentials.map((cred) => (
                <li
                  key={cred.credential_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <FingerprintIcon size={18} className="text-primary shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {cred.device_type ?? 'Unknown device'}
                      </p>
                      <p className="text-xs text-neutral-400">
                        Enrolled {new Date(cred.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    loading={revokeMutation.isPending}
                    onClick={() => {
                      if (confirm('Revoke this device? It will no longer be able to use biometric login.')) {
                        revokeMutation.mutate(cred.credential_id);
                      }
                    }}
                    aria-label={`Revoke device ${cred.device_type ?? 'Unknown device'}`}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Active sessions */}
        <section aria-labelledby="sessions-heading" className="border-t border-neutral-100 pt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <LockIcon size={16} className="text-neutral-500" aria-hidden="true" />
              <h3 id="sessions-heading" className="font-semibold text-neutral-800">Active sessions</h3>
            </div>
            <Button
              size="sm"
              variant="danger"
              loading={logoutAllMutation.isPending}
              onClick={() => {
                if (confirm('Sign out of ALL devices? You will need to log in again.')) {
                  logoutAllMutation.mutate();
                }
              }}
              leftIcon={<LogOutIcon size={14} aria-hidden="true" />}
              aria-label="Sign out of all devices including this one"
            >
              Sign out all devices
            </Button>
          </div>
          <p className="text-sm text-neutral-500">
            This will revoke all active sessions and sign you out everywhere, including this device.
          </p>
        </section>

        {/* Login history */}
        <section aria-labelledby="history-heading" className="border-t border-neutral-100 pt-6">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheckIcon size={16} className="text-neutral-500" aria-hidden="true" />
            <h3 id="history-heading" className="font-semibold text-neutral-800">Login history</h3>
            <span className="text-xs text-neutral-400">(last 30 days)</span>
          </div>

          {auditLoading ? (
            <div className="space-y-2" role="status" aria-label="Loading login history">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
            </div>
          ) : loginEvents.length === 0 ? (
            <p className="text-sm text-neutral-400">No recent activity.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Login history">
                <thead>
                  <tr className="border-b border-neutral-100 text-left">
                    <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 pr-4">Event</th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 pr-4">IP</th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 pr-4">Device</th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {loginEvents.map((e) => {
                    const meta = ACTION_MAP[e.action] ?? { label: e.action, color: 'bg-neutral-100 text-neutral-500', icon: null };
                    return (
                      <tr key={e.log_id} className="hover:bg-neutral-50">
                        <td className="py-2.5 pr-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.color}`}>
                            <span aria-hidden="true">{meta.icon}</span>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-neutral-500">
                          {e.ip_address ?? '—'}
                        </td>
                        <td
                          className="py-2.5 pr-4 text-xs text-neutral-500 max-w-[180px] truncate"
                          title={e.user_agent ?? undefined}
                        >
                          {e.user_agent
                            ? e.user_agent.slice(0, 40) + (e.user_agent.length > 40 ? '…' : '')
                            : '—'}
                        </td>
                        <td className="py-2.5 text-xs text-neutral-400 whitespace-nowrap">
                          {formatRelative(e.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <BiometricEnrollModal
        open={bioOpen}
        onClose={() => setBioOpen(false)}
        onEnrolled={() => {
          updateUser({ biometric_enrolled: true });
          setBioOpen(false);
          qc.invalidateQueries({ queryKey: ['webauthn-credentials'] });
        }}
      />
    </FadeIn>
  );
}
