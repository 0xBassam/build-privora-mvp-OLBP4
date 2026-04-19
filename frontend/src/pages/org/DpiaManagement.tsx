import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface DpiaAssessment {
  id: string;
  title: string;
  description: string;
  ropaRecordId?: string;
  triggerReason: string;
  necessityAssessment?: string;
  proportionalityAssessment?: string;
  risksIdentified: { risk: string; likelihood: string; impact: string; rating: string }[];
  mitigationMeasures: { measure: string; owner: string; targetDate?: string; status: string }[];
  overallRiskLevel?: string;
  residualRiskLevel?: string;
  dpoConsultationRequired: boolean;
  dpoConsultationDate?: string;
  dpoRecommendation?: string;
  dpoApproved?: boolean | null;
  status: string;
  approvedAt?: string;
  rejectionReason?: string;
  reviewDate?: string;
  createdAt: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  sensitive_data: 'Sensitive Data',
  large_scale_processing: 'Large Scale Processing',
  systematic_monitoring: 'Systematic Monitoring',
  new_technology: 'New Technology',
  cross_border_transfer: 'Cross-Border Transfer',
  vulnerable_subjects: 'Vulnerable Subjects',
  manual_trigger: 'Manual',
};

const RISK_STYLES: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  in_review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  requires_update: 'bg-amber-100 text-amber-700',
};

const TRIGGER_REASONS = [
  'sensitive_data', 'large_scale_processing', 'systematic_monitoring',
  'new_technology', 'cross_border_transfer', 'vulnerable_subjects', 'manual_trigger',
];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['draft', 'in_review', 'approved', 'rejected', 'requires_update'];

const emptyForm = {
  title: '',
  description: '',
  ropaRecordId: '',
  triggerReason: 'sensitive_data',
  necessityAssessment: '',
  proportionalityAssessment: '',
  overallRiskLevel: '',
  residualRiskLevel: '',
  dpoConsultationRequired: false,
};

const emptyRisk = { risk: '', likelihood: 'medium', impact: 'medium', rating: 'medium' };
const emptyMitigation = { measure: '', owner: '', targetDate: '', status: 'planned' };

