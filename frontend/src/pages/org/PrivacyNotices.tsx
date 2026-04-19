import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface PrivacyNotice {
  id: string;
  title: string;
  version: string;
  purposeOfProcessing: string;
  dataTypesCollected: string[];
  retentionSummary: string;
  thirdPartySharing: boolean;
  contactEmail: string;
  legalBasis: string;
  dataSubjectRights: string[];
  effectiveDate?: string;
  changeNotes?: string;
  isActive: boolean;
  previousVersionId?: string;
  createdAt: string;
}

const LEGAL_BASIS_LABELS: Record<string, string> = {
  consent: 'Consent',
  contract: 'Contract',
  legal_obligation: 'Legal Obligation',
  vital_interests: 'Vital Interests',
  public_task: 'Public Task',
  legitimate_interests: 'Legitimate Interests',
};

const DATA_RIGHTS_OPTIONS = ['access', 'correction', 'deletion', 'portability', 'objection', 'restrict_processing'];

const emptyForm = {
  title: '',
  version: '',
  purposeOfProcessing: '',
  dataTypesCollected: [] as string[],
  retentionSummary: '',
  thirdPartySharing: false,
  contactEmail: '',
  legalBasis: 'consent',
  dataSubjectRights: ['access', 'correction', 'deletion', 'portability', 'objection'],
  effectiveDate: '',
  changeNotes: '',
};

