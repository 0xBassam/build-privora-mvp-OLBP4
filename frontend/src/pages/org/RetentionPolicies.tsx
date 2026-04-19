import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface RetentionPolicy {
  id: string;
  name: string;
  dataCategory: string;
  purpose?: string;
  retentionDays: number;
  retentionYears: number;
  warningDays: number;
  action: string;
  isActive: boolean;
  lastRunAt?: string;
  createdAt: string;
}

interface RetentionStatus {
  hasPolicies: boolean;
  activePolicies: number;
  coverageCategories: string[];
  missingCategories: string[];
  lastRunAt?: string;
}

interface RunCheckResult {
  dryRun: boolean;
  summary: {
    total: number;
    policiesChecked: number;
    transactionsScanned: number;
    expiredFound: number;
    actionsQueued: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  pii: 'PII',
  sensitive: 'Sensitive',
  financial: 'Financial',
  biometric: 'Biometric',
  behavioral: 'Behavioral',
  location: 'Location',
  general: 'General',
};

const CATEGORY_STYLES: Record<string, string> = {
  pii: 'bg-blue-100 text-blue-700',
  sensitive: 'bg-red-100 text-red-700',
  financial: 'bg-yellow-100 text-yellow-700',
  biometric: 'bg-purple-100 text-purple-700',
  behavioral: 'bg-orange-100 text-orange-700',
  location: 'bg-teal-100 text-teal-700',
  general: 'bg-gray-100 text-gray-700',
};

const ACTION_LABELS: Record<string, string> = {
  delete: 'Delete',
  anonymize: 'Anonymize',
  alert_only: 'Alert Only',
};

const ACTION_STYLES: Record<string, string> = {
  delete: 'bg-red-100 text-red-700',
  anonymize: 'bg-yellow-100 text-yellow-700',
  alert_only: 'bg-gray-100 text-gray-600',
};

const DATA_CATEGORIES = ['pii', 'sensitive', 'financial', 'biometric', 'behavioral', 'location', 'general'];

const emptyForm = {
  name: '',
  dataCategory: 'pii',
  purpose: '',
  retentionDays: 365,
  warningDays: 30,
  action: 'alert_only',
};

export default function RetentionPolicies() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState<RetentionPolicy | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [runResult, setRunResult] = useState<RunCheckResult | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);

  const { data: policiesData, isLoading } = useQuery({
    queryKey: ['retention-policies'],
    queryFn: () => api.get('/retention/policies').then((r) => r.data.data),
  });

  const { data: statusData } = useQuery({
    queryKey: ['retention-status'],
    queryFn: () => api.get('/retention/status').then((r) => r.data.data),
  });

  const policies: RetentionPolicy[] = policiesData?.policies ?? [];
  const summary = policiesData?.summary;
  const status: RetentionStatus | undefined = statusData;

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/retention/policies', data),
    onSuccess: () => {
      toast.success('Retention policy created');
      qc.invalidateQueries({ queryKey: ['retention-policies'] });
      qc.invalidateQueries({ queryKey: ['retention-status'] });
      setShowForm(false);
      setForm({ ...emptyForm });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create policy');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form & { isActive: boolean }> }) =>
      api.patch(`/retention/policies/${id}`, data),
    onSuccess: () => {
      toast.success('Policy updated');
      qc.invalidateQueries({ queryKey: ['retention-policies'] });
      qc.invalidateQueries({ queryKey: ['retention-status'] });
      setEditPolicy(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Update failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/retention/policies/${id}`),
    onSuccess: () => {
      toast.success('Policy deleted');
      qc.invalidateQueries({ queryKey: ['retention-policies'] });
      qc.invalidateQueries({ queryKey: ['retention-status'] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const runCheckMutation = useMutation({
    mutationFn: (dryRun: boolean) => api.post('/retention/run-check', { dryRun }),
    onSuccess: (res) => {
      setRunResult(res.data.data);
      setShowRunModal(true);
      qc.invalidateQueries({ queryKey: ['retention-policies'] });
    },
    onError: () => toast.error('Retention check failed'),
  });

  const openEdit = (policy: RetentionPolicy) => {
    setEditPolicy(policy);
    setForm({
      name: policy.name,
      dataCategory: policy.dataCategory,
      purpose: policy.purpose ?? '',
      retentionDays: policy.retentionDays,
      warningDays: policy.warningDays,
      action: policy.action,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editPolicy) {
      updateMutation.mutate({ id: editPolicy.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleToggleActive = (policy: RetentionPolicy) => {
    updateMutation.mutate({ id: policy.id, data: { isActive: !policy.isActive } });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retention Policies</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define how long data categories are retained under PDPL Art. 18
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => runCheckMutation.mutate(true)}
            disabled={runCheckMutation.isPending}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {runCheckMutation.isPending ? 'Running...' : 'Dry Run Check'}
          </button>
          <button
            onClick={() => { setEditPolicy(null); setForm({ ...emptyForm }); setShowForm(true); }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Policy
          </button>
        </div>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Active Policies</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{status.activePolicies}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Coverage</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{status.coverageCategories.length} / {DATA_CATEGORIES.length}</p>
          </div>
          <div className={`rounded-xl border p-4 ${status.missingCategories.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs text-amber-600 uppercase tracking-wide">Missing Categories</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{status.missingCategories.length}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Policies</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary?.total ?? 0}</p>
          </div>
        </div>
      )}

      {/* Missing Categories Warning */}
      {status?.missingCategories && status.missingCategories.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-800">Categories without retention policies:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {status.missingCategories.map((cat) => (
              <span key={cat} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full">
                {CATEGORY_LABELS[cat] ?? cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Policy Form */}
      {(showForm || editPolicy) && (
        <div className="mb-6 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editPolicy ? 'Edit Policy' : 'New Retention Policy'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Name *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Health Data Retention"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Category *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dataCategory}
                onChange={(e) => setForm({ ...form, dataCategory: e.target.value })}
              >
                {DATA_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action on Expiry</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
              >
                <option value="alert_only">Alert Only</option>
                <option value="anonymize">Anonymize</option>
                <option value="delete">Delete</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retention Days *</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.retentionDays}
                onChange={(e) => setForm({ ...form, retentionDays: Number(e.target.value) })}
                required
              />
              <p className="text-xs text-gray-400 mt-1">≈ {Math.round(form.retentionDays / 365 * 10) / 10} years</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warning Days Before Expiry</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.warningDays}
                onChange={(e) => setForm({ ...form, warningDays: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose (optional)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. Medical diagnosis and treatment"
              />
            </div>
            <div className="col-span-2 flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditPolicy(null); }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editPolicy ? 'Save Changes' : 'Create Policy'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Policies Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading policies...</div>
        ) : policies.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm">No retention policies defined yet.</p>
            <p className="text-gray-400 text-xs mt-1">Create policies to comply with PDPL Art. 18 data minimization requirements.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Policy</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Retention</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {policies.map((policy) => (
                <tr key={policy.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{policy.name}</p>
                    {policy.purpose && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{policy.purpose}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[policy.dataCategory] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CATEGORY_LABELS[policy.dataCategory] ?? policy.dataCategory}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{policy.retentionDays} days</p>
                    <p className="text-xs text-gray-400">{policy.retentionYears} yrs · warn {policy.warningDays}d</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_STYLES[policy.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ACTION_LABELS[policy.action] ?? policy.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(policy)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${policy.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${policy.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(policy)}
                      className="text-xs text-blue-600 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete policy "${policy.name}"?`)) deleteMutation.mutate(policy.id);
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Run Check Result Modal */}
      {showRunModal && runResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {runResult.dryRun ? 'Dry Run Results' : 'Retention Check Results'}
              </h2>
              {runResult.dryRun && (
                <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">Dry Run</span>
              )}
            </div>
            <div className="space-y-3">
              {[
                { label: 'Policies Checked', value: runResult.summary.policiesChecked },
                { label: 'Transactions Scanned', value: runResult.summary.transactionsScanned },
                { label: 'Expired Records Found', value: runResult.summary.expiredFound },
                { label: 'Actions Queued', value: runResult.summary.actionsQueued },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-semibold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
            {runResult.dryRun && (
              <p className="text-xs text-gray-400 mt-4">No data was modified. This was a preview run.</p>
            )}
            <button
              onClick={() => setShowRunModal(false)}
              className="mt-5 w-full py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
