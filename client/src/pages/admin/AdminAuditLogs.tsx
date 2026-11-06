import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../lib/adminApi';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [actionFilter, setActionFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-audit', page, limit, actionFilter, targetFilter],
    queryFn: () =>
      adminApi.getAuditLogs({
        page,
        limit,
        action: actionFilter,
        targetType: targetFilter,
      }),
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'USER_SUSPEND':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'USER_REACTIVATE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'ROLE_CHANGE':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'REPORT_RESOLVED':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'REPORT_DISMISSED':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'SKILL_CREATED':
      case 'SKILL_UPDATED':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'SETTING_UPDATED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Administrative Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-1">
            Chronological, immutable event log of all sensitive administrative actions and moderation events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <div className="text-xs text-slate-400 font-medium">
            Logged Events: <span className="text-white font-bold">{total}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
        {/* Action Filter */}
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="text-slate-400 font-medium whitespace-nowrap">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Actions</option>
            <option value="USER_SUSPEND">USER_SUSPEND</option>
            <option value="USER_REACTIVATE">USER_REACTIVATE</option>
            <option value="ROLE_CHANGE">ROLE_CHANGE</option>
            <option value="REPORT_RESOLVED">REPORT_RESOLVED</option>
            <option value="REPORT_DISMISSED">REPORT_DISMISSED</option>
            <option value="SKILL_CREATED">SKILL_CREATED</option>
            <option value="SKILL_UPDATED">SKILL_UPDATED</option>
            <option value="SETTING_UPDATED">SETTING_UPDATED</option>
          </select>
        </div>

        {/* Target Filter */}
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="text-slate-400 font-medium whitespace-nowrap">Target Entity:</span>
          <select
            value={targetFilter}
            onChange={(e) => {
              setTargetFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Entities</option>
            <option value="USER">User Accounts</option>
            <option value="REPORT">Moderation Reports</option>
            <option value="SKILL">Skills</option>
            <option value="SETTING">Settings</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target</th>
                <th className="py-3.5 px-4">Payload / Details</th>
                <th className="py-3.5 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{log.actor?.name || 'System Admin'}</div>
                      <div className="text-[11px] text-slate-400">
                        @{log.actor?.username} •{' '}
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">
                          {log.actor?.role || 'ADMIN'}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="py-3.5 px-4">
                      <span className="text-slate-300 font-medium">{log.targetType}</span>
                      {log.targetId && (
                        <span className="text-slate-500 text-[11px] ml-1">#{log.targetId}</span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <code className="text-[11px] text-slate-300 font-mono bg-slate-950 p-1.5 rounded-md border border-slate-800 block truncate">
                        {log.details || '—'}
                      </code>
                    </td>

                    {/* IP */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Page <span className="text-white font-semibold">{page}</span> of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