export default function DpiaManagement() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editAssessment, setEditAssessment] = useState<DpiaAssessment | null>(null);
  const [viewAssessment, setViewAssessment] = useState<DpiaAssessment | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [risks, setRisks] = useState([{ ...emptyRisk }]);
  const [mitigations, setMitigations] = useState([{ ...emptyMitigation }]);
  const [filterStatus, setFilterStatus] = useState('');

  const { data: assessmentsData, isLoading } = useQuery({
    queryKey: ['dpia-assessments', filterStatus],
    queryFn: () => api.get('/dpia/assessments', { params: filterStatus ? { status: filterStatus } : {} }).then((r) => r.data.data),
  });

  const assessments: DpiaAssessment[] = assessmentsData?.assessments ?? [];
  const summary = assessmentsData?.summary;

  const createMutation = useMutation({
    mutationFn: (data: typeof form & { risksIdentified: typeof risks; mitigationMeasures: typeof mitigations }) =>
      api.post('/dpia/assessments', data),
    onSuccess: () => {
      toast.success('DPIA assessment created');
      qc.invalidateQueries({ queryKey: ['dpia-assessments'] });
      setShowForm(false);
      setForm({ ...emptyForm });
      setRisks([{ ...emptyRisk }]);
      setMitigations([{ ...emptyMitigation }]);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create DPIA');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/dpia/assessments/${id}`, data),
    onSuccess: () => {
      toast.success('DPIA updated');
      qc.invalidateQueries({ queryKey: ['dpia-assessments'] });
      setEditAssessment(null);
      setShowForm(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Update failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/dpia/assessments/${id}`),
    onSuccess: () => {
      toast.success('DPIA deleted');
      qc.invalidateQueries({ queryKey: ['dpia-assessments'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Delete failed');
    },
  });

  const openCreate = () => {
    setEditAssessment(null);
    setForm({ ...emptyForm });
    setRisks([{ ...emptyRisk }]);
    setMitigations([{ ...emptyMitigation }]);
    setShowForm(true);
  };

  const openEdit = (a: DpiaAssessment) => {
    setEditAssessment(a);
    setForm({
      title: a.title,
      description: a.description,
      ropaRecordId: a.ropaRecordId ?? '',
      triggerReason: a.triggerReason,
      necessityAssessment: a.necessityAssessment ?? '',
      proportionalityAssessment: a.proportionalityAssessment ?? '',
      overallRiskLevel: a.overallRiskLevel ?? '',
      residualRiskLevel: a.residualRiskLevel ?? '',
      dpoConsultationRequired: a.dpoConsultationRequired,
    });
    setRisks(a.risksIdentified?.length ? a.risksIdentified : [{ ...emptyRisk }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMitigations((a.mitigationMeasures?.length ? a.mitigationMeasures : [{ ...emptyMitigation }]) as any);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      ropaRecordId: form.ropaRecordId || undefined,
      overallRiskLevel: form.overallRiskLevel || undefined,
      residualRiskLevel: form.residualRiskLevel || undefined,
      risksIdentified: risks.filter((r) => r.risk.trim()),
      mitigationMeasures: mitigations.filter((m) => m.measure.trim()),
    };

    if (editAssessment) {
      updateMutation.mutate({ id: editAssessment.id, data: payload });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createMutation.mutate(payload as any);
    }
  };

  const handleStatusChange = (assessment: DpiaAssessment, status: string) => {
    updateMutation.mutate({ id: assessment.id, data: { status } });
  };

  const updateRisk = (i: number, field: string, value: string) => {
    setRisks(risks.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const updateMitigation = (i: number, field: string, value: string) => {
    setMitigations(mitigations.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">DPIA Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Data Protection Impact Assessments — PDPL Art. 23 &amp; NCA ECC compliance
          </p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New DPIA
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: summary.total },
            { label: 'Draft', value: summary.byStatus?.draft ?? 0 },
            { label: 'In Review', value: summary.byStatus?.in_review ?? 0 },
            { label: 'Approved', value: summary.byStatus?.approved ?? 0 },
            { label: 'Needs DPO', value: summary.pendingDpoConsultation ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
          ))}
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
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editAssessment ? 'Edit DPIA' : 'New DPIA Assessment'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. DPIA for Biometric Identity Verification System"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Overview of the processing activity being assessed"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Reason *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.triggerReason}
                  onChange={(e) => setForm({ ...form, triggerReason: e.target.value })}
                >
                  {TRIGGER_REASONS.map((r) => (
                    <option key={r} value={r}>{TRIGGER_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RoPA Record ID (optional)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.ropaRecordId}
                  onChange={(e) => setForm({ ...form, ropaRecordId: e.target.value })}
                  placeholder="UUID of linked RoPA record"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overall Risk Level</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.overallRiskLevel}
                  onChange={(e) => setForm({ ...form, overallRiskLevel: e.target.value })}
                >
                  <option value="">— Select —</option>
                  {RISK_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Residual Risk Level</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.residualRiskLevel}
                  onChange={(e) => setForm({ ...form, residualRiskLevel: e.target.value })}
                >
                  <option value="">— Select —</option>
                  {RISK_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Necessity Assessment</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.necessityAssessment}
                  onChange={(e) => setForm({ ...form, necessityAssessment: e.target.value })}
                  placeholder="Is the processing necessary and proportionate to the purpose?"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Proportionality Assessment</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.proportionalityAssessment}
                  onChange={(e) => setForm({ ...form, proportionalityAssessment: e.target.value })}
                  placeholder="Does the processing go beyond what is needed?"
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600"
                    checked={form.dpoConsultationRequired}
                    onChange={(e) => setForm({ ...form, dpoConsultationRequired: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-gray-700">DPO Consultation Required</span>
                </label>
              </div>
            </div>

            {/* Risks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Identified Risks</label>
                <button
                  type="button"
                  onClick={() => setRisks([...risks, { ...emptyRisk }])}
                  className="text-xs text-blue-600 hover:underline"
                >
                  + Add Risk
                </button>
              </div>
              <div className="space-y-2">
                {risks.map((risk, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-2">
                      <input
                        className="w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={risk.risk}
                        onChange={(e) => updateRisk(i, 'risk', e.target.value)}
                        placeholder="Describe the risk"
                      />
                    </div>
                    {(['likelihood', 'impact', 'rating'] as const).map((field) => (
                      <select
                        key={field}
                        className="border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={risk[field]}
                        onChange={(e) => updateRisk(i, field, e.target.value)}
                      >
                        {RISK_LEVELS.map((l) => <option key={l} value={l}>{field}: {l}</option>)}
                      </select>
                    ))}
                    {risks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRisks(risks.filter((_, idx) => idx !== i))}
                        className="col-span-4 text-xs text-red-400 hover:text-red-600 text-right"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mitigations */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Mitigation Measures</label>
                <button
                  type="button"
                  onClick={() => setMitigations([...mitigations, { ...emptyMitigation }])}
                  className="text-xs text-blue-600 hover:underline"
                >
                  + Add Measure
                </button>
              </div>
              <div className="space-y-2">
                {mitigations.map((m, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-2">
                      <input
                        className="w-full border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={m.measure}
                        onChange={(e) => updateMitigation(i, 'measure', e.target.value)}
                        placeholder="Describe the mitigation"
                      />
                    </div>
                    <input
                      className="border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={m.owner}
                      onChange={(e) => updateMitigation(i, 'owner', e.target.value)}
                      placeholder="Owner"
                    />
                    <select
                      className="border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={m.status}
                      onChange={(e) => updateMitigation(i, 'status', e.target.value)}
                    >
                      {['planned', 'in_progress', 'completed'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {mitigations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMitigations(mitigations.filter((_, idx) => idx !== i))}
                        className="col-span-4 text-xs text-red-400 hover:text-red-600 text-right"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditAssessment(null); }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editAssessment ? 'Save Changes' : 'Create DPIA'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading assessments...</div>
        ) : assessments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm">No DPIA assessments found.</p>
            <p className="text-gray-400 text-xs mt-1">Create a DPIA for any high-risk or sensitive data processing activity.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Assessment</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trigger</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Risk Level</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">DPO</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assessments.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-gray-900 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(a.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                      {TRIGGER_LABELS[a.triggerReason] ?? a.triggerReason}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.overallRiskLevel ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RISK_STYLES[a.overallRiskLevel]}`}>
                        {a.overallRiskLevel}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {a.dpoConsultationRequired
                      ? a.dpoApproved === true ? '✓ Approved'
                        : a.dpoApproved === false ? '✗ Rejected'
                        : 'Pending'
                      : 'Not required'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      onChange={(e) => handleStatusChange(a, e.target.value)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${STATUS_STYLES[a.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setViewAssessment(a)} className="text-xs text-blue-600 hover:underline mr-2">View</button>
                    <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:underline mr-2">Edit</button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete DPIA "${a.title}"?`)) deleteMutation.mutate(a.id);
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
      {viewAssessment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 max-w-md">{viewAssessment.title}</h2>
              <div className="flex gap-2 flex-shrink-0 ml-4">
                {viewAssessment.overallRiskLevel && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RISK_STYLES[viewAssessment.overallRiskLevel]}`}>
                    {viewAssessment.overallRiskLevel} risk
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[viewAssessment.status]}`}>
                  {viewAssessment.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="space-y-4 text-sm">
              {viewAssessment.necessityAssessment && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Necessity Assessment</p>
                  <p className="text-gray-800">{viewAssessment.necessityAssessment}</p>
                </div>
              )}
              {viewAssessment.proportionalityAssessment && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Proportionality</p>
                  <p className="text-gray-800">{viewAssessment.proportionalityAssessment}</p>
                </div>
              )}
              {viewAssessment.risksIdentified?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Identified Risks</p>
                  <div className="space-y-1.5">
                    {viewAssessment.risksIdentified.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs p-2 bg-gray-50 rounded-lg">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${RISK_STYLES[r.rating]}`}>{r.rating}</span>
                        <span className="text-gray-700">{r.risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewAssessment.mitigationMeasures?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Mitigations</p>
                  <div className="space-y-1.5">
                    {viewAssessment.mitigationMeasures.map((m, i) => (
                      <div key={i} className="flex items-start justify-between text-xs p-2 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">{m.measure}</span>
                        <span className="text-gray-400 ml-2 flex-shrink-0">{m.owner} · {m.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewAssessment.dpoRecommendation && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">DPO Recommendation</p>
                  <p className="text-gray-800">{viewAssessment.dpoRecommendation}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setViewAssessment(null)}
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
