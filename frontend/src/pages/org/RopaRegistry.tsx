import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface RopaRecord {
  id: string;
  activityName: string;
  activityDescription: string;
  department?: string;
  processingPurpose: string;
  legalBasis: string;
  dataCategories: string[];
  isSensitiveData: boolean;
  dataSubjectCategories: string[];
  estimatedDataSubjects?: number;
  recipientCategories: string[];
  thirdPartyTransfers: boolean;
  crossBorderTransfers: boolean;
  transferSafeguards?: string;
  retentionPeriod?: string;
  securityMeasures?: string;
  dpiaRequired: boolean;
  dpiaId?: string;
  status: string;
  ownerRole: string;
  ownerName?: string;
  createdAt: string;
}

interface RopaStats {
  total: number;
  active: number;
  draft: number;
  underReview: number;
  withSensitiveData: number;
  withCrossBorderTransfers: number;
  dpiaRequired: number;
  dpiaCompleted: number;
  byLegalBasis: Record<string, number>;
}

const LEGAL_BASIS_LABELS: Record<string, string> = {
  consent: 'Consent',
  contract: 'Contract',
  legal_obligation: 'Legal Obligation',
  vital_interests: 'Vital Interests',
  public_task: 'Public Task',
  legitimate_interests: 'Legitimate Interests',
};

const LEGAL_BASIS_STYLES: Record<string, string> = {
  consent: 'bg-blue-100 text-blue-700',
  contract: 'bg-purple-100 text-purple-700',
  legal_obligation: 'bg-orange-100 text-orange-700',
  vital_interests: 'bg-red-100 text-red-700',
  public_task: 'bg-teal-100 text-teal-700',
  legitimate_interests: 'bg-green-100 text-green-700',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-slate-100 text-slate-500',
};

const LEGAL_BASES = ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'];
const OWNER_ROLES = ['dpo', 'it_admin', 'org_admin', 'legal'];
const STATUSES = ['draft', 'active', 'under_review', 'archived'];

const emptyForm = {
  activityName: '',
  activityDescription: '',
  department: '',
  processingPurpose: '',
  legalBasis: 'consent',
  dataCategories: '',
  isSensitiveData: false,
  dataSubjectCategories: '',
  estimatedDataSubjects: '',
  thirdPartyTransfers: false,
  crossBorderTransfers: false,
  transferSafeguards: '',
  retentionPeriod: '',
  securityMeasures: '',
  dpiaRequired: false,
  ownerRole: 'org_admin',
  ownerName: '',
};

