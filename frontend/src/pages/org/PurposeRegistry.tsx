import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ProcessingPurpose {
  id: string;
  name: string;
  description: string;
  legalBasis: string;
  dataCategories: string[];
  allowedDataTypes: string[];
  requiresExplicitConsent: boolean;
  retentionDays?: number;
  isActive: boolean;
  createdAt: string;
}

interface ValidateResult {
  isValid: boolean;
  purposeName: string;
  requestedDataTypes: string[];
  allowedDataTypes: string[];
  unauthorizedDataTypes: string[];
  violation?: string;
}

const LEGAL_BASIS_LABELS: Record<string, string> = {
  consent: 'Consent',
  contract: 'Contract',
  legal_obligation: 'Legal Obligation',
  vital_interests: 'Vital Interests',
  public_task: 'Public Task',
  legitimate_interests: 'Legitimate Interests',
};

const CATEGORY_LABELS: Record<string, string> = {
  pii: 'PII',
  sensitive: 'Sensitive',
  financial: 'Financial',
  biometric: 'Biometric',
  behavioral: 'Behavioral',
  location: 'Location',
};

const CATEGORY_STYLES: Record<string, string> = {
  pii: 'bg-blue-100 text-blue-700',
  sensitive: 'bg-red-100 text-red-700',
  financial: 'bg-yellow-100 text-yellow-700',
  biometric: 'bg-purple-100 text-purple-700',
  behavioral: 'bg-orange-100 text-orange-700',
  location: 'bg-teal-100 text-teal-700',
};

const DATA_CATEGORIES = ['pii', 'sensitive', 'financial', 'biometric', 'behavioral', 'location'];

const emptyForm = {
  name: '',
  description: '',
  legalBasis: 'consent',
  dataCategories: [] as string[],
  allowedDataTypes: [] as string[],
  requiresExplicitConsent: true,
  retentionDays: undefined as number | undefined,
};

