import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface Response {
  id: string;
  status: 'approved' | 'rejected' | 'withdrawn';
  reason?: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

const StatusBadge = ({ status }: { status: string }) => {
  const cls: Record<string, string> = {
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    withdrawn: 'badge-withdrawn',
  };
  return <span className={cls[status] || 'badge-pending'}>{status}</span>;
};

export default function ConsentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['consent-responses', id],
    queryFn: () =>
      api.get(`/consents/org/${id}/responses?limit=100`).then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-100 rounded" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const consentRequest = data?.consentRequest;
  const responses: Response[] = data?.responses || [];
  const total = responses.length;
  const approved = responses.filter((r) => r.status === 'approved').length;
  const rejected = responses.filter((r) => r.status === 'rejected').length;
  const withdrawn = responses.filter((r) => r.status === 'withdrawn').length;

  return (
    <div className="p-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to consents
      </button>

      {consentRequest && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{consentRequest.title}</h1>
              <p className="text-gray-500 text-sm mt-1">{consentRequest.purpose}</p>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full ${consentRequest.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {consentRequest.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Responses', value: total, color: 'text-gray-900' },
              { label: 'Approved', value: approved, color: 'text-green-600' },
              { label: 'Rejected', value: rejected, color: 'text-red-600' },
              { label: 'Withdrawn', value: withdrawn, color: 'text-yellow-600' },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Request details */}
          <div className="card mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Consent Details</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Data Types</p>
                <div className="flex flex-wrap gap-1">
                  {consentRequest.dataTypes?.map((dt: string) => (
                    <span key={dt} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {dt}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Legal Basis</p>
                <p className="text-gray-700 capitalize">{consentRequest.legalBasis?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Retention Period</p>
                <p className="text-gray-700">{consentRequest.retentionPeriod || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Responses table */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">User Responses ({total})</h2>
            </div>
            {responses.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No responses yet</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {responses.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{r.user?.name}</p>
                        <p className="text-xs text-gray-400">{r.user?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {r.reason || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(r.createdAt), 'MMM d, yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
