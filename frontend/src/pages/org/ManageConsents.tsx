import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ConsentRequest {
  id: string;
  title: string;
  purpose: string;
  dataTypes: string[];
  isActive: boolean;
  legalBasis: string;
  createdAt: string;
  expiresAt?: string;
}

export default function ManageConsents() {
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['org-consents', showInactive],
    queryFn: () =>
      api.get(`/consents/org${showInactive ? '' : '?isActive=true'}`).then((r) => r.data.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/consents/org/${id}`, { isActive }),
    onSuccess: () => {
      toast.success('Consent request updated');
      queryClient.invalidateQueries({ queryKey: ['org-consents'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const requests: ConsentRequest[] = data?.requests || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consent Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your organization's consent requests</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show inactive
          </label>
          <Link to="/dashboard/consents/new" className="btn-primary">
            + New Request
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-gray-900 font-medium mb-2">No consent requests yet</h3>
          <Link to="/dashboard/consents/new" className="btn-primary inline-flex">
            Create your first consent request
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Types</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Legal Basis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/dashboard/consents/${req.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {req.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{req.purpose}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {req.dataTypes.slice(0, 3).map((dt) => (
                        <span key={dt} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {dt}
                        </span>
                      ))}
                      {req.dataTypes.length > 3 && (
                        <span className="text-xs text-gray-400">+{req.dataTypes.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                    {req.legalBasis?.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${req.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {req.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(req.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/dashboard/consents/${req.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => toggleMutation.mutate({ id: req.id, isActive: !req.isActive })}
                        className={`text-xs ${req.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                      >
                        {req.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
