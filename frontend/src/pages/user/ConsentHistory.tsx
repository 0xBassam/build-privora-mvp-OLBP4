import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface HistoryItem {
  id: string;
  status: 'approved' | 'rejected' | 'withdrawn' | 'pending';
  reason?: string;
  respondedAt?: string;
  createdAt: string;
  consentRequest: {
    id: string;
    title: string;
    purpose: string;
    dataTypes: string[];
    organization: { name: string };
  };
}

const StatusBadge = ({ status }: { status: string }) => {
  const classes: Record<string, string> = {
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    withdrawn: 'badge-withdrawn',
    pending: 'badge-pending',
  };
  return <span className={classes[status] || 'badge-pending'}>{status}</span>;
};

export default function ConsentHistory() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [withdrawTarget, setWithdrawTarget] = useState<HistoryItem | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['consent-history', statusFilter],
    queryFn: () =>
      api.get(`/consents/history?limit=50${statusFilter ? `&status=${statusFilter}` : ''}`).then((r) => r.data.data),
  });

  const withdrawMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/consents/${id}/respond`, { status: 'withdrawn', reason }),
    onSuccess: () => {
      toast.success('Consent withdrawn successfully');
      queryClient.invalidateQueries({ queryKey: ['consent-history'] });
      setWithdrawTarget(null);
      setWithdrawReason('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to withdraw';
      toast.error(msg);
    },
  });

  const history: HistoryItem[] = data?.history || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consent History</h1>
          <p className="text-gray-500 text-sm mt-1">Full audit trail of your consent decisions</p>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-sm"
          >
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg" />)}
        </div>
      ) : history.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No consent history found</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consent Request</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{item.consentRequest?.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Data: {item.consentRequest?.dataTypes?.join(', ')}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.consentRequest?.organization?.name}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(item.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'approved' && (
                      <button
                        onClick={() => { setWithdrawTarget(item); setWithdrawReason(''); }}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Withdraw Consent</h3>
            <p className="text-sm text-gray-500 mb-4">
              You are withdrawing consent for <strong>{withdrawTarget.consentRequest?.title}</strong>.
              This will be recorded in the audit trail.
            </p>
            <div className="mb-4">
              <label className="label">Reason (optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Reason for withdrawal..."
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setWithdrawTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => withdrawMutation.mutate({ id: withdrawTarget.consentRequest.id, reason: withdrawReason })}
                disabled={withdrawMutation.isPending}
                className="btn-danger flex-1"
              >
                {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw Consent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
