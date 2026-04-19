import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ConsentRequest {
  id: string;
  title: string;
  titleAr?: string;
  description: string;
  dataTypes: string[];
  purpose: string;
  legalBasis: string;
  retentionPeriod?: string;
  organization: { id: string; name: string; logoUrl?: string };
  privacyPolicyUrl?: string;
  expiresAt?: string;
}

interface RespondModal {
  request: ConsentRequest;
  status: 'approved' | 'rejected';
}

export default function ConsentRequests() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<RespondModal | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['consent-requests'],
    queryFn: () => api.get('/consents/requests?limit=50').then((r) => r.data.data),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.post(`/consents/${id}/respond`, { status, reason }),
    onSuccess: (_, vars) => {
      toast.success(`Consent ${vars.status} successfully`);
      queryClient.invalidateQueries({ queryKey: ['consent-requests'] });
      queryClient.invalidateQueries({ queryKey: ['consent-history-recent'] });
      setModal(null);
      setReason('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to respond';
      toast.error(msg);
    },
  });

  const handleRespond = () => {
    if (!modal) return;
    respondMutation.mutate({ id: modal.request.id, status: modal.status, reason });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-40 bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const requests: ConsentRequest[] = data?.requests || [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Consent Requests</h1>
        <p className="text-gray-500 text-sm mt-1">
          Review and respond to requests for your personal data
        </p>
      </div>

      {/* Trust banner */}
      <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-700">
          This organization is requesting access to your personal data for a specific purpose.
          Please review the details carefully before proceeding. You can approve, reject, or withdraw at any time.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="text-gray-900 font-medium">All caught up!</h3>
          <p className="text-gray-400 text-sm mt-1">No pending consent requests at this time</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="card">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 font-bold text-sm">
                      {req.organization.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{req.title}</p>
                    <p className="text-sm text-gray-500">{req.organization.name}</p>
                  </div>
                </div>
                {req.expiresAt && (
                  <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                    Expires {new Date(req.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">{req.description}</p>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Data Types</p>
                  <div className="flex flex-wrap gap-1">
                    {req.dataTypes.map((dt) => (
                      <span key={dt} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {dt}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Purpose</p>
                  <p className="text-sm text-gray-700">{req.purpose}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Legal Basis</p>
                  <p className="text-sm text-gray-700 capitalize">{req.legalBasis?.replace('_', ' ')}</p>
                </div>
                {req.retentionPeriod && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Retention Period</p>
                    <p className="text-sm text-gray-700">{req.retentionPeriod}</p>
                  </div>
                )}
              </div>

              {/* Privacy Policy link */}
              {req.privacyPolicyUrl && (
                <p className="text-xs text-gray-400 mb-4">
                  <a href={req.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    View Privacy Policy
                  </a>
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setModal({ request: req, status: 'approved' }); setReason(''); }}
                  className="btn-primary flex-1"
                >
                  Approve
                </button>
                <button
                  onClick={() => { setModal({ request: req, status: 'rejected' }); setReason(''); }}
                  className="btn-danger flex-1"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-semibold text-gray-900 mb-1">
              Confirm {modal.status === 'approved' ? 'Approval' : 'Rejection'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {modal.status === 'approved'
                ? `You are granting ${modal.request.organization.name} permission to process your data.`
                : `You are declining this consent request from ${modal.request.organization.name}.`}
            </p>

            <div className="mb-4">
              <label className="label">Reason (optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Add a reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleRespond}
                disabled={respondMutation.isPending}
                className={modal.status === 'approved' ? 'btn-primary flex-1' : 'btn-danger flex-1'}
              >
                {respondMutation.isPending ? 'Processing...' : `Confirm ${modal.status === 'approved' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
