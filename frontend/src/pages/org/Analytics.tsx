import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts';
import { format, parseISO } from 'date-fns';

const COLORS = { approved: '#22c55e', rejected: '#ef4444', withdrawn: '#f59e0b', pending: '#9ca3af' };

interface DayRow { date: string; status: string; count: string }

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['org-analytics'],
    queryFn: () => api.get('/analytics').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // Reshape daily trend data for recharts
  const trendMap: Record<string, Record<string, number>> = {};
  (data?.dailyTrend as DayRow[] || []).forEach(({ date, status, count }) => {
    if (!trendMap[date]) trendMap[date] = {};
    trendMap[date][status] = parseInt(count, 10);
  });
  const trendData = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, statuses]) => ({
      date: format(parseISO(date), 'MMM d'),
      ...statuses,
    }));

  // Pie chart data
  const pieData = Object.entries(data?.statusBreakdown || {})
    .filter(([, v]) => (v as number) > 0)
    .map(([status, count]) => ({ name: status, value: count as number }));

  // Top requests bar chart
  const topRequests = (data?.topRequests || []).map((r: { title: string; total_responses: number; approved: number; rejected: number }) => ({
    name: r.title.length > 25 ? r.title.substring(0, 25) + '…' : r.title,
    responses: parseInt(String(r.total_responses), 10),
    approved: parseInt(String(r.approved), 10),
    rejected: parseInt(String(r.rejected), 10),
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Consent response analytics and trends</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Responses', value: data?.summary.totalResponses ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Approval Rate', value: `${data?.summary.approvalRate ?? 0}%`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Unique Respondents', value: data?.summary.uniqueRespondents ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Active Requests', value: data?.summary.activeRequests ?? 0, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((s) => (
          <div key={s.label} className={`card ${s.bg}`}>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Response trend */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Response Trend (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="withdrawn" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status breakdown pie */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Status Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS] || '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">
              No response data yet
            </div>
          )}
        </div>
      </div>

      {/* Top requests */}
      {topRequests.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Top Consent Requests by Volume</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topRequests} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="approved" stackId="a" fill="#22c55e" />
              <Bar dataKey="rejected" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
