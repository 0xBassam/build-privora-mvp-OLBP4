import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface DataSharingRequest {
  id: string;
  title: string;
  purpose: string;
  dataTypes: string[];
  duration: string;
  legalBasis: string;
  privacyNotice?: string;
  status: string;
  respondedAt?: string;
  createdAt: string;
  requestingOrg?: { id: string; name: string; logoUrl?: string };
}

interface RespondModal {
  request: DataSharingRequest;
  action: 'approved' | 'rejected';
}

const STATUS_STYLES: Record<string, string> = {
  pending_consent: 'bg-orange-100 text-orange-700',
  consent_approved: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  revoked: 'bg-gray-100 text-gray-600',
  expired: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  pending_consent: 'Awaiting Your Consent',
  consent_approved: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
  revoked: 'Revoked',
  expired: 'Expired',
};

export default function DataSharingRequests() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<RespondModal | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['user-data-sharing-requests'],
    queryFn: () =>
      api.get('/data-sharing/user/requests?limit=50').then((r) => r.data.data),
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.post(`/data-sharing/requests/${id}/respond`, { status, reason }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.status === 'approved'
          ? 'Data sharing approved. The organization can now access your data.'
          : 'Data sharing request rejected.'
      );
      queryClient.invalidateQueries({ queryKey: ['user-data-sharing-requests'] });
      setModal(null);
      setReason('');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to respond to request';
      toast.error(msg);
    },
  });

  const handleRespond = () => {
    if (!modal) return;
    respondMutation.mutate({
      id: modal.request.id,
      status: modal.action,
      reason: reason || undefined,
    });
  };

  const requests: DataSharingRequest[] = data?.requests || [];
  const pending = requests.filter((r) => r.status === 'pending_consent');
  const responded = requests.filter((r) => r.status !== 'pending_consent');

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-44 bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Sharing Requests</h1>
        <p className="text-gray-500 text-sm mt-1">
          Organizations requesting access to your personal data between entities
        </p>
      </div>

      {/* Trust banner */}
      <div className="mb-6 flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4">
        <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-sm text-indigo-700">
          Your data will only be shared after your explicit approval. All actions are recorded
          and auditable in accordance with Saudi PDPL.
        </p>
      </div>

      {/* Pending */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Awaiting Your Response ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div className="card text-center py-10">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-400 text-sm">No pending data sharing requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onApprove={() => { setModal({ request: req, action: 'approved' }); setReason(''); }}
                onReject={() => { setModal({ request: req, action: 'rejected' }); setReason(''); }}
              />
            ))}
          </div>
        )}
      </section>

      {/* History */}
      {responded.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Past Requests ({responded.length})
          </h2>
          <div className="space-y-3">
            {responded.map((req) => (
              <div key={req.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 font-bold text-xs">
                        {(req.requestingOrg?.name || 'Org').charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{req.title}</p>
                      <p className="text-xs text-gray-500">
                        {req.requestingOrg?.name} ·{' '}
                        {format(new Date(req.respondedAt || req.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABELS[req.status] || req.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {req.dataTypes.map((dt) => (
                    <span key={dt} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                      {dt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Confirm Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                modal.action === 'approved' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {modal.action === 'approved' ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {modal.action === 'approved' ? 'Approve Data Sharing' : 'Reject Data Sharing'}
                </h3>
                <p className="text-xs text-gray-500">{modal.request.title}</p>
              </div>
            </div>

            {modal.action === 'approved' ? (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <strong>Important:</strong> By approving, you authorize{' '}
                <strong>{modal.request.requestingOrg?.name || 'this organization'}</strong> to access
                your data: <strong>{modal.request.dataTypes.join(', ')}</strong> for the purpose of "
                {modal.request.purpose}".
                {modal.request.duration && ` Duration: ${modal.request.duration}.`}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                You are declining this data sharing request. The organization will be notified.
              </p>
            )}

            <div className="mb-4">
              <label className="label">Reason {modal.action === 'rejected' ? '(optional)' : '(optional)'}</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder={modal.action === 'rejected' ? 'Why are you declining this request?' : 'Add a note (optional)'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={respondMutation.isPending}
                className={`flex-1 ${modal.action === 'approved' ? 'btn-primary' : 'btn-danger'}`}
              >
                {respondMutation.isPending
                  ? 'Processing...'
                  : modal.action === 'approved'
                  ? 'Approve'
                  : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: DataSharingRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card border border-orange-200 bg-orange-50/30">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{request.title}</p>
            <p className="text-sm text-gray-500">
              {request.requestingOrg?.name || 'Organization'} ·{' '}
              {format(new Date(request.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
          Action Required
        </span>
      </div>

      {/* Data types */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {request.dataTypes.map((dt) => (
          <span key={dt} className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
            {dt}
          </span>
        ))}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-lg mb-3 text-xs">
        <div>
          <p className="text-gray-400 uppercase tracking-wide font-medium mb-0.5">Purpose</p>
          <p className="text-gray-700">{request.purpose}</p>
        </div>
        <div>
          <p className="text-gray-400 uppercase tracking-wide font-medium mb-0.5">Duration</p>
          <p className="text-gray-700">{request.duration}</p>
        </div>
        {request.legalBasis && (
          <div>
            <p className="text-gray-400 uppercase tracking-wide font-medium mb-0.5">Legal Basis</p>
            <p className="text-gray-700 capitalize">{request.legalBasis.replace(/_/g, ' ')}</p>
          </div>
        )}
      </div>

      {/* Privacy notice toggle */}
      {request.privacyNotice && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            {expanded ? 'Hide' : 'Show'} privacy notice
            <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg leading-relaxed">
              {request.privacyNotice}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onApprove} className="btn-primary flex-1 text-sm">
          Approve
        </button>
        <button onClick={onReject} className="btn-danger flex-1 text-sm">
          Reject
        </button>
      </div>
    </div>
  );
}