export default function RopaRegistry() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<RopaRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<RopaRecord | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterStatus, setFilterStatus] = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['ropa-stats'],
    queryFn: () => api.get('/ropa/stats').then((r) => r.data.data),
  });

  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['ropa-records', filterStatus],
    queryFn: () => api.get('/ropa/records', { params: filterStatus ? { status: filterStatus } : {} }).then((r) => r.data.data),
  });

  const stats: RopaStats | undefined = statsData;
  const records: RopaRecord[] = recordsData?.records ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/ropa/records', {
      ...data,
      dataCategories: data.dataCategories ? data.dataCategories.split(',').map((s) => s.trim()).filter(Boolean) : [],
      dataSubjectCategories: data.dataSubjectCategories ? data.dataSubjectCategories.split(',').map((s) => s.trim()).filter(Boolean) : [],
      estimatedDataSubjects: data.estimatedDataSubjects ? Number(data.estimatedDataSubjects) : undefined,
    }),
    onSuccess: () => {
      toast.success('RoPA record created');
      qc.invalidateQueries({ queryKey: ['ropa-records'] });
      qc.invalidateQueries({ queryKey: ['ropa-stats'] });
      setShowForm(false);
      setForm({ ...emptyForm });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create record');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form & { status: string }> }) =>
      api.patch(`/ropa/records/${id}`, data),
    onSuccess: () => {
      toast.success('Record updated');
      qc.invalidateQueries({ queryKey: ['ropa-records'] });
      qc.invalidateQueries({ queryKey: ['ropa-stats'] });
      setEditRecord(null);
      setShowForm(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Update failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ropa/records/${id}`),
    onSuccess: () => {
      toast.success('Record deleted');
      qc.invalidateQueries({ queryKey: ['ropa-records'] });
      qc.invalidateQueries({ queryKey: ['ropa-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Delete failed');
    },
  });

  const openCreate = () => {
    setEditRecord(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const openEdit = (record: RopaRecord) => {
    setEditRecord(record);
    setForm({
      activityName: record.activityName,
      activityDescription: record.activityDescription,
      department: record.department ?? '',
      processingPurpose: record.processingPurpose,
      legalBasis: record.legalBasis,
      dataCategories: record.dataCategories.join(', '),
      isSensitiveData: record.isSensitiveData,
      dataSubjectCategories: record.dataSubjectCategories.join(', '),
      estimatedDataSubjects: record.estimatedDataSubjects?.toString() ?? '',
      thirdPartyTransfers: record.thirdPartyTransfers,
      crossBorderTransfers: record.crossBorderTransfers,
      transferSafeguards: record.transferSafeguards ?? '',
      retentionPeriod: record.retentionPeriod ?? '',
      securityMeasures: record.securityMeasures ?? '',
      dpiaRequired: record.dpiaRequired,
      ownerRole: record.ownerRole,
      ownerName: record.ownerName ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editRecord) {
      updateMutation.mutate({
        id: editRecord.id,
        data: {
          ...form,
          dataCategories: form.dataCategories,
          dataSubjectCategories: form.dataSubjectCategories,
          estimatedDataSubjects: form.estimatedDataSubjects,
        } as Partial<typeof form & { status: string }>,
      });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleStatusChange = (record: RopaRecord, status: string) => {
    updateMutation.mutate({ id: record.id, data: { status } });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RoPA Registry</h1>
          <p className="text-sm text-gray-500 mt-1">
            Records of Processing Activities — PDPL Art. 12 &amp; 28 mandatory register
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Activity
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Records', value: stats.total, color: 'text-gray-900' },
            { label: 'Active', value: stats.active, color: 'text-green-700' },
            { label: 'Sensitive Data', value: stats.withSensitiveData, color: 'text-red-700' },
            { label: 'DPIA Required', value: stats.dpiaRequired, color: 'text-orange-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* DPIA gap alert */}
      {stats && stats.dpiaRequired > stats.dpiaCompleted && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">
              {stats.dpiaRequired - stats.dpiaCompleted} processing activities require a DPIA that hasn't been completed.
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Go to DPIA Management to complete outstanding assessments.</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', ...STATUSES].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors capitalize ${
              filterStatus === s
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editRecord ? 'Edit Processing Activity' : 'Register New Processing Activity'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.activityName}
                onChange={(e) => setForm({ ...form, activityName: e.target.value })}
                placeholder="e.g. Customer Onboarding Data Collection"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.activityDescription}
                onChange={(e) => setForm({ ...form, activityDescription: e.target.value })}
                placeholder="Describe what processing takes place"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. HR, Finance, IT"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Legal Basis *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.legalBasis}
                onChange={(e) => setForm({ ...form, legalBasis: e.target.value })}
              >
                {LEGAL_BASES.map((b) => (
                  <option key={b} value={b}>{LEGAL_BASIS_LABELS[b]}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Processing Purpose *</label>
              <textarea
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.processingPurpose}
                onChange={(e) => setForm({ ...form, processingPurpose: e.target.value })}
                placeholder="Specific, explicit, legitimate purpose"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Categories (comma-separated)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dataCategories}
                onChange={(e) => setForm({ ...form, dataCategories: e.target.value })}
                placeholder="name, email, health_data"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Subject Categories (comma-separated)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dataSubjectCategories}
                onChange={(e) => setForm({ ...form, dataSubjectCategories: e.target.value })}
                placeholder="customers, employees, minors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Data Subjects</label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.estimatedDataSubjects}
                onChange={(e) => setForm({ ...form, estimatedDataSubjects: e.target.value })}
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retention Period</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.retentionPeriod}
                onChange={(e) => setForm({ ...form, retentionPeriod: e.target.value })}
                placeholder="e.g. 5 years after contract end"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Role</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.ownerRole}
                onChange={(e) => setForm({ ...form, ownerRole: e.target.value })}
              >
                {OWNER_ROLES.map((r) => (
                  <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                placeholder="Responsible person's name"
              />
            </div>
            <div className="col-span-2 flex items-center gap-6 py-1">
              {[
                { key: 'isSensitiveData' as const, label: 'Contains Sensitive Data (PDPL Art. 23)' },
                { key: 'thirdPartyTransfers' as const, label: 'Third-Party Transfers' },
                { key: 'crossBorderTransfers' as const, label: 'Cross-Border Transfers' },
                { key: 'dpiaRequired' as const, label: 'DPIA Required' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600"
                    checked={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            {form.crossBorderTransfers && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Safeguards (PDPL Art. 29)</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.transferSafeguards}
                  onChange={(e) => setForm({ ...form, transferSafeguards: e.target.value })}
                  placeholder="Describe safeguards for cross-border transfer"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Security Measures</label>
              <textarea
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.securityMeasures}
                onChange={(e) => setForm({ ...form, securityMeasures: e.target.value })}
                placeholder="Technical and organizational security measures in place"
              />
            </div>
            <div className="col-span-2 flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditRecord(null); }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editRecord ? 'Save Changes' : 'Register Activity'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm">No processing activities registered yet.</p>
            <p className="text-gray-400 text-xs mt-1">PDPL Art. 12 requires all processing activities to be registered before they begin.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Activity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Legal Basis</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Flags</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-gray-900 truncate">{record.activityName}</p>
                    {record.department && <p className="text-xs text-gray-400 mt-0.5">{record.department}</p>}
                    {record.estimatedDataSubjects && (
                      <p className="text-xs text-gray-400">{record.estimatedDataSubjects.toLocaleString()} subjects</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEGAL_BASIS_STYLES[record.legalBasis] ?? 'bg-gray-100 text-gray-600'}`}>
                      {LEGAL_BASIS_LABELS[record.legalBasis] ?? record.legalBasis}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {record.isSensitiveData && (
                        <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">Sensitive</span>
                      )}
                      {record.crossBorderTransfers && (
                        <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-600 rounded">Cross-Border</span>
                      )}
                      {record.dpiaRequired && !record.dpiaId && (
                        <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-600 rounded">DPIA Needed</span>
                      )}
                      {record.dpiaId && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-600 rounded">DPIA Done</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={record.status}
                      onChange={(e) => handleStatusChange(record, e.target.value)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${STATUS_STYLES[record.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setViewRecord(record)}
                      className="text-xs text-blue-600 hover:underline mr-2"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEdit(record)}
                      className="text-xs text-blue-600 hover:underline mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${record.activityName}"?`)) deleteMutation.mutate(record.id);
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

      {/* Detail Modal */}
      {viewRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{viewRecord.activityName}</h2>
                {viewRecord.department && <p className="text-sm text-gray-500">{viewRecord.department}</p>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[viewRecord.status]}`}>
                {viewRecord.status.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-4 text-sm">
              {[
                { label: 'Description', value: viewRecord.activityDescription },
                { label: 'Processing Purpose', value: viewRecord.processingPurpose },
                { label: 'Legal Basis', value: LEGAL_BASIS_LABELS[viewRecord.legalBasis] ?? viewRecord.legalBasis },
                { label: 'Data Categories', value: viewRecord.dataCategories.join(', ') || '—' },
                { label: 'Data Subject Categories', value: viewRecord.dataSubjectCategories.join(', ') || '—' },
                { label: 'Retention Period', value: viewRecord.retentionPeriod || '—' },
                { label: 'Security Measures', value: viewRecord.securityMeasures || '—' },
                { label: 'Owner Role', value: viewRecord.ownerRole.replace('_', ' ').toUpperCase() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-gray-800">{value}</p>
                </div>
              ))}
              <div className="flex flex-wrap gap-3 pt-2">
                {viewRecord.isSensitiveData && <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Contains Sensitive Data</span>}
                {viewRecord.crossBorderTransfers && <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">Cross-Border Transfers</span>}
                {viewRecord.thirdPartyTransfers && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Third-Party Transfers</span>}
                {viewRecord.dpiaRequired && <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">DPIA Required</span>}
              </div>
            </div>
            <button
              onClick={() => setViewRecord(null)}
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
