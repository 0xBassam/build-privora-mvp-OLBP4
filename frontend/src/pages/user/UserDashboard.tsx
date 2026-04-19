import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { format, differenceInDays } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ConsentReq {
  id: string;
  title: string;
  purpose?: string;
  dataTypes?: string[];
  organization: { id: string; name: string };
  expiresAt?: string;
}

interface HistoryItem {
  id: string;
  status: string;
  createdAt: string;
  consentRequest: { title: string; organization: { name: string }; purpose?: string; dataTypes?: string[] };
}

interface DataShareReq {
  id: string;
  title: string;
  purpose?: string;
  dataTypes?: string[];
  status: string;
  respondedAt?: string;
  createdAt: string;
  requestingOrg?: { id: string; name: string };
}

// ─── Timeline helpers ──────────────────────────────────────────────────────────

type TimelineEvent = {
  id: string;
  kind: 'consent' | 'sharing';
  org: string;
  date: string;
  dataTypes: string[];
  purpose: string;
  status: string;
};

function buildTimeline(history: HistoryItem[], shares: DataShareReq[]): TimelineEvent[] {
  const items: TimelineEvent[] = [];

  (history || [])
    .filter((h) => h.status === 'approved')
    .forEach((h) => {
      items.push({
        id: `c-${h.id}`,
        kind: 'consent',
        org: h.consentRequest?.organization?.name ?? 'Unknown',
        date: h.createdAt,
        dataTypes: h.consentRequest?.dataTypes ?? [],
        purpose: h.consentRequest?.purpose ?? h.consentRequest?.title ?? '',
        status: h.status,
      });
    });

  (shares || [])
    .filter((s) => s.status === 'consent_approved' || s.status === 'completed')
    .forEach((s) => {
      items.push({
        id: `s-${s.id}`,
        kind: 'sharing',
        org: s.requestingOrg?.name ?? 'Unknown',
        date: s.respondedAt ?? s.createdAt,
        dataTypes: s.dataTypes ?? [],
        purpose: s.purpose ?? s.title ?? '',
        status: s.status,
      });
    });

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
}

