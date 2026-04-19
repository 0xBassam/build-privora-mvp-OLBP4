import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface DsarRequest {
  id: string;
  caseId?: string;
  requestType: string;
  status: string;
  description?: string;
  adminNotes?: string;
  responseData?: string;
  rejectionReason?: string;
  slaDeadline: string;
  daysRemaining: number | null;
  isOverdue: boolean;
  processedAt?: string;
  createdAt: string;
  identityVerified: boolean;
  identityVerifiedAt?: string;
  identityVerificationMethod?: string;
  disclosureType: string;
  restrictionReason?: string;
  restrictedFields?: string[];
  dataSubject?: { id: string; name: string; email: string };
  processor?: { id: string; name: string };
}

const TYPE_LABELS: Record<string, string> = {
  access: 'Access', correction: 'Correction', deletion: 'Deletion',
  portability: 'Portability', objection: 'Objection',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const VERIFY_METHODS = [
  { value: 'otp', label: 'OTP (SMS/Email)' },
  { value: 'document', label: 'Identity Document' },
  { value: 'in_person', label: 'In-Person Verification' },
  { value: 'digital_signature', label: 'Digital Signature' },
];

export default function OrgDsarRequests() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<DsarRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Process form state
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [responseData, setResponseData] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [disclosureType, setDisclosureType] = useState('full');
  const [restrictionReason, setRestrictionReason] = useState('');
  const [verifyMethod, setVerifyMethod] = useState('otp');
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);

  const params = new URLSearchParams({ limit: '50' });
  if (statusFilter) params.set('status', statusFilter);
  if (typeFilter) params.set('requestType', typeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dsar-requests', statusFilter, typeFilter],
    queryFn: () => api.get(`/dsar/admin/requests?${params}`).then((r) => r.data.data),
  });

  const processMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch(`/dsar/admin/requests/${id}`, body),
    onSuccess: () => {
      toast.success('DSAR request updated');
      queryClient.invalidateQueries({ queryKey: ['admin-dsar-requests'] });
      closeModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update request'),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) =>
      api.post(`/dsar/admin/requests/${id}/verify-identity`, { identityVerificationMethod: method }),
    onSuccess: (res) => {
      toast.success('Identity verified');
      queryClient.invalidateQueries({ queryKey: ['admin-dsar-requests'] });
      setShowVerifyPanel(false);
      setModal(res.data.data?.request ?? modal);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Verification failed'),
  });

  const openModal = (req: DsarRequest) => {
    setModal(req);
    setNewStatus(req.status);
    setAdminNotes(req.adminNotes || '');
    setResponseData(req.responseData || '');
    setRejectionReason(req.rejectionReason || '');
    setDisclosureType(req.disclosureType || 'full');
    setRestrictionReason(req.restrictionReason || '');
    setShowVerifyPanel(false);
  };

  const closeModal = () => {
    setModal(null);
    setNewStatus(''); setAdminNotes(''); setResponseData('');
    setRejectionReason(''); setDisclosureType('full'); setRestrictionReason('');
    setShowVerifyPanel(false);
  };

  const handleProcess = () => {
    if (!modal) return;
    const body: Record<string, unknown> = {};
    if (newStatus && newStatus !== modal.status) body.status = newStatus;
    if (adminNotes !== (modal.adminNotes || '')) body.adminNotes = adminNotes;
    if (responseData !== (modal.responseData || '')) body.responseData = responseData;
    if (rejectionReason !== (modal.rejectionReason || '')) body.rejectionReason = rejectionReason;
    if (disclosureType !== (modal.disclosureType || 'full')) body.disclosureType = disclosureType;
    if (disclosureType !== 'full' && restrictionReason) body.restrictionReason = restrictionReason;
    if (Object.keys(body).length === 0) { toast('No changes to save'); return; }
    processMutation.mutate({ id: modal.id, body });
  };

  const requests: DsarRequest[] = data?.requests || [];
  const summary = data?.summary;
  const overdueCount = requests.filter((r) => r.isOverdue).length;
  const unverifiedCount = requests.filter((r) => !r.identityVerified && r.status !== 'rejected').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Subject Requests</h1>
        <p className="text-sm text-gray-500 mt-1">PDPL Art. 4 & 8 — Respond within 30 days · Identity verification required before completion</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-gray-900">{summary?.total ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-600">{requests.filter((r) => r.status === 'pending').length}</p>
          <p className="text-xs text-gray-500 mt-1">Pending</p>
        </div>
        <div className="card text-center">
          <p className={`text-3xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueCount}</p>
          <p className="text-xs text-gray-500 mt-1">Overdue (SLA)</p>
        </div>
        <div className="card text-center">
          <p className={`text-3xl font-bold ${unverifiedCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{unverifiedCount}</p>
          <p className="text-xs text-gray-500 mt-1">ID Unverified</p>
        </div>
      </div>

      {/* Alerts */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-500 text-xl">⚠</span>
          <div>
            <p className="text-sm font-semibold text-red-800">{overdueCount} request{overdueCount > 1 ? 's' : ''} past 30-day SLA</p>
            <p className="text-xs text-red-600 mt-0.5">Overdue responses may constitute a PDPL violation. Process immediately.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-auto">
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-gray-500 font-medium">No data subject requests</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Case ID</th>
                <th className="px-4 py-3 text-left">Data Subject</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Identity</th>
                <th className="px-4 py-3 text-left">SLA Deadline</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {req.caseId || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{req.dataSubject?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{req.dataSubject?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                      {TYPE_LABELS[req.requestType] || req.requestType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[req.status] || 'bg-gray-100 text-gray-600'}`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {req.identityVerified ? (
                      <span className="text-green-600 text-xs font-medium">Verified ✓</span>
                    ) : (
                      <span className="text-orange-500 text-xs">Unverified</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className={req.isOverdue ? 'text-red-600 font-semibold text-xs' : 'text-gray-700 text-xs'}>
                      {format(new Date(req.slaDeadline), 'MMM d, yyyy')}
                    </p>
                    {req.status !== 'completed' && req.status !== 'rejected' && req.daysRemaining !== null && (
                      <p className={`text-xs mt-0.5 ${req.isOverdue ? 'text-red-500' : req.daysRemaining <= 5 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {req.isOverdue ? 'Overdue' : `${req.daysRemaining}d left`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {req.status === 'completed' || req.status === 'rejected' ? (
                      <span className="text-xs text-gray-400">Closed</span>
                    ) : (
                      <button onClick={() => openModal(req)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                        Process →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Process Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Process DSAR</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {modal.caseId && <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-2">{modal.caseId}</span>}
                  {TYPE_LABELS[modal.requestType]} · <span className="font-medium">{modal.dataSubject?.name}</span>
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {/* Identity Verification Panel */}
            <div className={`rounded-lg p-3 border ${modal.identityVerified ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${modal.identityVerified ? 'text-green-800' : 'text-orange-800'}`}>
                    {modal.identityVerified
                      ? `Identity Verified ✓ — via ${modal.identityVerificationMethod}`
                      : 'Identity NOT Verified — required before completion'}
                  </p>
                  {modal.identityVerifiedAt && (
                    <p className="text-xs text-green-600 mt-0.5">{format(new Date(modal.identityVerifiedAt), 'MMM d, yyyy HH:mm')}</p>
                  )}
                </div>
                {!modal.identityVerified && (
                  <button
                    onClick={() => setShowVerifyPanel(!showVerifyPanel)}
                    className="text-xs text-orange-700 border border-orange-300 px-2 py-1 rounded hover:bg-orange-100"
                  >
                    Verify Now
                  </button>
                )}
              </div>
              {showVerifyPanel && !modal.identityVerified && (
                <div className="mt-3 pt-3 border-t border-orange-200 space-y-2">
                  <select
                    value={verifyMethod}
                    onChange={(e) => setVerifyMethod(e.target.value)}
                    className="w-full border rounded px-3 py-1.5 text-sm"
                  >
                    {VERIFY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <button
                    onClick={() => verifyMutation.mutate({ id: modal.id, method: verifyMethod })}
                    disabled={verifyMutation.isPending}
                    className="w-full py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    {verifyMutation.isPending ? 'Recording…' : 'Record Verification'}
                  </button>
                </div>
              )}
            </div>

            {modal.description && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">User's Description</p>
                <p className="text-sm text-gray-700">{modal.description}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
              {newStatus === 'completed' && !modal.identityVerified && (
                <p className="text-xs text-red-600 mt-1">⚠ Identity must be verified before marking as completed</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (internal)</label>
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} className="input resize-none" placeholder="Internal notes..." />
            </div>

            {(newStatus === 'completed' || newStatus === 'in_progress') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Response to Data Subject</label>
                  <textarea value={responseData} onChange={(e) => setResponseData(e.target.value)} rows={3} className="input resize-none" placeholder="Provide response or data export details..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disclosure Type</label>
                  <select value={disclosureType} onChange={(e) => setDisclosureType(e.target.value)} className="input">
                    <option value="full">Full Disclosure</option>
                    <option value="partial">Partial Disclosure</option>
                    <option value="restricted">Restricted Disclosure</option>
                  </select>
                </div>
                {disclosureType !== 'full' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Restriction Reason *</label>
                    <textarea value={restrictionReason} onChange={(e) => setRestrictionReason(e.target.value)} rows={2} className="input resize-none" placeholder="Legal exemption or reason for restricting disclosure..." />
                  </div>
                )}
              </>
            )}

            {newStatus === 'rejected' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={2} className="input resize-none" placeholder="Explain why this request is being rejected..." />
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={handleProcess} disabled={processMutation.isPending} className="btn-primary flex-1">
                {processMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