export default function PrivacyNotices() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editNotice, setEditNotice] = useState<PrivacyNotice | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [dataTypeInput, setDataTypeInput] = useState('');
  const [viewNotice, setViewNotice] = useState<PrivacyNotice | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PrivacyNotice>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['privacy-notices'],
    queryFn: () => api.get('/privacy-notices').then((r) => r.data.data),
  });

  const notices: PrivacyNotice[] = data?.notices ?? [];
  const activeNotice: PrivacyNotice | null = data?.activeNotice ?? null;

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post('/privacy-notices', payload),
    onSuccess: (res) => {
      toast.success('Privacy notice created');
      qc.invalidateQueries({ queryKey: ['privacy-notices'] });
      setShowForm(false);
      setForm({ ...emptyForm });
      setDataTypeInput('');
      setViewNotice(res.data.data.notice);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create notice');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PrivacyNotice> }) =>
      api.patch(`/privacy-notices/${id}`, data),
    onSuccess: (res) => {
      toast.success('Notice updated');
      qc.invalidateQueries({ queryKey: ['privacy-notices'] });
      setEditMode(false);
      setViewNotice(res.data.data.notice);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Update failed');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/privacy-notices/${id}/activate`),
    onSuccess: () => {
      toast.success('Notice activated');
      qc.invalidateQueries({ queryKey: ['privacy-notices'] });
    },
    onError: () => toast.error('Activation failed'),
  });

  const addDataType = () => {
    const val = dataTypeInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (val && !form.dataTypesCollected.includes(val)) {
      setForm({ ...form, dataTypesCollected: [...form.dataTypesCollected, val] });
    }
    setDataTypeInput('');
  };

  const removeDataType = (dt: string) => {
    setForm({ ...form, dataTypesCollected: form.dataTypesCollected.filter((d) => d !== dt) });
  };

  const toggleRight = (right: string) => {
    const current = form.dataSubjectRights;
    setForm({
      ...form,
      dataSubjectRights: current.includes(right)
        ? current.filter((r) => r !== right)
        : [...current, right],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editNotice) {
      updateMutation.mutate({ id: editNotice.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Privacy Notices</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage versioned privacy notices under PDPL Art. 11
          </p>
        </div>
        <button
          onClick={() => { setEditNotice(null); setForm({ ...emptyForm }); setDataTypeInput(''); setShowForm(true); }}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Version
        </button>
      </div>

      {/* Active Notice Banner */}
      {activeNotice && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Active Notice: v{activeNotice.version}</p>
            <p className="text-xs text-green-600 mt-0.5">{activeNotice.title}</p>
          </div>
          <button
            onClick={() => setViewNotice(activeNotice)}
            className="text-xs text-green-700 hover:underline"
          >
            View
          </button>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editNotice ? 'Edit Notice' : 'Create Privacy Notice'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Ministry of Health Privacy Notice"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  placeholder="e.g. 1.0 or 2.1"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Format: X.Y (e.g. 1.0, 2.0)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Basis</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.legalBasis}
                  onChange={(e) => setForm({ ...form, legalBasis: e.target.value })}
                >
                  {Object.entries(LEGAL_BASIS_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Processing *</label>
                <textarea
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.purposeOfProcessing}
                  onChange={(e) => setForm({ ...form, purposeOfProcessing: e.target.value })}
                  placeholder="Describe why data is collected and processed..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Retention Summary</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.retentionSummary}
                  onChange={(e) => setForm({ ...form, retentionSummary: e.target.value })}
                  placeholder="e.g. 5 years from last appointment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="dpo@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.effectiveDate}
                  onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  id="thirdParty"
                  checked={form.thirdPartySharing}
                  onChange={(e) => setForm({ ...form, thirdPartySharing: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="thirdParty" className="text-sm text-gray-700">Third-party data sharing</label>
              </div>
            </div>

            {/* Data Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Types Collected</label>
              <div className="flex gap-2 mb-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={dataTypeInput}
                  onChange={(e) => setDataTypeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDataType(); } }}
                  placeholder="e.g. health_data"
                />
                <button type="button" onClick={addDataType} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.dataTypesCollected.map((dt) => (
                  <span key={dt} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                    {dt}
                    <button type="button" onClick={() => removeDataType(dt)} className="ml-1 text-blue-400 hover:text-blue-700">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Data Subject Rights */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Subject Rights</label>
              <div className="flex flex-wrap gap-2">
                {DATA_RIGHTS_OPTIONS.map((right) => (
                  <button
                    key={right}
                    type="button"
                    onClick={() => toggleRight(right)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      form.dataSubjectRights.includes(right)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {right.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Change Notes</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.changeNotes}
                onChange={(e) => setForm({ ...form, changeNotes: e.target.value })}
                placeholder="What changed in this version?"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editNotice ? 'Save Changes' : 'Publish Notice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Version History */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Version History</h2>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : notices.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm">No privacy notices created yet.</p>
            <p className="text-gray-400 text-xs mt-1">Create a privacy notice to inform users about data processing under PDPL Art. 11.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Legal Basis</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">3rd Party</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notices.map((notice) => (
                <tr key={notice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900">v{notice.version}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 truncate max-w-xs">{notice.title}</p>
                    {notice.changeNotes && <p className="text-xs text-gray-400 mt-0.5 truncate">{notice.changeNotes}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {LEGAL_BASIS_LABELS[notice.legalBasis] ?? notice.legalBasis}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${notice.thirdPartySharing ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                      {notice.thirdPartySharing ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${notice.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {notice.isActive ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(notice.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setViewNotice(notice)} className="text-xs text-blue-600 hover:underline">
                      View
                    </button>
                    {!notice.isActive && (
                      <button
                        onClick={() => activateMutation.mutate(notice.id)}
                        disabled={activateMutation.isPending}
                        className="text-xs text-green-600 hover:underline disabled:opacity-50"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View / Edit Modal */}
      {viewNotice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Privacy Notice v{viewNotice.version}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{viewNotice.title}</p>
              </div>
              <div className="flex gap-2">
                {!editMode && (
                  <button
                    onClick={() => { setEditMode(true); setEditForm({ contactEmail: viewNotice.contactEmail, retentionSummary: viewNotice.retentionSummary }); }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                )}
                <button onClick={() => { setViewNotice(null); setEditMode(false); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto p-6 space-y-4">
              {editMode ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={editForm.contactEmail ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retention Summary</label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={editForm.retentionSummary ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, retentionSummary: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button onClick={() => setEditMode(false)} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
                    <button
                      onClick={() => updateMutation.mutate({ id: viewNotice.id, data: editForm })}
                      disabled={updateMutation.isPending}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Section label="Purpose of Processing" value={viewNotice.purposeOfProcessing} />
                  <Section label="Legal Basis" value={LEGAL_BASIS_LABELS[viewNotice.legalBasis] ?? viewNotice.legalBasis} />
                  <Section label="Retention Summary" value={viewNotice.retentionSummary || '—'} />
                  <Section label="Contact Email" value={viewNotice.contactEmail || '—'} />
                  <Section label="Third-Party Sharing" value={viewNotice.thirdPartySharing ? 'Yes' : 'No'} />
                  {viewNotice.effectiveDate && (
                    <Section label="Effective Date" value={format(new Date(viewNotice.effectiveDate), 'dd MMM yyyy')} />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Data Types Collected</p>
                    <div className="flex flex-wrap gap-1">
                      {viewNotice.dataTypesCollected.map((dt) => (
                        <span key={dt} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{dt}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Data Subject Rights</p>
                    <div className="flex flex-wrap gap-1">
                      {viewNotice.dataSubjectRights.map((r) => (
                        <span key={r} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">{r.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                  {viewNotice.changeNotes && <Section label="Change Notes" value={viewNotice.changeNotes} />}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}