function formatDataTypes(types: string[]): string {
  if (!types.length) return 'personal data';
  const labels = types.slice(0, 2).map((t) => t.replace(/_/g, ' '));
  const rest = types.length > 2 ? ` +${types.length - 2} more` : '';
  return labels.join(', ') + rest;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function UserDashboard() {
  const { user } = useAuthStore();

  const { data: requestsData } = useQuery({
    queryKey: ['consent-requests'],
    queryFn: () => api.get('/consents/requests?limit=10').then((r) => r.data.data),
  });

  const { data: historyData } = useQuery({
    queryKey: ['consent-history-recent'],
    queryFn: () => api.get('/consents/history?limit=10').then((r) => r.data.data),
  });

  const { data: dataSharingData } = useQuery({
    queryKey: ['user-data-sharing-requests'],
    queryFn: () => api.get('/data-sharing/user/requests?limit=20').then((r) => r.data.data),
  });

  const requests: ConsentReq[] = requestsData?.requests ?? [];
  const history: HistoryItem[] = historyData?.history ?? [];
  const shares: DataShareReq[] = dataSharingData?.requests ?? [];

  const pendingCount = requestsData?.pagination?.total ?? requests.length;
  const activeConsentsCount = history.filter((h) => h.status === 'approved').length;
  const activeDataShares = shares.filter((s) => s.status === 'consent_approved' || s.status === 'completed').length;
  const pendingDataShares = shares.filter((s) => s.status === 'pending_consent').length;

  // Unique organizations requesting data
  const orgsRequesting = [...new Set(requests.map((r) => r.organization?.name).filter(Boolean))];

  // Expiring consents (within 7 days)
  const expiringRequests = requests.filter((r) => {
    if (!r.expiresAt) return false;
    const days = differenceInDays(new Date(r.expiresAt), new Date());
    return days >= 0 && days <= 7;
  });

  // Timeline
  const timeline = buildTimeline(history, shares);

  const totalPendingActions = pendingCount + pendingDataShares;

  return (
    <div className="p-8 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">Welcome back, {user?.name?.split(' ')[0]}</p>
          <h1 className="text-2xl font-bold text-gray-900">You Are in Control of Your Data</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage how your personal data is used, shared, and accessed across organizations.
          </p>
        </div>
        {/* Notification badge */}
        {totalPendingActions > 0 && (
          <div className="flex items-center gap-2 bg-orange-100 border border-orange-200 rounded-xl px-4 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
            </span>
            <span className="text-sm font-semibold text-orange-700">{totalPendingActions} action{totalPendingActions > 1 ? 's' : ''} pending</span>
          </div>
        )}
      </div>

      {/* ── WOW Moment Banner ───────────────────────────────────────────────── */}
      {orgsRequesting.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">
                  {orgsRequesting.length} organization{orgsRequesting.length > 1 ? 's are' : ' is'} requesting access to your data
                </p>
                <p className="text-blue-100 text-sm mt-1">
                  {pendingCount} consent request{pendingCount > 1 ? 's require' : ' requires'} your approval
                  {pendingDataShares > 0 && ` · ${pendingDataShares} data sharing request${pendingDataShares > 1 ? 's' : ''} awaiting`}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {orgsRequesting.map((name) => (
                    <span key={name} className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full">{name}</span>
                  ))}
                </div>
              </div>
            </div>
            <Link
              to="/portal/requests"
              className="flex-shrink-0 bg-white text-blue-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              Review Now →
            </Link>
          </div>

          {/* Expiring soon warning */}
          {expiringRequests.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-yellow-200">
                <span className="font-semibold">{expiringRequests.length} request{expiringRequests.length > 1 ? 's' : ''}</span> expiring within 7 days — review before they close.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Actions ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Review Requests', to: '/portal/requests', color: 'bg-blue-600 hover:bg-blue-700', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', badge: pendingCount },
          { label: 'Manage Consent', to: '/portal/history', color: 'bg-green-600 hover:bg-green-700', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: 0 },
          { label: 'Data Sharing', to: '/portal/data-sharing', color: 'bg-indigo-600 hover:bg-indigo-700', icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z', badge: pendingDataShares },
          { label: 'Your Rights', to: '/portal/data-rights', color: 'bg-purple-600 hover:bg-purple-700', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', badge: 0 },
        ].map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className={`relative flex items-center gap-2 ${action.color} text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
            </svg>
            <span className="leading-tight">{action.label}</span>
            {action.badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {action.badge}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── KPI Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-500">Pending Requests</p>
              <p className="text-xs text-gray-400 mt-0.5">You can review or withdraw at any time</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeConsentsCount}</p>
              <p className="text-sm text-gray-500">Active Consents</p>
              <p className="text-xs text-gray-400 mt-0.5">All actions recorded for audit</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeDataShares}</p>
              <p className="text-sm text-gray-500">Data Sharing Activities</p>
              <p className="text-xs text-gray-400 mt-0.5">{pendingDataShares > 0 ? `${pendingDataShares} awaiting approval` : 'None pending'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT — Pending requests + Data sharing card (2/5 + 3/5 split) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pending Consent Requests */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Pending Requests</h2>
              <Link to="/portal/requests" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            {requests.length > 0 ? (
              <div className="space-y-3">
                {requests.slice(0, 4).map((req) => {
                  const daysLeft = req.expiresAt ? differenceInDays(new Date(req.expiresAt), new Date()) : null;
                  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
                  return (
                    <Link
                      key={req.id}
                      to="/portal/requests"
                      className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{req.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{req.organization?.name}</p>
                        </div>
                        {isExpiringSoon && (
                          <span className="flex-shrink-0 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {daysLeft}d left
                          </span>
                        )}
                      </div>
                      {req.dataTypes && req.dataTypes.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1.5">
                          Requesting: {formatDataTypes(req.dataTypes)}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">All caught up</p>
                <p className="text-gray-400 text-xs mt-1">No pending consent requests</p>
              </div>
            )}
          </div>

          {/* Data Sharing Highlight Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Data Sharing</h2>
              <Link to="/portal/data-sharing" className="text-sm text-indigo-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-indigo-800">{activeDataShares}</p>
                  <p className="text-xs text-indigo-600">Active sharing agreements</p>
                </div>
                <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>

              {shares.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    s.status === 'consent_approved' ? 'bg-green-500' :
                    s.status === 'pending_consent' ? 'bg-orange-400' :
                    s.status === 'completed' ? 'bg-blue-400' : 'bg-gray-300'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{s.requestingOrg?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-400 truncate">{s.title}</p>
                  </div>
                  <span className={`text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full ${
                    s.status === 'consent_approved' ? 'bg-green-100 text-green-700' :
                    s.status === 'pending_consent' ? 'bg-orange-100 text-orange-700' :
                    s.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {s.status === 'pending_consent' ? 'Pending' :
                     s.status === 'consent_approved' ? 'Active' :
                     s.status === 'completed' ? 'Done' : s.status}
                  </span>
                </div>
              ))}

              {shares.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No data sharing requests yet</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Data Activity Timeline */}
        <div className="lg:col-span-3">
          <div className="card h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-gray-900">Your Data Activity Timeline</h2>
                <p className="text-xs text-gray-400 mt-0.5">Full visibility of how your personal data has been used</p>
              </div>
              <Link to="/portal/history" className="text-sm text-blue-600 hover:underline">Full history</Link>
            </div>

            {timeline.length > 0 ? (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />

                <div className="space-y-5">
                  {timeline.map((event, i) => (
                    <div key={event.id} className="relative flex gap-4 pl-10">
                      {/* Icon dot */}
                      <div className={`absolute left-0 w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                        event.kind === 'consent' ? 'bg-green-100' : 'bg-indigo-100'
                      }`}>
                        {event.kind === 'consent' ? (
                          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 pb-4 ${i < timeline.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <p className="text-sm text-gray-800 leading-snug">
                          {event.kind === 'consent' ? (
                            <>You granted <span className="font-semibold text-gray-900">{event.org}</span> access to your{' '}
                            <span className="font-medium">{formatDataTypes(event.dataTypes)}</span></>
                          ) : (
                            <>Your data was shared with <span className="font-semibold text-gray-900">{event.org}</span></>
                          )}
                        </p>
                        {event.purpose && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Purpose: {event.purpose}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-gray-400">
                            {format(new Date(event.date), 'dd MMM yyyy')}
                          </span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full" />
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            event.kind === 'consent' ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {event.kind === 'consent' ? 'Consent' : 'Data Sharing'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">No activity yet</p>
                <p className="text-gray-400 text-xs mt-1">Your data usage history will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Awareness & Trust Footer ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-blue-800">PDPL Protected</p>
            <p className="text-xs text-blue-600 mt-0.5">Your data is protected in accordance with Saudi PDPL</p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3.5">
          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-green-800">Full Control</p>
            <p className="text-xs text-green-600 mt-0.5">You can review or withdraw your consent at any time</p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3.5">
          <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-purple-800">Full Audit Trail</p>
            <p className="text-xs text-purple-600 mt-0.5">All actions are recorded for transparency and accountability</p>
          </div>
        </div>
      </div>

    </div>
  );
}
