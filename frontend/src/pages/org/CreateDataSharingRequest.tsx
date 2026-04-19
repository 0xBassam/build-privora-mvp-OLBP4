import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const DATA_TYPE_OPTIONS = [
  'name', 'email', 'phone', 'national_id', 'address',
  'date_of_birth', 'health_data', 'financial_data', 'employment_data',
  'location_data', 'biometric_data', 'behavioral_data',
];

const PURPOSE_CATEGORIES = [
  { value: 'identity_verification', label: 'Identity Verification' },
  { value: 'credit_scoring', label: 'Credit Scoring' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'employment', label: 'Employment' },
  { value: 'government_service', label: 'Government Service' },
  { value: 'research', label: 'Research' },
  { value: 'fraud_prevention', label: 'Fraud Prevention' },
  { value: 'other', label: 'Other' },
];

const LEGAL_BASIS_OPTIONS = [
  { value: 'consent', label: 'Consent' },
  { value: 'contract', label: 'Contract' },
  { value: 'legal_obligation', label: 'Legal Obligation' },
  { value: 'vital_interests', label: 'Vital Interests' },
  { value: 'public_task', label: 'Public Task' },
  { value: 'legitimate_interests', label: 'Legitimate Interests' },
];

export default function CreateDataSharingRequest() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    userId: '',
    title: '',
    purpose: '',
    purposeCategory: 'identity_verification',
    duration: '',
    legalBasis: 'consent',
    privacyNotice: '',
    providingOrgId: '',
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post('/data-sharing/requests', payload),
    onSuccess: (res) => {
      const status = res.data?.data?.request?.status;
      if (status === 'consent_approved') {
        toast.success('Request created — existing consent found, automatically approved!');
      } else {
        toast.success('Data sharing request created. Waiting for user consent.');
      }
      navigate('/dashboard/data-sharing');
    },
    onError: (err: unknown) => {
      const apiErrors = (err as { response?: { data?: { errors?: Array<{ msg: string; path: string }> } } })
        ?.response?.data?.errors;
      if (apiErrors) {
        const fieldErrors: Record<string, string> = {};
        apiErrors.forEach((e) => { fieldErrors[e.path] = e.msg; });
        setErrors(fieldErrors);
      } else {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to create request';
        toast.error(msg);
      }
    },
  });

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    if (errors.dataTypes) setErrors((e) => ({ ...e, dataTypes: '' }));
  };

  const handleChange = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.userId.trim()) newErrors.userId = 'User ID is required';
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.purpose.trim()) newErrors.purpose = 'Purpose is required';
    if (!form.duration.trim()) newErrors.duration = 'Duration is required';
    if (selectedTypes.length === 0) newErrors.dataTypes = 'At least one data type is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createMutation.mutate({
      userId: form.userId.trim(),
      title: form.title.trim(),
      purpose: form.purpose.trim(),
      purposeCategory: form.purposeCategory,
      duration: form.duration.trim(),
      legalBasis: form.legalBasis,
      privacyNotice: form.privacyNotice.trim() || undefined,
      providingOrgId: form.providingOrgId.trim() || undefined,
      dataTypes: selectedTypes,
    });
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/data-sharing')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Data Sharing
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Data Sharing Request</h1>
        <p className="text-gray-500 text-sm mt-1">
          Request access to a user's data from another organization, compliant with Saudi PDPL
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target User */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Target User</h2>
          <div>
            <label className="label">User ID <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={`input ${errors.userId ? 'border-red-400' : ''}`}
              placeholder="UUID of the data subject"
              value={form.userId}
              onChange={(e) => handleChange('userId', e.target.value)}
            />
            {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
            <p className="text-gray-400 text-xs mt-1">The user whose data you are requesting access to.</p>
          </div>

          <div className="mt-4">
            <label className="label">Providing Organization ID (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="UUID of Entity Y (if known)"
              value={form.providingOrgId}
              onChange={(e) => handleChange('providingOrgId', e.target.value)}
            />
            <p className="text-gray-400 text-xs mt-1">
              The organization that holds the data. Leave blank if requesting from the platform.
            </p>
          </div>
        </div>

        {/* Request Details */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Request Details</h2>

          <div className="mb-4">
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={`input ${errors.title ? 'border-red-400' : ''}`}
              placeholder="e.g. Identity Verification for Loan Application"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div className="mb-4">
            <label className="label">Purpose <span className="text-red-500">*</span></label>
            <textarea
              className={`input resize-none ${errors.purpose ? 'border-red-400' : ''}`}
              rows={2}
              placeholder="Describe why you need this data..."
              value={form.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
            />
            {errors.purpose && <p className="text-red-500 text-xs mt-1">{errors.purpose}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Purpose Category</label>
              <select
                className="input"
                value={form.purposeCategory}
                onChange={(e) => handleChange('purposeCategory', e.target.value)}
              >
                {PURPOSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Legal Basis</label>
              <select
                className="input"
                value={form.legalBasis}
                onChange={(e) => handleChange('legalBasis', e.target.value)}
              >
                {LEGAL_BASIS_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Duration <span className="text-red-500">*</span></label>
            <input
              type="text"
              className={`input ${errors.duration ? 'border-red-400' : ''}`}
              placeholder="e.g. 30 days, 6 months, 1 year"
              value={form.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
            />
            {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
          </div>
        </div>

        {/* Data Types */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-1">Data Types <span className="text-red-500">*</span></h2>
          <p className="text-xs text-gray-500 mb-4">
            Select only the minimum data types needed (data minimization principle).
          </p>
          <div className="flex flex-wrap gap-2">
            {DATA_TYPE_OPTIONS.map((type) => {
              const selected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
          {errors.dataTypes && <p className="text-red-500 text-xs mt-2">{errors.dataTypes}</p>}
          {selectedTypes.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">Selected: {selectedTypes.join(', ')}</p>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-1">Privacy Notice</h2>
          <p className="text-xs text-gray-500 mb-3">
            Explain to the user exactly how their data will be used. Required for PDPL compliance.
          </p>
          <textarea
            className="input resize-none"
            rows={4}
            placeholder="Your data will be accessed solely for identity verification purposes. It will not be shared with third parties or used for marketing..."
            value={form.privacyNotice}
            onChange={(e) => handleChange('privacyNotice', e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary px-8"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Request'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/data-sharing')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
