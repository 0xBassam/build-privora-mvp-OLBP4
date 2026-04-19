import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { format } from 'date-fns';

const KpiCard = ({
  label,
  value,
  sub,
  status,
  link,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  status?: 'ok' | 'warn' | 'critical' | 'neutral';
  link?: string;
  icon: string;
}) => {
  const statusColors = {
    ok: 'text-green-600',
    warn: 'text-orange-500',
    critical: 'text-red-600',
    neutral: 'text-gray-900',
  };

  const content = (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {status && status !== 'neutral' && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            status === 'ok' ? 'bg-green-100 text-green-700' :
            status === 'warn' ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}>
            {status === 'ok' ? '✓ Good' : status === 'warn' ? '⚠ Review' : '🚨 Action'}
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold ${statusColors[status || 'neutral']}`}>{value}</p>
      <p className="text-sm text-gray-600 mt-1 font-medium">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }
  return content;
};

export default function ComplianceDashboard() {
  const { data: analytics } = useQuery({
    queryKey: ['org-analytics'],
    queryFn: () => api.get('/analytics').then((r) => r.data.data),
  });

  const { data: dsarData } = useQuery({
    queryKey: ['admin-dsar-requests', '', ''],
    queryFn: () => api.get('/dsar/admin/requests?limit=50').then((r) => r.data.data),
  });

  const { data: breachData } = useQuery({
    queryKey: ['breach-incidents', '', ''],
    queryFn: () => api.get('/breaches?limit=50').then((r) => r.data.data),
  });

  const { data: dataSharingData } = useQuery({
    queryKey: ['org-data-sharing'],
    queryFn: () => api.get('/data-sharing/admin/requests?limit=50').then((r) => r.data.data),
  });

  // Compute KPIs
  const activeConsents = analytics?.summary?.activeRequests ?? 0;
  const approvalRate = analytics?.summary?.approvalRate ?? 0;

  const dsarRequests = dsarData?.requests || [];
  const openDsars = dsarRequests.filter((r: { status: string }) => r.status === 'pending' || r.status === 'in_progress').length;
  const overdueDsars = dsarRequests.filter((r: { isOverdue: boolean }) => r.isOverdue).length;

  const breachIncidents = breachData?.incidents || [];
  const openBreaches = breachIncidents.filter((b: { status: string }) => b.status !== 'resolved').length;
  const breachOverdue = breachIncidents.filter((b: { isAuthorityOverdue: boolean }) => b.isAuthorityOverdue).length;
  const criticalBreaches = breachIncidents.filter((b: { severity: string; status: string }) => b.severity === 'critical' && b.status !== 'resolved').length;

  const pendingDataShares = (dataSharingData?.requests || []).filter((r: { status: string }) => r.status === 'pending_org_review').length;

  // Overall compliance score
  const issues = overdueDsars + breachOverdue + criticalBreaches;
  const complianceStatus = issues === 0 ? 'ok' : issues <= 2 ? 'warn' : 'critical';
  const complianceLabel = issues === 0 ? 'Compliant' : issues <= 2 ? 'Needs Review' : 'Action Required';

  // Recent incidents for quick view
  const recentBreaches = breachIncidents.slice(0, 3);
  const urgentDsars = dsarRequests
    .filter((r: { status: string; isOverdue: boolean }) => r.status !== 'completed' && r.status !== 'rejected')
    .sort((a: { daysRemaining: number | null }, b: { daysRemaining: number | null }) => (a.daysRemaining ?? 99) - (b.daysRemaining ?? 99))
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor your organization's data governance and compliance status in real time.
          </p>
        </div>
        <div className={`px-4 py-2 rounded-xl font-semibold text-sm ${
          complianceStatus === 'ok' ? 'bg-green-100 text-green-700' :
          complianceStatus === 'warn' ? 'bg-orange-100 text-orange-700' :
          'bg-red-100 text-red-700'
        }`}>
          {complianceStatus === 'ok' ? '✓' : complianceStatus === 'warn' ? '⚠' : '🚨'} {complianceLabel}
        </div>
      </div>

      {/* PDPL Compliance Score */}
      {(() => {
        const total = 6;
        const passed =
          (activeConsents > 0 ? 1 : 0) +
          (overdueDsars === 0 ? 1 : 0) +
          (breachOverdue === 0 ? 1 : 0) +
          (criticalBreaches === 0 ? 1 : 0) +
          (openDsars === 0 ? 1 : 0) +
          (pendingDataShares === 0 ? 1 : 0);
        const score = Math.round((passed / total) * 100);
        const scoreColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-orange-500' : 'text-red-600';
        const barColor = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-orange-400' : 'bg-red-500';
        return (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">PDPL Compliance Score</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Based on system activity, SLA adherence, and policy coverage
                </p>
              </div>
              <p className={`text-4xl font-bold ${scoreColor}`}>{score}%</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className={`${barColor} h-3 rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{passed} of {total} compliance checkpoints met</p>
          </div>
        );
      })()}

      {/* Action Alerts */}
      {(overdueDsars > 0 || breachOverdue > 0 || criticalBreaches > 0) && (
        <div className="space-y-2">
          {breachOverdue > 0 && (
            <Link to="/dashboard/breaches" className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100 transition-colors">
              <span className="text-red-500 text-xl shrink-0">🚨</span>
              <div>
                <p className="text-sm font-bold text-red-800">
                  {breachOverdue} breach incident{breachOverdue > 1 ? 's' : ''} past 72-hour SDAIA notification deadline
                </p>
                <p className="text-xs text-red-600">PDPL Art. 19 — notify SDAIA immediately to avoid regulatory penalties</p>
              </div>
              <span className="ml-auto text-red-500">→</span>
            </Link>
          )}
          {criticalBreaches > 0 && (
            <Link to="/dashboard/breaches" className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4 hover:bg-orange-100 transition-colors">
              <span className="text-orange-500 text-xl shrink-0">⚠</span>
              <div>
                <p className="text-sm font-bold text-orange-800">{criticalBreaches} critical breach{criticalBreaches > 1 ? 'es' : ''} pending notification</p>
                <p className="text-xs text-orange-600">Requires immediate containment, remediation, and authority notification</p>
              </div>
              <span className="ml-auto text-orange-500">→</span>
            </Link>
          )}
          {overdueDsars > 0 && (
            <Link to="/dashboard/dsar" className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 hover:bg-yellow-100 transition-colors">
              <span className="text-yellow-600 text-xl shrink-0">⏰</span>
              <div>
                <p className="text-sm font-bold text-yellow-800">
                  {overdueDsars} DSAR request{overdueDsars > 1 ? 's' : ''} overdue — 30-day SLA exceeded
                </p>
                <p className="text-xs text-yellow-600">PDPL Art. 8 — data subjects must receive a response within 30 days</p>
              </div>
              <span className="ml-auto text-yellow-600">→</span>
            </Link>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Consent Management</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Active Consent Requests"
            value={activeConsents}
            sub={`${analytics?.summary?.totalRequests ?? 0} total`}
            status="neutral"
            link="/dashboard/consents"
            icon="📋"
          />
          <KpiCard
            label="Approval Rate"
            value={`${approvalRate}%`}
            sub="of responses"
            status={approvalRate >= 70 ? 'ok' : approvalRate >= 40 ? 'warn' : 'critical'}
            link="/dashboard/consents"
            icon="✅"
          />
          <KpiCard
            label="Total Responses"
            value={analytics?.summary?.totalResponses ?? 0}
            sub="consent decisions"
            status="neutral"
            link="/dashboard/consents"
            icon="👥"
          />
          <KpiCard
            label="Pending Data Shares"
            value={pendingDataShares}
            sub="awaiting org review"
            status={pendingDataShares === 0 ? 'ok' : 'warn'}
            link="/dashboard/data-sharing"
            icon="🔗"
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Data Subject Rights (PDPL Art. 8)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Open DSARs"
            value={openDsars}
            sub="pending + in progress"
            status={openDsars === 0 ? 'ok' : overdueDsars > 0 ? 'critical' : 'warn'}
            link="/dashboard/dsar"
            icon="🔏"
          />
          <KpiCard
            label="Overdue Requests"
            value={overdueDsars}
            sub="past 30-day SLA"
            status={overdueDsars === 0 ? 'ok' : 'critical'}
            link="/dashboard/dsar"
            icon="⏰"
          />
          <KpiCard
            label="Total DSARs"
            value={dsarRequests.length}
            sub="all time"
            status="neutral"
            link="/dashboard/dsar"
            icon="📁"
          />
          <KpiCard
            label="Completed"
            value={dsarRequests.filter((r: { status: string }) => r.status === 'completed').length}
            sub="resolved requests"
            status="neutral"
            link="/dashboard/dsar"
            icon="✔️"
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Breach & Incident Management (PDPL Art. 19)</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Open Incidents"
            value={openBreaches}
            sub="not yet resolved"
            status={openBreaches === 0 ? 'ok' : criticalBreaches > 0 ? 'critical' : 'warn'}
            link="/dashboard/breaches"
            icon="🚨"
          />
          <KpiCard
            label="72h SLA Overdue"
            value={breachOverdue}
            sub="SDAIA not notified"
            status={breachOverdue === 0 ? 'ok' : 'critical'}
            link="/dashboard/breaches"
            icon="🛑"
          />
          <KpiCard
            label="Critical Incidents"
            value={criticalBreaches}
            sub="unresolved critical"
            status={criticalBreaches === 0 ? 'ok' : 'critical'}
            link="/dashboard/breaches"
            icon="⚠️"
          />
          <KpiCard
            label="Total Incidents"
            value={breachIncidents.length}
            sub="all time"
            status="neutral"
            link="/dashboard/breaches"
            icon="📊"
          />
        </div>
      </div>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent DSARs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Urgent DSAR Requests</h3>
            <Link to="/dashboard/dsar" className="text-sm text-indigo-600 hover:text-indigo-800">View all →</Link>
          </div>
          {urgentDsars.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No open DSAR requests</p>
          ) : (
            <div className="space-y-3">
              {urgentDsars.map((req: { id: string; requestType: string; daysRemaining: number | null; isOverdue: boolean; dataSubject?: { name: string; email: string } }) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{req.requestType.replace('_', ' ')} Request</p>
                    <p className="text-xs text-gray-400">{req.dataSubject?.name || 'Unknown'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    req.isOverdue ? 'bg-red-100 text-red-700' :
                    (req.daysRemaining !== null && req.daysRemaining <= 5) ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {req.isOverdue ? 'Overdue' : req.daysRemaining !== null ? `${req.daysRemaining}d left` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Breaches */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Incidents</h3>
            <Link to="/dashboard/breaches" className="text-sm text-indigo-600 hover:text-indigo-800">View all →</Link>
          </div>
          {recentBreaches.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No breach incidents recorded</p>
          ) : (
            <div className="space-y-3">
              {recentBreaches.map((inc: { id: string; title: string; severity: string; status: string; isAuthorityOverdue: boolean; discoveredAt: string }) => (
                <div key={inc.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inc.title}</p>
                    <p className="text-xs text-gray-400">{format(new Date(inc.discoveredAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      inc.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      inc.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {inc.severity}
                    </span>
                    {inc.isAuthorityOverdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-200 text-red-800">72h!</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDPL Compliance Checklist */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-1">PDPL Compliance Checklist</h3>
        <p className="text-xs text-gray-500 mb-4">Real-time status across your data governance obligations</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Active consent requests with defined purpose (Art. 6)', done: activeConsents > 0 },
            { label: 'All DSAR requests responded to within 30 days (Art. 8)', done: overdueDsars === 0 },
            { label: 'No breach incidents pending SDAIA notification (Art. 19)', done: breachOverdue === 0 },
            { label: 'Critical breaches fully resolved and contained (Art. 19)', done: criticalBreaches === 0 },
            { label: 'No open data rights requests pending processing (Art. 8)', done: openDsars === 0 },
            { label: 'No data sharing requests awaiting organizational review', done: pendingDataShares === 0 },
          ].map(({ label, done }) => (
            <div key={label} className={`flex items-start gap-3 p-3 rounded-lg ${done ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className={`text-base mt-0.5 flex-shrink-0 ${done ? 'text-green-500' : 'text-red-400'}`}>{done ? '✓' : '✗'}</span>
              <p className={`text-sm leading-snug ${done ? 'text-green-800' : 'text-red-700'}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
