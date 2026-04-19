import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface DsarRequest {
  id: string;
  organizationId: string;
  requestType: string;
  description?: string;
  status: string;
  slaDeadline: string;
  daysRemaining: number | null;
  isOverdue: boolean;
  adminNotes?: string;
  responseData?: string;
  rejectionReason?: string;
  processedAt?: string;
  createdAt: string;
  organization?: { id: string; name: string };
}

const TYPE_LABELS: Record<string, string> = {
  access: 'Access My Data',
  correction: 'Correct My Data',
  deletion: 'Delete My Data',
  portability: 'Data Portability',
  objection: 'Object to Processing',
};

const TYPE_DESC: Record<string, string> = {
  access: 'Request a copy of all personal data held about you',
  correction: 'Request correction of inaccurate or incomplete data',
  deletion: 'Request erasure of your personal data (right to be forgotten)',
  portability: 'Receive your data in a portable, machine-readable format',
  objection: 'Object to certain processing activities on your data',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
};

export default function DsarRequests() {
  const queryClient = useQueryClient();
  const [showSubmit, setShowSubmit] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [orgId, setOrgId] = useState('');
  const [description, setDescription] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['user-dsar-requests'],
    queryFn: () => api.get('/dsar/requests?limit=50').then((r) => r.data.data),
  });

  const submitMutation = useMutation({
    mutationFn: (body: { organizationId: string; requestType: string; description?: string }) =>
      api.post('/dsar/requests', body),
    onSuccess: () => {
      toast.success('Request submitted. The organization has 30 days to respond.');
      queryClient.invalidateQueries({ queryKey: ['user-dsar-requests'] });
      setShowSubmit(false);
      setSelectedType('');
      setOrgId('');
      setDescription('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    },
  });

  const handleSubmit = () => {
    if (!selectedType || !orgId.trim()) {
      toast.error('Select a request type and enter an organization ID');
      return;
    }
    submitMutation.mutate({ organizationId: orgId.trim(), requestType: selectedType, description: description || undefined });
  };

  const requests: DsarRequest[] = data?.requests || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Data Rights</h1>
          <p className="text-sm text-gray-500 mt-1">
            You can access, correct, or delete your personal data and track requests in real time.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowSubmit(true)}>
          + New Request
        </button>
      </div>

      {/* PDPL Rights Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">Your Rights Under Saudi PDPL Art. 8</p>
        <p className="text-sm text-blue-700">
          You have the right to access, correct, delete, or port your personal data, and to object to certain types
          of processing. Every request is tracked in real time and organizations are legally required to respond within 30 days.
        </p>
      </div>

      {/* Submit Modal */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Submit Data Rights Request</h2>
              <button onClick={() => setShowSubmit(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organization ID</label>
              <input
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="Paste organization UUID"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setSelectedType(value)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      selectedType === value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{TYPE_DESC[value]}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Provide any additional context..."
                className="input resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="btn-primary flex-1"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
              <button onClick={() => setShowSubmit(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request List */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-3">🔏</div>
          <p className="text-gray-500 font-medium">No data rights requests yet</p>
          <p className="text-sm text-gray-400 mt-1">Submit a request to exercise your rights under PDPL</p>
          <button className="btn-primary mt-4" onClick={() => setShowSubmit(true)}>Submit First Request</button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {TYPE_LABELS[req.requestType] || req.requestType}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[req.status] || req.status}
                    </span>
                    {req.isOverdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {req.organization?.name || req.organizationId}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Submitted {format(new Date(req.createdAt), 'MMM d, yyyy')} ·{' '}
                    {req.status === 'pending' || req.status === 'in_progress'
                      ? req.daysRemaining !== null && req.daysRemaining > 0
                        ? `${req.daysRemaining} days remaining`
                        : 'Deadline passed'
                      : `Closed ${req.processedAt ? formatDistanceToNow(new Date(req.processedAt), { addSuffix: true }) : ''}`}
                  </p>
                </div>
                <button
                  onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 ml-4 shrink-0"
                >
                  {expanded === req.id ? 'Hide' : 'Details'}
                </button>
              </div>

              {expanded === req.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wide">SLA Deadline</p>
                      <p className="text-gray-800 font-medium">{format(new Date(req.slaDeadline), 'MMM d, yyyy')}</p>
                    </div>
                    {req.description && (
                      <div className="col-span-2">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Your Description</p>
                        <p className="text-gray-800">{req.description}</p>
                      </div>
                    )}
                  </div>

                  {req.adminNotes && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Organization Notes</p>
                      <p className="text-sm text-gray-700">{req.adminNotes}</p>
                    </div>
                  )}
                  {req.responseData && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Response</p>
                      <p className="text-sm text-green-800">{req.responseData}</p>
                    </div>
                  )}
                  {req.rejectionReason && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs text-red-600 uppercase tracking-wide mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-800">{req.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
