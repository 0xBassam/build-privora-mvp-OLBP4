import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface DataSharingRequest {
  id: string;
  title: string;
  purpose: string;
  dataTypes: string[];
  duration: string;
  status: string;
  createdAt: string;
  respondedAt?: string;
  dataSubject?: { id: string; name: string; email: string };
  providingOrg?: { id: string; name: string };
}

const STATUS_STYLES: Record<string, string> = {
  pending_consent: 'bg-yellow-100 text-yellow-700',
  consent_approved: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  revoked: 'bg-gray-100 text-gray-500',
  expired: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending_consent: 'Pending Consent',
  consent_approved: 'Consent Approved',
  completed: 'Completed',
  rejected: 'Rejected',
  revoked: 'Revoked',
  expired: 'Expired',
};

export default function OrgDataSharingRequests() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [executeModal, setExecuteModal] = useState<DataSharingRequest | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['org-data-sharing-requests', statusFilter],
    queryFn: () =>
      api
        .get(`/data-sharing/requests${statusFilter ? `?status=${statusFilter}` : ''}`)
        .then((r) => r.data.data),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/data-sharing/requests/${id}/execute`),
    onSuccess: (res) => {
      const shared = res.data?.data;
      toast.success(`Data shared successfully. Hash: ${(shared?.dataHash || '').slice(0, 12)}...`);
      queryClient.invalidateQueries({ queryKey: ['org-data-sharing-requests'] });
      queryClient.invalidateQueries({ queryKey: ['org-data-sharing-transactions'] });
      setExecuteModal(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to execute data sharing';
      toast.error(msg);
    },
  });

  const requests: DataSharingRequest[] = data?.requests || [];
  const pagination = data?.pagination;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Sharing Gateway</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage entity-to-entity data sharing requests under PDPL compliance
          </p>
        </div>
        <Link to="/dashboard/data-sharing/new" className="btn-primary">
          + New Request
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-gray-500">Filter:</span>
        {['', 'pending_consent', 'consent_approved', 'completed', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-14">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-gray-900 font-medium mb-2">No data sharing requests</h3>
          <Link to="/dashboard/data-sharing/new" className="btn-primary inline-flex text-sm">
            Create your first request
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Types</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{req.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{req.purpose}</p>
                  </td>
                  <td className="px-6 py-4">
                    {req.dataSubject ? (
                      <div>
                        <p className="text-sm text-gray-900">{req.dataSubject.name}</p>
                        <p className="text-xs text-gray-400">{req.dataSubject.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {req.dataTypes.slice(0, 3).map((dt) => (
                        <span key={dt} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {dt}
                        </span>
                      ))}
                      {req.dataTypes.length > 3 && (
                        <span className="text-xs text-gray-400">+{req.dataTypes.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[req.status] || req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(req.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    {req.status === 'consent_approved' ? (
                      <button
                        onClick={() => setExecuteModal(req)}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        Execute Share
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {req.status === 'completed' ? 'Done' : req.status === 'pending_consent' ? 'Waiting' : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination && pagination.total > requests.length && (
            <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 text-center border-t">
              Showing {requests.length} of {pagination.total} requests
            </div>
          )}
        </div>
      )}

      {/* Execute confirm modal */}
      {executeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Execute Data Sharing</h3>
                <p className="text-xs text-gray-500">{executeModal.title}</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
              <p><strong>Subject:</strong> {executeModal.dataSubject?.name || '—'}</p>
              <p><strong>Data types:</strong> {executeModal.dataTypes.join(', ')}</p>
              <p><strong>Purpose:</strong> {executeModal.purpose}</p>
              <p><strong>Duration:</strong> {executeModal.duration}</p>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              The data will be minimized to only the approved fields. A SHA-256 hash will be recorded
              for integrity verification. This action is irreversible and will be logged in the audit trail.
            </p>

            <div className="flex gap-3">
              <button onClick={() => setExecuteModal(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={() => executeMutation.mutate(executeModal.id)}
                disabled={executeMutation.isPending}
                className="btn-primary flex-1"
              >
                {executeMutation.isPending ? 'Sharing...' : 'Confirm & Share'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
