// apps/control-plane/src/app/audits/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { AuditLog } from '@ztag/shared';

export default function AuditLogsPage() {
  const { token } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [decisionFilter, setDecisionFilter] = useState<'ALLOW' | 'DENY' | ''>('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [subjectSubFilter, setSubjectSubFilter] = useState('');

  const fetchAuditLogs = async () => {
    if (!token) {
      setError('Authentication token not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        ...(decisionFilter && { decision: decisionFilter }),
        ...(serviceFilter && { service: serviceFilter }),
        ...(pathFilter && { path: pathFilter }),
        ...(subjectSubFilter && { subjectSub: subjectSubFilter }),
      };
      const response = await api.audits.getAll(token, params);
      setAuditLogs(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch audit logs.');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [token, page, limit, decisionFilter, serviceFilter, pathFilter, subjectSubFilter]);

  const handleClearFilters = () => {
    setDecisionFilter('');
    setServiceFilter('');
    setPathFilter('');
    setSubjectSubFilter('');
    setPage(1);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-3">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="decisionFilter" className="block text-sm font-medium text-gray-700">Decision</label>
            <select
              id="decisionFilter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value as 'ALLOW' | 'DENY' | '')}
            >
              <option value="">All</option>
              <option value="ALLOW">ALLOW</option>
              <option value="DENY">DENY</option>
            </select>
          </div>
          <div>
            <label htmlFor="serviceFilter" className="block text-sm font-medium text-gray-700">Service</label>
            <input
              type="text"
              id="serviceFilter"
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              placeholder="e.g., echo-service"
            />
          </div>
          <div>
            <label htmlFor="pathFilter" className="block text-sm font-medium text-gray-700">Path</label>
            <input
              type="text"
              id="pathFilter"
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              placeholder="e.g., /api/echo"
            />
          </div>
          <div>
            <label htmlFor="subjectSubFilter" className="block text-sm font-medium text-gray-700">Subject (sub)</label>
            <input
              type="text"
              id="subjectSubFilter"
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              value={subjectSubFilter}
              onChange={(e) => setSubjectSubFilter(e.target.value)}
              placeholder="e.g., user123"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleClearFilters}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-8">Loading audit logs...</div>}
      {error && <div className="text-center py-8 text-red-500">Error: {error}</div>}

      {!loading && !error && auditLogs.length === 0 && (
        <p className="text-gray-700">No audit logs found with current filters.</p>
      )}

      {!loading && !error && auditLogs.length > 0 && (
        <>
          <div className="overflow-x-auto bg-white rounded-lg shadow-sm mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600 uppercase text-xs font-medium">
                  <th scope="col" className="px-6 py-3">Timestamp</th>
                  <th scope="col" className="px-6 py-3">Request ID</th>
                  <th scope="col" className="px-6 py-3">Subject</th>
                  <th scope="col" className="px-6 py-3">Resource</th>
                  <th scope="col" className="px-6 py-3">Decision</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Latency (ms)</th>
                  <th scope="col" className="px-6 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">{log.requestId.substring(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.subject.sub || 'N/A'} ({log.subject.role})</td>
                    <td className="px-6 py-4 text-xs">{log.resource.method} {log.resource.service}{log.resource.path}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.decision === 'ALLOW' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.decision}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.statusCode}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{log.latencyMs.toFixed(2)}</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={log.reason}>{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-700">Page {page} of {totalPages} (Total: {total})</span>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages || loading}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
