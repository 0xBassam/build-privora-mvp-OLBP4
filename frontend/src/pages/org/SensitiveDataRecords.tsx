import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface SensitiveDataRecord {
  id: string;
  dataType: string;
  dataTypeDescription: string;
  processingPurpose: string;
  legalBasis: string;
  consentRequestId?: string;
  dpiaRequired: boolean;
  dpiaId?: string;
  dpiaStatus: string;
  safeguards: string;
  accessControls?: string;
  encryptionApplied: boolean;
  pseudonymizationApplied: boolean;
  estimatedRecords?: number;
  status: string;
  reviewDate?: string;
  createdAt: string;
}

interface RiskOverview {
  totalActive: number;
  unprotectedRecords: number;
  dpiaNotStarted: number;
  consentBasedRecords: number;
  riskScore: string;
  byDataType: Record<string, number>;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  health: 'Health',
  biometric: 'Biometric',
  genetic: 'Genetic',
  racial_ethnic: 'Racial / Ethnic',
  religious: 'Religious',
  political: 'Political',
  criminal_records: 'Criminal Records',
  financial: 'Financial',
  minor_data: 'Minor Data',
  other_sensitive: 'Other Sensitive',
};

const DATA_TYPE_STYLES: Record<string, string> = {
  health: 'bg-red-100 text-red-700',
  biometric: 'bg-purple-100 text-purple-700',
  genetic: 'bg-pink-100 text-pink-700',
  racial_ethnic: 'bg-orange-100 text-orange-700',
  religious: 'bg-yellow-100 text-yellow-700',
  political: 'bg-amber-100 text-amber-700',
  criminal_records: 'bg-slate-100 text-slate-700',
  financial: 'bg-blue-100 text-blue-700',
  minor_data: 'bg-teal-100 text-teal-700',
  other_sensitive: 'bg-gray-100 text-gray-600',
};

const LEGAL_BASIS_LABELS: Record<string, string> = {
  explicit_consent: 'Explicit Consent',
  vital_interests: 'Vital Interests',
  legal_obligation: 'Legal Obligation',
  public_interest: 'Public Interest',
  legal_claims: 'Legal Claims',
  medical_treatment: 'Medical Treatment',
};

const DPIA_STATUS_STYLES: Record<string, string> = {
  not_started: 'bg-red-100 text-red-600',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  not_required: 'bg-gray-100 text-gray-500',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  discontinued: 'bg-gray-100 text-gray-500',
};

const DATA_TYPES = [
  'health', 'biometric', 'genetic', 'racial_ethnic', 'religious',
  'political', 'criminal_records', 'financial', 'minor_data', 'other_sensitive',
];
const LEGAL_BASES = [
  'explicit_consent', 'vital_interests', 'legal_obligation',
  'public_interest', 'legal_claims', 'medical_treatment',
];
const DPIA_STATUSES = ['not_started', 'in_progress', 'completed', 'not_required'];
const STATUSES = ['active', 'suspended', 'discontinued'];

const emptyForm = {
  dataType: 'health',
  dataTypeDescription: '',
  processingPurpose: '',
  legalBasis: 'explicit_consent',
  consentRequestId: '',
  safeguards: '',
  accessControls: '',
  encryptionApplied: false,
  pseudonymizationApplied: false,
  estimatedRecords: '',
};

