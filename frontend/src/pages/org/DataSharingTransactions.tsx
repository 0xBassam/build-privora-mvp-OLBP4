import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  dataTypesShared: string[];
  purpose: string;
  dataHash: string;
  sharedAt: string;
  expiresAt?: string;
  request?: { id: string; title: string; purpose: string };
  dataSubject?: { id: string; name: string; email: string };
}

export default function DataSharingTransactions() {
  const { data, isLoading } = useQuery({
    queryKey: ['org-data-sharing-transactions'],
    queryFn: () =>
      api.get('/data-sharing/transactions?limit=50').then((r) => r.data.data),
  });

  const transactions: Transaction[] = data?.transactions || [];
  const pagination = data?.pagination;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Sharing Audit Trail</h1>
        <p className="text-gray-500 text-sm mt-1">
          Immutable record of all executed data sharing transactions — PDPL Article 29 compliant
        </p>
      </div>

      {/* Stats banner */}
      {pagination && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card">
            <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
            <p className="text-sm text-gray-500 mt-1">Total Transactions</p>
          </div>
          <div className="card">
            <p className="text-2xl font-bold text-green-600">
              {transactions.filter((t) => !t.expiresAt || new Date(t.expiresAt) > new Date()).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Active Shares</p>
          </div>
          <div className="card">
            <p className="text-2xl font-bold text-blue-600">
              {new Set(transactions.map((t) => t.dataSubject?.id).filter(Boolean)).size}
            </p>
            <p className="text-sm text-gray-500 mt-1">Unique Subjects</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="card text-center py-14">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-gray-900 font-medium">No transactions yet</h3>
          <p className="text-gray-400 text-sm mt-1">
            Completed data sharing executions will appear here
          </p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Shared</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Integrity Hash</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shared At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {tx.request?.title || 'Data Share'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tx.purpose}</p>
                  </td>
                  <td className="px-6 py-4">
                    {tx.dataSubject ? (
                      <div>
                        <p className="text-sm text-gray-900">{tx.dataSubject.name}</p>
                        <p className="text-xs text-gray-400">{tx.dataSubject.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {tx.dataTypesShared.map((dt) => (
                        <span key={dt} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {dt}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">
                      {tx.dataHash ? `${tx.dataHash.slice(0, 8)}…${tx.dataHash.slice(-4)}` : '—'}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {format(new Date(tx.sharedAt), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4">
                    {tx.expiresAt ? (
                      <span className={`text-xs ${new Date(tx.expiresAt) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                        {format(new Date(tx.expiresAt), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination && pagination.total > transactions.length && (
            <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 text-center border-t">
              Showing {transactions.length} of {pagination.total} transactions
            </div>
          )}
        </div>
      )}

      {/* Immutability notice */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-blue-700">
          These records are immutable and cannot be modified or deleted, in compliance with Saudi PDPL Article 29
          audit trail requirements. Each transaction is cryptographically hashed for integrity verification.
        </p>
      </div>
    </div>
  );
}
