import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface DisclosureRecord {
  id: string;
  disclosingEntity: string;
  receivingEntity: string;
  receivingEntityType: string;
  purpose: string;
  purposeCategory: string;
  dataCategories: string[];
  dataFields: string[];
  legalBasis: string;
  art16ClearanceResult: 'approved' | 'blocked' | 'not_evaluated';
  art16Violations: { ruleId: string; reason: string; severity: string }[];
  isCrossBorder: boolean;
  destinationCountry?: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
}

interface Art16Result {
  allowed: boolean;
  decision: string;
  violations: { ruleId: string; reason: string; severity: string; requiredAction?: string }[];
  warnings: { ruleId: string; warning: string }[];
  recommendation?: string;
}

const PURPOSE_CATEGORIES = [
  'analytics', 'marketing', 'research', 'service_delivery',
  'legal_compliance', 'fraud_prevention', 'security', 'other',
];

const LEGAL_BASES = [
  'consent', 'contract', 'legal_obligation', 'vital_interests',
  'public_task', 'legitimate_interests', 'explicit_consent',
];

const CLEARANCE_STYLES: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
  not_evaluated: 'bg-gray-100 text-gray-600',
};

export default function DisclosureRegister() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showValidator, setShowValidator] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DisclosureRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClearance, setFilterClearance] = useState('');
  const [validateForm, setValidateForm] = useState({
    dataTypes: '', legalBasis: '', purpose: '', purposeCategory: '',
    crossBorderTransfer: false, transferSafeguards: '', destinationCountry: '',
  });
  const [validationResult, setValidationResult] = useState<Art16Result | null>(null);

  const [form, setForm] = useState({
    disclosingEntity: '', receivingEntity: '', receivingEntityType: 'organization',
    purpose: '', purposeCategory: 'other', dataCategories: '', dataFields: '',
    legalBasis: 'consent', consentReference: '', isCrossBorder: false,
    destinationCountry: '', transferSafeguards: '', retentionPeriod: '', expiresAt: '',
  });

  // ── Fetch records ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['disclosure-records', filterStatus, filterClearance],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterClearance) params.set('art16ClearanceResult', filterClearance);
      const res = await api.get(`/disclosure/records?${params}`);
      return res.data.data as { records: DisclosureRecord[]; summary: Record<string, number> };
    },
  });

  const records = data?.records ?? [];
  const summary = data?.summary ?? {};

  // ── Create record ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      api.post('/disclosure/records', {
        ...payload,
        dataCategories: payload.dataCategories.split(',').map((s) => s.trim()).filter(Boolean),
        dataFields: payload.dataFields.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['disclosure-records'] });
      setShowCreate(false);
      const art16 = res.data.data?.art16Result;
      if (art16?.allowed) {
        toast.success('Disclosure record created — Art. 16: APPROVED');
      } else {
        toast.error(`Disclosure record created — Art. 16: BLOCKED (${art16?.violations?.length} violation(s))`);
      }
    },
    onError: () => toast.error('Failed to create disclosure record'),
  });

  // ── Revoke record ──────────────────────────────────────────────────────────
  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/disclosure/records/${id}/revoke`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disclosure-records'] });
      setSelectedRecord(null);
      toast.success('Disclosure record revoked');
    },
    onError: () => toast.error('Failed to revoke record'),
  });

  // ── Standalone Art. 16 validator ──────────────────────────────────────────
  const validateMutation = useMutation({
    mutationFn: () =>
      api.post('/disclosure/validate-art16', {
        ...validateForm,
        dataTypes: validateForm.dataTypes.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: (res) => setValidationResult(res.data.data),
    onError: () => toast.error('Validation failed'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disclosure Register</h1>
          <p className="text-sm text-gray-500 mt-1">
            Central register of all data disclosure activities — Art. 16 clearance required before sharing
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowValidator(true)}
            className="px-4 py-2 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
          >
            Validate Art. 16
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + New Record
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: summary.total ?? 0, color: 'text-gray-900' },
          { label: 'Art. 16 Approved', value: summary.approved ?? 0, color: 'text-green-700' },
          { label: 'Art. 16 Blocked', value: summary.blocked ?? 0, color: 'text-red-700' },
          { label: 'Cross-Border', value: summary.crossBorder ?? 0, color: 'text-orange-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="executed">Executed</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
        <select
          value={filterClearance}
          onChange={(e) => setFilterClearance(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2"
        >
          <option value="">All Clearances</option>
          <option value="approved">Approved</option>
          <option value="blocked">Blocked</option>
          <option value="not_evaluated">Not Evaluated</option>
        </select>
      </div>

      {/* Records table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No disclosure records found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Disclosing → Receiving</th>
                <th className="px-4 py-3 text-left">Purpose</th>
                <th className="px-4 py-3 text-left">Art. 16</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Cross-Border</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.disclosingEntity}</div>
                    <div className="text-gray-500 text-xs">→ {r.receivingEntity}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800">{r.purpose}</div>
                    <div className="text-gray-400 text-xs">{r.purposeCategory}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${CLEARANCE_STYLES[r.art16ClearanceResult]}`}>
                      {r.art16ClearanceResult === 'approved' ? 'APPROVED' : r.art16ClearanceResult === 'blocked' ? 'BLOCKED' : 'NOT EVALUATED'}
                    </span>
                    {r.art16Violations?.length > 0 && (
                      <div className="text-xs text-red-600 mt-1">{r.art16Violations.length} violation(s)</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-gray-700">{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.isCrossBorder ? (
                      <span className="text-orange-600 font-medium">Yes {r.destinationCountry ? `(${r.destinationCountry})` : ''}</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedRecord(r)}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">New Disclosure Record</h2>
              <p className="text-sm text-gray-500 mt-1">Art. 16 validation runs automatically on creation</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disclosing Entity *</label>
                  <input
                    type="text"
                    value={form.disclosingEntity}
                    onChange={(e) => setForm({ ...form, disclosingEntity: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Your organization"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receiving Entity *</label>
                  <input
                    type="text"
                    value={form.receivingEntity}
                    onChange={(e) => setForm({ ...form, receivingEntity: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Third party or partner"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
                  <input
                    type="text"
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose Category</label>
                  <select
                    value={form.purposeCategory}
                    onChange={(e) => setForm({ ...form, purposeCategory: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {PURPOSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fields (comma-sep)</label>
                  <input
                    type="text"
                    value={form.dataFields}
                    onChange={(e) => setForm({ ...form, dataFields: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="name, email, health_data"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Legal Basis *</label>
                  <select
                    value={form.legalBasis}
                    onChange={(e) => setForm({ ...form, legalBasis: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {LEGAL_BASES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isCrossBorder"
                  checked={form.isCrossBorder}
                  onChange={(e) => setForm({ ...form, isCrossBorder: e.target.checked })}
                />
                <label htmlFor="isCrossBorder" className="text-sm font-medium text-gray-700">Cross-Border Transfer</label>
              </div>
              {form.isCrossBorder && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination Country</label>
                    <input
                      type="text"
                      value={form.destinationCountry}
                      onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Safeguards</label>
                    <input
                      type="text"
                      value={form.transferSafeguards}
                      onChange={(e) => setForm({ ...form, transferSafeguards: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="SCCs, Adequacy decision…"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.disclosingEntity || !form.receivingEntity || !form.purpose}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating…' : 'Create & Validate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedRecord.disclosingEntity} → {selectedRecord.receivingEntity}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${CLEARANCE_STYLES[selectedRecord.art16ClearanceResult]}`}>
                    Art. 16: {selectedRecord.art16ClearanceResult.toUpperCase().replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{selectedRecord.status}</span>
                </div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-500">Purpose:</span> <span className="font-medium">{selectedRecord.purpose}</span></div>
                <div><span className="text-gray-500">Category:</span> <span className="font-medium">{selectedRecord.purposeCategory}</span></div>
                <div><span className="text-gray-500">Legal Basis:</span> <span className="font-medium">{selectedRecord.legalBasis}</span></div>
                <div><span className="text-gray-500">Cross-Border:</span> <span className="font-medium">{selectedRecord.isCrossBorder ? `Yes — ${selectedRecord.destinationCountry || 'unknown'}` : 'No'}</span></div>
              </div>
              {selectedRecord.dataFields?.length > 0 && (
                <div>
                  <span className="text-gray-500 block mb-1">Data Fields:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedRecord.dataFields.map((f) => (
                      <span key={f} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {selectedRecord.art16Violations?.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="text-red-800 font-medium mb-2">Art. 16 Violations</h3>
                  {selectedRecord.art16Violations.map((v, i) => (
                    <div key={i} className="text-red-700 text-xs mb-1">• {v.reason}</div>
                  ))}
                </div>
              )}
              {selectedRecord.status !== 'revoked' && (
                <button
                  onClick={() => {
                    const reason = prompt('Revocation reason (optional):') ?? '';
                    revokeMutation.mutate({ id: selectedRecord.id, reason });
                  }}
                  className="w-full py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Revoke Record
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Art. 16 Standalone Validator Modal */}
      {showValidator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">Art. 16 Pre-Check Validator</h2>
              <p className="text-sm text-gray-500 mt-1">Validate compliance before creating a disclosure record</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Types (comma-sep)</label>
                <input
                  type="text"
                  value={validateForm.dataTypes}
                  onChange={(e) => setValidateForm({ ...validateForm, dataTypes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="health_data, biometric, name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Legal Basis</label>
                  <select
                    value={validateForm.legalBasis}
                    onChange={(e) => setValidateForm({ ...validateForm, legalBasis: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {LEGAL_BASES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purpose Category</label>
                  <select
                    value={validateForm.purposeCategory}
                    onChange={(e) => setValidateForm({ ...validateForm, purposeCategory: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select…</option>
                    {PURPOSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="val-cross"
                  checked={validateForm.crossBorderTransfer}
                  onChange={(e) => setValidateForm({ ...validateForm, crossBorderTransfer: e.target.checked })}
                />
                <label htmlFor="val-cross" className="text-sm text-gray-700">Cross-Border Transfer</label>
              </div>
              {validateForm.crossBorderTransfer && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination Country</label>
                    <input
                      type="text"
                      value={validateForm.destinationCountry}
                      onChange={(e) => setValidateForm({ ...validateForm, destinationCountry: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Safeguards</label>
                    <input
                      type="text"
                      value={validateForm.transferSafeguards}
                      onChange={(e) => setValidateForm({ ...validateForm, transferSafeguards: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Validation result */}
              {validationResult && (
                <div className={`rounded-lg p-4 ${validationResult.allowed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className={`font-semibold mb-2 ${validationResult.allowed ? 'text-green-800' : 'text-red-800'}`}>
                    {validationResult.allowed ? 'APPROVED — No violations detected' : `BLOCKED — ${validationResult.violations.length} violation(s)`}
                  </div>
                  {validationResult.violations.map((v, i) => (
                    <div key={i} className="text-red-700 text-xs mb-1">• {v.reason}
                      {v.requiredAction && <span className="text-orange-700"> → {v.requiredAction}</span>}
                    </div>
                  ))}
                  {validationResult.warnings.map((w, i) => (
                    <div key={i} className="text-yellow-700 text-xs mb-1">⚠ {w.warning}</div>
                  ))}
                  {validationResult.recommendation && (
                    <div className="text-gray-600 text-xs mt-2 italic">{validationResult.recommendation}</div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => { setShowValidator(false); setValidationResult(null); }}
                className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {validateMutation.isPending ? 'Validating…' : 'Run Validation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