export default function PurposeRegistry() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [dataTypeInput, setDataTypeInput] = useState('');
  const [validateModal, setValidateModal] = useState<ProcessingPurpose | null>(null);
  const [validateInput, setValidateInput] = useState('');
  const [validateTypes, setValidateTypes] = useState<string[]>([]);
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['purposes'],
    queryFn: () => api.get('/purposes').then((r) => r.data.data),
  });

  const purposes: ProcessingPurpose[] = data?.purposes ?? [];
  const summary = data?.summary;

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post('/purposes', payload),
    onSuccess: () => {
      toast.success('Processing purpose created');
      qc.invalidateQueries({ queryKey: ['purposes'] });
      setShowForm(false);
      setForm({ ...emptyForm });
      setDataTypeInput('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Failed to create purpose');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/purposes/${id}`),
    onSuccess: () => {
      toast.success('Purpose deleted');
      qc.invalidateQueries({ queryKey: ['purposes'] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const validateMutation = useMutation({
    mutationFn: ({ purposeId, dataTypes }: { purposeId: string; dataTypes: string[] }) =>
      api.post('/purposes/validate', { purposeId, dataTypes }),
    onSuccess: (res) => setValidateResult(res.data.data),
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Validation failed');
    },
  });

  const toggleCategory = (cat: string) => {
    const current = form.dataCategories;
    setForm({
      ...form,
      dataCategories: current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat],
    });
  };

  const addDataType = () => {
    const val = dataTypeInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (val && !form.allowedDataTypes.includes(val)) {
      setForm({ ...form, allowedDataTypes: [...form.allowedDataTypes, val] });
    }
    setDataTypeInput('');
  };

  const removeDataType = (dt: string) => {
    setForm({ ...form, allowedDataTypes: form.allowedDataTypes.filter((d) => d !== dt) });
  };

  const addValidateType = () => {
    const val = validateInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (val && !validateTypes.includes(val)) setValidateTypes([...validateTypes, val]);
    setValidateInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purpose Registry</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define and validate data processing purposes under PDPL Art. 6 & Art. 5
          </p>
        </div>
        <button
          onClick={() => { setForm({ ...emptyForm }); setDataTypeInput(''); setShowForm(true); }}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Register Purpose
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Purposes</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.active}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Require Explicit Consent</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.requiresExplicitConsent}</p>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Register Processing Purpose</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose Name *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Medical Diagnosis"
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
                  placeholder="Describe the specific, legitimate purpose for data processing..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Basis *</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Retention Days</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.retentionDays ?? ''}
                  onChange={(e) => setForm({ ...form, retentionDays: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Data Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data Categories *</label>
              <div className="flex flex-wrap gap-2">
                {DATA_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      form.dataCategories.includes(cat)
                        ? `${CATEGORY_STYLES[cat]} border-transparent`
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              {(form.dataCategories.includes('sensitive') || form.dataCategories.includes('biometric')) && (
                <p className="text-xs text-red-600 mt-1">Sensitive/biometric categories require explicit consent (enforced automatically)</p>
              )}
            </div>

            {/* Allowed Data Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Data Types</label>
              <div className="flex gap-2 mb-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={dataTypeInput}
                  onChange={(e) => setDataTypeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDataType(); } }}
                  placeholder="e.g. name, health_data, date_of_birth"
                />
                <button type="button" onClick={addDataType} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.allowedDataTypes.map((dt) => (
                  <span key={dt} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                    {dt}
                    <button type="button" onClick={() => removeDataType(dt)} className="ml-1 text-blue-400 hover:text-blue-700">&times;</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="explicitConsent"
                checked={form.requiresExplicitConsent}
                onChange={(e) => setForm({ ...form, requiresExplicitConsent: e.target.checked })}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="explicitConsent" className="text-sm text-gray-700">Requires Explicit Consent</label>
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
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Register Purpose
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Purposes List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Loading purposes...</div>
        ) : purposes.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-500 text-sm">No processing purposes registered.</p>
            <p className="text-gray-400 text-xs mt-1">Register specific, explicit processing purposes as required by PDPL Art. 6.</p>
          </div>
        ) : (
          purposes.map((purpose) => (
            <div key={purpose.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{purpose.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${purpose.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {purpose.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {purpose.requiresExplicitConsent && (
                      <span className="px-2 py-0.5 text-xs bg-red-50 text-red-600 rounded-full">Explicit Consent</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{purpose.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">
                      {LEGAL_BASIS_LABELS[purpose.legalBasis] ?? purpose.legalBasis}
                    </span>
                    {purpose.retentionDays && (
                      <span className="text-xs text-gray-400">· {purpose.retentionDays}d retention</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => { setValidateModal(purpose); setValidateTypes([]); setValidateResult(null); }}
                    className="px-3 py-1.5 text-xs border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    Validate
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${purpose.name}"?`)) deleteMutation.mutate(purpose.id); }}
                    className="px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {purpose.dataCategories.map((cat) => (
                  <span key={cat} className={`px-2 py-0.5 text-xs rounded-full ${CATEGORY_STYLES[cat] ?? 'bg-gray-100 text-gray-600'}`}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                ))}
              </div>

              {purpose.allowedDataTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-gray-400 mr-1">Allowed:</span>
                  {purpose.allowedDataTypes.map((dt) => (
                    <span key={dt} className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded border border-gray-200">
                      {dt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Validate Modal */}
      {validateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Validate Data Usage</h2>
            <p className="text-sm text-gray-500 mb-4">
              Check if data types are approved for <strong>{validateModal.name}</strong>
            </p>

            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={validateInput}
                onChange={(e) => setValidateInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValidateType(); } }}
                placeholder="e.g. health_data"
              />
              <button type="button" onClick={addValidateType} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1 mb-4 min-h-[28px]">
              {validateTypes.map((dt) => (
                <span key={dt} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                  {dt}
                  <button onClick={() => setValidateTypes(validateTypes.filter((t) => t !== dt))} className="text-blue-400 hover:text-blue-700">&times;</button>
                </span>
              ))}
            </div>

            {validateResult && (
              <div className={`rounded-xl p-4 mb-4 ${validateResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-semibold text-sm ${validateResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                  {validateResult.isValid ? 'Valid — all data types approved' : 'Invalid — unauthorized data types detected'}
                </p>
                {!validateResult.isValid && (
                  <>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {validateResult.unauthorizedDataTypes.map((dt) => (
                        <span key={dt} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">{dt}</span>
                      ))}
                    </div>
                    {validateResult.violation && (
                      <p className="text-xs text-red-600 mt-2">{validateResult.violation}</p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setValidateModal(null); setValidateResult(null); setValidateTypes([]); }}
                className="flex-1 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => validateMutation.mutate({ purposeId: validateModal.id, dataTypes: validateTypes })}
                disabled={validateTypes.length === 0 || validateMutation.isPending}
                className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Check
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
