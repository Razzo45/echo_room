'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type LogEntry = {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  organiser: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

export default function AdminAuditLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (actionFilter) params.set('action', actionFilter);
      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotalPages(data.pagination?.pages ?? 1);
    } catch (err) {
      console.error(err);
      router.push('/admin/login');
    }
    setLoading(false);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/admin" className="text-gray-400 hover:text-white mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Admin audit log</h1>
          <p className="text-sm text-gray-400">
            All Admin and SuperAdmin actions are logged here for compliance and audit.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm text-gray-400">Action</label>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="participant.remove">participant.remove</option>
            <option value="retention.override">retention.override</option>
            <option value="retention.run">retention.run</option>
            <option value="organiser.create">organiser.create</option>
            <option value="organiser.update">organiser.update</option>
          </select>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No audit entries yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Who</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Resource</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {log.organiser.name} ({log.organiser.role})
                      </td>
                      <td className="px-4 py-3 text-white font-mono">{log.action}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {log.resourceType}
                        {log.resourceId && (
                          <span className="text-gray-500 ml-1 truncate max-w-[120px] inline-block" title={log.resourceId}>
                            {log.resourceId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs">
                        {log.details && (
                          <pre className="text-xs whitespace-pre-wrap break-all">
                            {JSON.stringify(log.details)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
