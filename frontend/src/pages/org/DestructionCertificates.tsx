import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Certificate {
  id: string;
  certificateNumber: string;
  dataCategory: string;
  dataDescription: string;
  recordCount?: number;
  destructionMethod: string;
  destructionScope: string;
  destructedAt: string;
  destructionTrigger: string;
  verificationHash: string;
  verifiedAt?: string;
  legalBasisForDestruction?: string;
  notes?: string;
  createdAt: string;
}

interface Summary {
  total: number;
  byMethod: Record<string, number>;
  byTrigger: Record<string, number>;
  verified: number;
  totalRecordsDestroyed: number;
}

const METHOD_LABELS: Record<string, string> = {
  deletion: 'Deletion',
  anonymization: 'Anonymization',
  pseudonymization: 'Pseudonymization',
  physical_destruction: 'Physical Destruction',
  cryptographic_erasure: 'Cryptographic Erasure',
};

const TRIGGER_LABELS: Record<string, string> = {
  retention_expiry: 'Retention Expiry',
  user_request: 'User Request',
  dsar_deletion: 'DSAR Deletion',
  manual: 'Manual',
  legal_requirement: 'Legal Requirement',
};

const METHOD_COLORS: Record<string, string> = {
  deletion: 'bg-red-100 text-red-800',
  anonymization: 'bg-blue-100 text-blue-800',
  pseudonymization: 'bg-purple-100 text-purple-800',
  physical_destruction: 'bg-gray-100 text-gray-800',
  cryptographic_erasure: 'bg-orange-100 text-orange-800',
};

