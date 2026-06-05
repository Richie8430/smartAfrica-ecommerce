import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { FadeIn } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import { SearchIcon, ExternalLinkIcon } from '@/components/ui/Icons';

type AuditAction = string;

interface AuditLog {
  log_id:     string;
  user_id:    string | null;
  action:     AuditAction;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?:      { email: string } | null;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS:     'bg-green-50 text-green-700',
  LOGIN_FAIL:        'bg-red-50 text-red-600',
  LOGOUT:            'bg-neutral-100 text-neutral-500',
  LOGOUT_ALL:        'bg-neutral-100 text-neutral-500',
  PASSWORD_CHANGED:  'bg-blue-50 text-blue-700',
  PASSWORD_RESET:    'bg-blue-50 text-blue-700',
  ACCOUNT_DELETED:   'bg-red-50 text-red-700',
  ACCOUNT_LOCKED:    'bg-orange-50 text-orange-700',
  PRODUCT_CREATED:   'bg-primary/10 text-primary',
  PRODUCT_UPDATED:   'bg-primary/10 text-primary',
  PRODUCT_DELETED:   'bg-red-50 text-red-600',
  ORDER_CREATED:     'bg-purple-50 text-purple-700',
  PAYMENT_RECEIVED:  'bg-green-50 text-green-700',
  PAYMENT_FAILED:    'bg-red-50 text-red-600',
  BIOMETRIC_ENROLLED:'bg-primary/10 text-primary',
  BIOMETRIC_LOGIN:   'bg-primary/10 text-primary',
  BIOMETRIC_REVOKED: 'bg-amber-50 text-amber-700',
};

const ACTIONS = [
  'LOGIN_SUCCESS','LOGIN_FAIL','LOGOUT','LOGOUT_ALL','PASSWORD_CHANGED','PASSWORD_RESET',
  'ACCOUNT_DELETED','ACCOUNT_LOCKED','PRODUCT_CREATED','PRODUCT_UPDATED','PRODUCT_DELETED',
  'ORDER_CREATED','PAYMENT_RECEIVED','PAYMENT_FAILED','BIOMETRIC_ENROLLED','BIOMETRIC_LOGIN','BIOMETRIC_REVOKED',
] as const;

export default function AdminAuditLogs() {
  const [page,   setPage]   = useState(1);
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');

  const params = new URLSearchParams({
    page:  String(page),
    limit: '30',
    ...(userId ? { user_id: userId } : {}),
    ...(action ? { action }          : {}),
    ...(from   ? { from }            : {}),
    ...(to     ? { to }              : {}),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, userId, action, from, to],
    queryFn:  () =>
      apiClient.get<{ success: boolean; data: AuditLog[]; total: number; page: number; totalPages: number; limit: number }>(
        `/admin/audit-logs?${params}`,
      ).then((r) => r.data),
  });

  const logs       = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const exportCSV = () => {
    const exportParams = new URLSearchParams({
      ...(userId ? { user_id: userId } : {}),
      ...(action ? { action }          : {}),
      ...(from   ? { from }            : {}),
      ...(to     ? { to }              : {}),
    });
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';
    window.open(`${base}/admin/audit-logs/export?${exportParams}`, '_blank');
  };

  return (
    <div className="px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-neutral-900">Audit Logs</h1>
        <Button
          size="sm"
          variant="outline"
          rightIcon={<ExternalLinkIcon size={14} aria-hidden="true" />}
          onClick={exportCSV}
          aria-label="Export audit logs as CSV file"
        >
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} aria-hidden="true" />
          <input
            type="text"
            placeholder="Filter by user ID…"
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            className="h-9 rounded-brand border border-neutral-200 bg-white pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Filter by user ID"
          />
        </div>

        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="h-9 rounded-brand border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-primary focus:outline-none"
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="h-9 rounded-brand border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none"
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="h-9 rounded-brand border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none"
          aria-label="To date"
        />
        {(userId || action || from || to) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setUserId(''); setAction(''); setFrom(''); setTo(''); setPage(1); }}
            aria-label="Clear all filters"
          >
            Clear filters
          </Button>
        )}
      </div>

      <FadeIn>
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Audit log entries">
              <thead className="border-b border-neutral-100 bg-neutral-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Action</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">User</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">IP</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">Device</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading && Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded-lg" /></td>
                    ))}
                  </tr>
                ))}
                {!isLoading && logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-400">No logs found for the selected filters.</td>
                  </tr>
                )}
                {!isLoading && logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_COLORS[log.action] ?? 'bg-neutral-100 text-neutral-500'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-neutral-600">
                      {log.user?.email ?? (log.user_id ? log.user_id.slice(0, 8) : 'anonymous')}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-neutral-500">
                      {log.ip_address ?? '—'}
                    </td>
                    <td
                      className="px-4 py-2.5 text-xs text-neutral-500 max-w-[200px] truncate"
                      title={log.user_agent ?? undefined}
                    >
                      {log.user_agent ? log.user_agent.slice(0, 35) + (log.user_agent.length > 35 ? '…' : '') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-neutral-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-neutral-100 p-3" aria-label="Pagination">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">Prev</Button>
              <span className="text-sm text-neutral-500" aria-live="polite">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">Next</Button>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
