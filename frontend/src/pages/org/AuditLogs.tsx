import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  ipAddress?: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const SeverityBadge = ({ severity }: { severity: string }) => {
  const cls: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[severity] || cls.info}`}>
      {severity}
    </span>
  );
};

const ACTION_LABELS: Record<string, string> = {
  CONSENT_APPROVED: 'Consent Approved',
  CONSENT_REJECTED: 'Consent Rejected',
  CONSENT_WITHDRAWN: 'Consent Withdrawn',
  CONSENT_REQUEST_CREATED: 'Request Created',
  CONSENT_REQUEST_UPDATED: 'Request Updated',
  ADMIN_LOGIN: 'Admin Login',
  ADMIN_LOGIN_FAILED: 'Login Failed',
  USER_LOGIN: 'User Login',
  OTP_REQUESTED: 'OTP Requested',
  OTP_VERIFY_FAILED: 'OTP Verify Failed',
  USER_LOGOUT: 'User Logout',
};

export default function AuditLogs() {
  const [severityFilter, setSeverityFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', severityFilter],
    queryFn: () =>
      api.get(`/analytics/audit-logs?limit=100${severityFilter ? `&severity=${severityFilter}` : ''}`).then((r) => r.data.data),
  });

  const logs: AuditLog[] = data?.logs || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-1">
            Immutable, timestamped record of all system events (PDPL Art. 20 / NCA ECC)
          </p>
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="input text-sm w-40"
        >
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12 text-gray-400 text-sm">No audit logs found</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {ACTION_LABELS[log.action] || log.action}
                      </p>
                      {log.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{log.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm text-gray-600">
                        {log.actorId ? `...${log.actorId.slice(-8)}` : 'System'}
                      </p>
                      {log.actorRole && (
                        <p className="text-xs text-gray-400 capitalize">{log.actorRole.replace('_', ' ')}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {log.resourceType && (
                        <span>{log.resourceType}: ...{log.resourceId?.slice(-8)}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <SeverityBadge severity={log.severity} />
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400 font-mono">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                  {expanded === log.id && (
                    <tr key={`${log.id}-detail`} className="bg-gray-50">
                      <td colSpan={6} className="px-6 py-3">
                        <pre className="text-xs text-gray-600 bg-white p-3 rounded border border-gray-200 overflow-auto">
                          {JSON.stringify({ id: log.id, metadata: log.metadata }, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