export default function DestructionCertificates() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [filterMethod, setFilterMethod] = useState('');
  const [filterTrigger, setFilterTrigger] = useState('');

  const [form, setForm] = useState({
    dataCategory: '',
    dataDescription: '',
    recordCount: '',
    destructionMethod: 'deletion',
    destructionScope: '',
    destructedAt: '',
    destructionTrigger: 'manual',
    legalBasisForDestruction: '',
    notes: '',
  });

  // ── Fetch certificates ─────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['destruction-certificates', filterMethod, filterTrigger],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterMethod) params.set('destructionMethod', filterMethod);
      if (filterTrigger) params.set('destructionTrigger', filterTrigger);
      const res = await api.get(`/destruction/certificates?${params}`);
      return res.data.data as { certificates: Certificate[]; summary: Summary };
    },
  });

  const certificates = data?.certificates ?? [];
  const summary = data?.summary ?? { total: 0, verified: 0, totalRecordsDestroyed: 0, byMethod: {}, byTrigger: {} };

  // ── Create certificate ─────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      api.post('/destruction/certificates', {
        ...payload,
        recordCount: payload.recordCount ? Number(payload.recordCount) : undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['destruction-certificates'] });
      setShowCreate(false);
      toast.success(`Certificate ${res.data.data?.certificate?.certificateNumber} issued`);
      setForm({
        dataCategory: '', dataDescription: '', recordCount: '',
        destructionMethod: 'deletion', destructionScope: '', destructedAt: '',
        destructionTrigger: 'manual', legalBasisForDestruction: '', notes: '',
      });
    },
    onError: () => toast.error('Failed to issue certificate'),
  });

  // ── Verify certificate ─────────────────────────────────────────────────────
  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/destruction/certificates/${id}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destruction-certificates'] });
      setSelectedCert(null);
      toast.success('Certificate verified');
    },
    onError: () => toast.error('Verification failed'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Destruction Certificates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tamper-proof proof of data deletion and anonymization — PDPL Art. 18
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Issue Certificate
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Certificates', value: summary.total },
          { label: 'Verified', value: summary.verified },
          { label: 'Records Destroyed', value: summary.totalRecordsDestroyed.toLocaleString() },
          { label: 'Unverified', value: summary.total - summary.verified },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2"
        >
          <option value="">All Methods</option>
          {Object.entries(METHOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterTrigger}
          onChange={(e) => setFilterTrigger(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2"
        >
          <option value="">All Triggers</option>
          {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Certificates table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : certificates.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No destruction certificates found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Certificate #</th>
                <th className="px-4 py-3 text-left">Data Category</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Trigger</th>
                <th className="px-4 py-3 text-left">Records</th>
                <th className="px-4 py-3 text-left">Destroyed At</th>
                <th className="px-4 py-3 text-left">Verified</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {certificates.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-800">{c.certificateNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.dataCategory}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${METHOD_COLORS[c.destructionMethod] || 'bg-gray-100 text-gray-700'}`}>
                      {METHOD_LABELS[c.destructionMethod] || c.destructionMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {TRIGGER_LABELS[c.destructionTrigger] || c.destructionTrigger}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.recordCount != null ? c.recordCount.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(c.destructedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {c.verifiedAt ? (
                      <span className="text-green-600 font-medium text-xs">Verified</span>
                    ) : (
                      <span className="text-orange-500 text-xs">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedCert(c)}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Issue Destruction Certificate</h2>
              <p className="text-sm text-gray-500 mt-1">Certificate number and SHA-256 hash generated automatically</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Category *</label>
                <input
                  type="text"
                  value={form.dataCategory}
                  onChange={(e) => setForm({ ...form, dataCategory: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. health_data, financial, pii"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={form.dataDescription}
                  onChange={(e) => setForm({ ...form, dataDescription: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Describe the specific data set destroyed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destruction Method *</label>
                  <select
                    value={form.destructionMethod}
                    onChange={(e) => setForm({ ...form, destructionMethod: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trigger *</label>
                  <select
                    value={form.destructionTrigger}
                    onChange={(e) => setForm({ ...form, destructionTrigger: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destruction Scope *</label>
                <textarea
                  value={form.destructionScope}
                  onChange={(e) => setForm({ ...form, destructionScope: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Systems, databases, backups covered"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Record Count</label>
                  <input
                    type="number"
                    value={form.recordCount}
                    onChange={(e) => setForm({ ...form, recordCount: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destroyed At</label>
                  <input
                    type="datetime-local"
                    value={form.destructedAt}
                    onChange={(e) => setForm({ ...form, destructedAt: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Basis</label>
                <input
                  type="text"
                  value={form.legalBasisForDestruction}
                  onChange={(e) => setForm({ ...form, legalBasisForDestruction: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="PDPL Art. 18 — retention period expired"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.dataCategory || !form.dataDescription || !form.destructionScope}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Issuing…' : 'Issue Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold font-mono">{selectedCert.certificateNumber}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${METHOD_COLORS[selectedCert.destructionMethod] || 'bg-gray-100 text-gray-700'}`}>
                    {METHOD_LABELS[selectedCert.destructionMethod]}
                  </span>
                  {selectedCert.verifiedAt ? (
                    <span className="text-xs text-green-700 font-medium">Verified</span>
                  ) : (
                    <span className="text-xs text-orange-600">Awaiting Verification</span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedCert(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Category:</span> <span className="font-medium">{selectedCert.dataCategory}</span></div>
                <div><span className="text-gray-500">Trigger:</span> <span className="font-medium">{TRIGGER_LABELS[selectedCert.destructionTrigger]}</span></div>
                <div><span className="text-gray-500">Records:</span> <span className="font-medium">{selectedCert.recordCount?.toLocaleString() ?? '—'}</span></div>
                <div><span className="text-gray-500">Destroyed:</span> <span className="font-medium">{new Date(selectedCert.destructedAt).toLocaleString()}</span></div>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Description:</span>
                <p className="text-gray-800">{selectedCert.dataDescription}</p>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Scope:</span>
                <p className="text-gray-800">{selectedCert.destructionScope}</p>
              </div>
              {selectedCert.legalBasisForDestruction && (
                <div>
                  <span className="text-gray-500 block mb-1">Legal Basis:</span>
                  <p className="text-gray-700 italic">{selectedCert.legalBasisForDestruction}</p>
                </div>
              )}
              {/* Integrity hash */}
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 text-xs block mb-1">SHA-256 Verification Hash</span>
                <code className="text-xs text-gray-700 break-all">{selectedCert.verificationHash}</code>
              </div>
              {!selectedCert.verifiedAt && (
                <button
                  onClick={() => verifyMutation.mutate(selectedCert.id)}
                  disabled={verifyMutation.isPending}
                  className="w-full py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {verifyMutation.isPending ? 'Verifying…' : 'Mark as Verified'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
