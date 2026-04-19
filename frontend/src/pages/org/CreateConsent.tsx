import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ConsentForm {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  purpose: string;
  legalBasis: string;
  retentionPeriod: string;
  expiresAt: string;
  privacyPolicyUrl: string;
}

const DATA_TYPE_OPTIONS = [
  'name', 'email', 'phone', 'national_id', 'address', 'location',
  'health_data', 'financial_data', 'biometric_data', 'cookies',
  'browsing_history', 'device_info', 'ip_address', 'preferences',
];

export default function CreateConsent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<ConsentForm>();

  const mutation = useMutation({
    mutationFn: (data: ConsentForm & { dataTypes: string[] }) =>
      api.post('/consents/org', data),
    onSuccess: () => {
      toast.success('Consent request created successfully');
      queryClient.invalidateQueries({ queryKey: ['org-consents'] });
      navigate('/dashboard/consents');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create';
      toast.error(msg);
    },
  });

  const toggleDataType = (dt: string) => {
    setSelectedDataTypes((prev) =>
      prev.includes(dt) ? prev.filter((x) => x !== dt) : [...prev, dt]
    );
  };

  const onSubmit = (data: ConsentForm) => {
    if (selectedDataTypes.length === 0) {
      toast.error('Select at least one data type');
      return;
    }
    mutation.mutate({ ...data, dataTypes: selectedDataTypes });
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Consent Request</h1>
          <p className="text-gray-500 text-sm">Create a PDPL-compliant consent request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Request Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Title (English) *</label>
                <input
                  className="input"
                  placeholder="e.g. Marketing Communications Consent"
                  {...register('title', { required: 'Title is required', minLength: 5 })}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="label">Title (Arabic)</label>
                <input
                  className="input text-right"
                  dir="rtl"
                  placeholder="العنوان بالعربية"
                  {...register('titleAr')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Description (English) *</label>
                <textarea
                  className="input resize-none"
                  rows={4}
                  placeholder="Explain what data you collect and why, in plain language..."
                  {...register('description', { required: 'Description is required', minLength: 10 })}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>
              <div>
                <label className="label">Description (Arabic)</label>
                <textarea
                  className="input resize-none text-right"
                  rows={4}
                  dir="rtl"
                  placeholder="وصف باللغة العربية..."
                  {...register('descriptionAr')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Types */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-1">Data Types *</h2>
          <p className="text-xs text-gray-500 mb-4">Select all personal data types this consent covers (PDPL Art. 2)</p>
          <div className="flex flex-wrap gap-2">
            {DATA_TYPE_OPTIONS.map((dt) => (
              <button
                key={dt}
                type="button"
                onClick={() => toggleDataType(dt)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedDataTypes.includes(dt)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {dt.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          {selectedDataTypes.length === 0 && (
            <p className="text-xs text-red-500 mt-2">At least one data type is required</p>
          )}
        </div>

        {/* Legal & Purpose */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Legal Basis & Purpose</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Processing Purpose *</label>
              <input
                className="input"
                placeholder="e.g. To send you marketing communications about our products"
                {...register('purpose', { required: 'Purpose is required', minLength: 10 })}
              />
              {errors.purpose && <p className="text-red-500 text-xs mt-1">{errors.purpose.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Legal Basis (PDPL Art. 5)</label>
                <select className="input" {...register('legalBasis')}>
                  <option value="consent">Explicit Consent</option>
                  <option value="contract">Contract Performance</option>
                  <option value="legal_obligation">Legal Obligation</option>
                  <option value="vital_interests">Vital Interests</option>
                  <option value="public_task">Public Task</option>
                  <option value="legitimate_interests">Legitimate Interests</option>
                </select>
              </div>
              <div>
                <label className="label">Data Retention Period</label>
                <input
                  className="input"
                  placeholder="e.g. 2 years, Until contract ends"
                  {...register('retentionPeriod')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Consent Expiry Date</label>
                <input
                  type="datetime-local"
                  className="input"
                  {...register('expiresAt')}
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank for no expiry</p>
              </div>
              <div>
                <label className="label">Privacy Policy URL</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://yourcompany.com/privacy"
                  {...register('privacyPolicyUrl')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* PDPL Checklist */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">PDPL Compliance Checklist</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li className={selectedDataTypes.length > 0 ? 'line-through text-blue-400' : ''}>
              ✓ Specify data types collected
            </li>
            <li>✓ Clearly state the purpose of processing</li>
            <li>✓ Identify lawful basis for processing</li>
            <li>✓ Provide data retention period</li>
            <li>✓ Link to privacy policy</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Consent Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
