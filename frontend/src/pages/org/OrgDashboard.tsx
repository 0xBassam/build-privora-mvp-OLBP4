import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Analytics {
  summary: {
    totalRequests: number;
    activeRequests: number;
    totalResponses: number;
    uniqueRespondents: number;
    approvalRate: number;
  };
  statusBreakdown: Record<string, number>;
  topRequests: Array<{ id: string; title: string; total_responses: number; approved: number }>;
}

const StatCard = ({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) => (
  <div className="card">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-gray-500">{label}</p>
      <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>{icon}</div>
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

export default function OrgDashboard() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ['org-analytics'],
    queryFn: () => api.get('/analytics').then((r) => r.data.data),
  });

  const { data: recentConsents } = useQuery({
    queryKey: ['org-consents-recent'],
    queryFn: () => api.get('/consents/org?limit=5').then((r) => r.data.data),
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-gray-400 mb-0.5">{user?.organization?.name}</p>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Overview</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor your organization's data governance and compliance status in real time.
          </p>
        </div>
        <Link to="/dashboard/consents/new" className="btn-primary">
          + New Consent Request
        </Link>
      </div>

      {isLoading ? (
        <div className="animate-pulse grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Active Consents"
              value={data?.summary.activeRequests ?? 0}
              sub={`of ${data?.summary.totalRequests ?? 0} total requests`}
              color="bg-blue-100"
              icon={<svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            />
            <StatCard
              label="Pending Requests"
              value={data?.statusBreakdown.pending ?? 0}
              sub={`${data?.summary.uniqueRespondents ?? 0} users responded`}
              color="bg-orange-100"
              icon={<svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              label="Approval Rate"
              value={`${data?.summary.approvalRate ?? 0}%`}
              sub="of consent decisions"
              color="bg-green-100"
              icon={<svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              label="Data Sharing Activities"
              value={data?.summary.totalResponses ?? 0}
              sub="total consent decisions"
              color="bg-purple-100"
              icon={<svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status breakdown */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Response Breakdown</h2>
              <div className="space-y-3">
                {[
                  { key: 'approved', label: 'Approved', color: 'bg-green-500' },
                  { key: 'rejected', label: 'Rejected', color: 'bg-red-500' },
                  { key: 'withdrawn', label: 'Withdrawn', color: 'bg-yellow-500' },
                  { key: 'pending', label: 'Pending', color: 'bg-gray-400' },
                ].map(({ key, label, color }) => {
                  const count = data?.statusBreakdown[key] ?? 0;
                  const total = data?.summary.totalResponses ?? 1;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium text-gray-900">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent consents */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Recent Consent Requests</h2>
                <Link to="/dashboard/consents" className="text-sm text-blue-600 hover:underline">View all</Link>
              </div>
              {recentConsents?.requests?.length > 0 ? (
                <div className="space-y-3">
                  {recentConsents.requests.map((cr: { id: string; title: string; isActive: boolean; createdAt: string }) => (
                    <Link
                      key={cr.id}
                      to={`/dashboard/consents/${cr.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cr.title}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(cr.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${cr.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {cr.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 text-sm py-6">No consent requests yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