export default function SensitiveDataRecords() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<SensitiveDataRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<SensitiveDataRecord | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const { data: riskData } = useQuery({
    queryKey: ['sensitive-data-risk'],
    queryFn: () => api.get('/sensitive-data/risk-overview').then((r) => r.data.data),
  });

  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['sensitive-data-records', filterStatus, filterType],
    queryFn: () => api.get('/sensitive-data/records', {
      params: {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterType ? { dataType: filterType } : {}),
      },
    }).then((r) => r.data.data),
  });

  const riskOverview: RiskOverview | undefined = riskData;
  const records: SensitiveDataRecord[] = recordsData?.records ?? [];
  const summary = recordsData?.summary;

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/sensitive-data/records', {
      ...data,
      consentRequestId: data.consentRequestId || undefined,
      estimatedRecords: data.estimatedRecords ? Number(data.estimatedRecords) : undefined,
    }),
    onSuccess: () => {
      toast.success('Sensitive data record created. DPIA required.');
      qc.invalidateQueries({ queryKey: ['sensitive-data-records'] });
      qc.invalidateQueries({ queryKey: ['sensitive-data-risk'] });
      setShowForm(false);
      setForm({ ...emptyForm });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create record');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/sensitive-data/records/${id}`, data),
    onSuccess: () => {
      toast.success('Record updated');
      qc.invalidateQueries({ queryKey: ['sensitive-data-records'] });
      qc.invalidateQueries({ queryKey: ['sensitive-data-risk'] });
      setEditRecord(null);
      setShowForm(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Update failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sensitive-data/records/${id}`),
    onSuccess: () => {
      toast.success('Record deleted');
      qc.invalidateQueries({ queryKey: ['sensitive-data-records'] });
      qc.invalidateQueries({ queryKey: ['sensitive-data-risk'] });
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

  const openEdit = (record: SensitiveDataRecord) => {
    setEditRecord(record);
    setForm({
      dataType: record.dataType,
      dataTypeDescription: record.dataTypeDescription,
      processingPurpose: record.processingPurpose,
      legalBasis: record.legalBasis,
      consentRequestId: record.consentRequestId ?? '',
      safeguards: record.safeguards,
      accessControls: record.accessControls ?? '',
      encryptionApplied: record.encryptionApplied,
      pseudonymizationApplied: record.pseudonymizationApplied,
      estimatedRecords: record.estimatedRecords?.toString() ?? '',
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
          consentRequestId: form.consentRequestId || undefined,
          estimatedRecords: form.estimatedRecords ? Number(form.estimatedRecords) : undefined,
        },
      });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDpiaStatusChange = (record: SensitiveDataRecord, dpiaStatus: string) => {
    updateMutation.mutate({ id: record.id, data: { dpiaStatus } });
  };

  const handleStatusChange = (record: SensitiveDataRecord, status: string) => {
    updateMutation.mutate({ id: record.id, data: { status } });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sensitive Data Classification</h1>
          <p className="text-sm text-gray-500 mt-1">
            PDPL Art. 23 — Heightened protections for sensitive personal data categories
          </p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Register Sensitive Data
        </button>
      </div>

      {/* Risk overview */}
      {riskOverview && (
        <div className={`mb-6 rounded-xl border p-4 ${riskOverview.riskScore === 'high' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-start gap-3">
            <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${riskOverview.riskScore === 'high' ? 'text-red-500' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {riskOverview.riskScore === 'high'
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              }
            </svg>
            <div className="flex-1">
              <p className={`text-sm font-medium ${riskOverview.riskScore === 'high' ? 'text-red-800' : 'text-green-800'}`}>
                {riskOverview.riskScore === 'high'
                  ? `Compliance gap: ${riskOverview.unprotectedRecords} records unprotected, ${riskOverview.dpiaNotStarted} DPIAs not started`
                  : 'All sensitive data records are protected and DPIA-compliant'}
              </p>
              <div className="flex gap-4 mt-2 text-xs text-gray-600">
                <span>{riskOverview.totalActive} active records</span>
                <span>{riskOverview.unprotectedRecords} without encryption/pseudonymization</span>
                <span>{riskOverview.dpiaNotStarted} pending DPIA</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Records', value: summary.total },
            { label: 'Active', value: summary.active },
            { label: 'Encrypted', value: summary.withEncryption ?? 0 },
            { label: 'DPIA Pending', value: summary.dpiaNotStarted ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {['', ...STATUSES].map((s) => (
            <button
              key={s || 'all-status'}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors capitalize ${
                filterStatus === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s || 'All Status'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {['', ...DATA_TYPES].map((t) => (
            <button
              key={t || 'all-type'}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                filterType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t ? DATA_TYPE_LABELS[t] : 'All Types'}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {editRecord ? 'Edit Sensitive Data Record' : 'Register Sensitive Data Processing'}
              </h2>
              <p className="text-xs text-red-600 mt-0.5">Requires stricter legal basis under PDPL Art. 23</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Type *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dataType}
                onChange={(e) => setForm({ ...form, dataType: e.target.value })}
                disabled={!!editRecord}
              >
                {DATA_TYPES.map((t) => (
                  <option key={t} value={t}>{DATA_TYPE_LABELS[t]}</option>
                ))}
              </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Type Description *</label>
              <textarea
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dataTypeDescription}
                onChange={(e) => setForm({ ...form, dataTypeDescription: e.target.value })}
                placeholder="Specific description of what sensitive data is processed"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Processing Purpose *</label>
              <textarea
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.processingPurpose}
                onChange={(e) => setForm({ ...form, processingPurpose: e.target.value })}
                placeholder="Specific purpose for processing this sensitive data"
                required
              />
            </div>
            {form.legalBasis === 'explicit_consent' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consent Request ID *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.consentRequestId}
                  onChange={(e) => setForm({ ...form, consentRequestId: e.target.value })}
                  placeholder="UUID of the consent request"
                  required={form.legalBasis === 'explicit_consent'}
                />
              </div>
            )}
            <div className={form.legalBasis === 'explicit_consent' ? '' : 'col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Records</label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.estimatedRecords}
                onChange={(e) => setForm({ ...form, estimatedRecords: e.target.value })}
                placeholder="e.g. 1000"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Safeguards *</label>
              <textarea
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.safeguards}
                onChange={(e) => setForm({ ...form, safeguards: e.target.value })}
                placeholder="Technical and organizational safeguards protecting this data"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Controls</label>
              <textarea
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.accessControls}
                onChange={(e) => setForm({ ...form, accessControls: e.target.value })}
                placeholder="Who has access and how access is restricted"
              />
            </div>
            <div className="col-span-2 flex items-center gap-6 py-1">
              {[
                { key: 'encryptionApplied' as const, label: 'Encryption Applied' },
                { key: 'pseudonymizationApplied' as const, label: 'Pseudonymization Applied' },
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
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {editRecord ? 'Save Changes' : 'Register Sensitive Data'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm">No sensitive data records registered.</p>
            <p className="text-gray-400 text-xs mt-1">
              Register all sensitive data processing under PDPL Art. 23 to maintain compliance.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Legal Basis</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Protections</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">DPIA</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DATA_TYPE_STYLES[record.dataType] ?? 'bg-gray-100 text-gray-600'}`}>
                      {DATA_TYPE_LABELS[record.dataType] ?? record.dataType}
                    </span>
                    {record.estimatedRecords && (
                      <p className="text-xs text-gray-400 mt-0.5">{record.estimatedRecords.toLocaleString()} records</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-700">{LEGAL_BASIS_LABELS[record.legalBasis] ?? record.legalBasis}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <span className={`px-1.5 py-0.5 text-xs rounded ${record.encryptionApplied ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {record.encryptionApplied ? 'Encrypted' : 'No Encryption'}
                      </span>
                      {record.pseudonymizationApplied && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">Pseudonymized</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={record.dpiaStatus}
                      onChange={(e) => handleDpiaStatusChange(record, e.target.value)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${DPIA_STATUS_STYLES[record.dpiaStatus] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {DPIA_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={record.status}
                      onChange={(e) => handleStatusChange(record, e.target.value)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${STATUS_STYLES[record.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setViewRecord(record)} className="text-xs text-blue-600 hover:underline mr-2">View</button>
                    <button onClick={() => openEdit(record)} className="text-xs text-blue-600 hover:underline mr-2">Edit</button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${DATA_TYPE_LABELS[record.dataType]} record?`)) deleteMutation.mutate(record.id);
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DATA_TYPE_STYLES[viewRecord.dataType]}`}>
                  {DATA_TYPE_LABELS[viewRecord.dataType]}
                </span>
                <h2 className="text-base font-semibold text-gray-900 mt-2">{viewRecord.dataTypeDescription}</h2>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ml-3 flex-shrink-0 ${STATUS_STYLES[viewRecord.status]}`}>
                {viewRecord.status}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Processing Purpose', value: viewRecord.processingPurpose },
                { label: 'Legal Basis (Art. 23)', value: LEGAL_BASIS_LABELS[viewRecord.legalBasis] ?? viewRecord.legalBasis },
                { label: 'Safeguards', value: viewRecord.safeguards },
                { label: 'Access Controls', value: viewRecord.accessControls || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-gray-800">{value}</p>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${viewRecord.encryptionApplied ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {viewRecord.encryptionApplied ? 'Encrypted' : 'Not Encrypted'}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${viewRecord.pseudonymizationApplied ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {viewRecord.pseudonymizationApplied ? 'Pseudonymized' : 'No Pseudonymization'}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${DPIA_STATUS_STYLES[viewRecord.dpiaStatus]}`}>
                  DPIA: {viewRecord.dpiaStatus.replace('_', ' ')}
                </span>
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
