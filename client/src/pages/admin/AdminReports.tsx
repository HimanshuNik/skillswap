import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminReport } from '../../lib/adminApi';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  UserX,
  RefreshCw,
} from 'lucide-react';

export const AdminReports: React.FC = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-reports', page, limit, statusFilter, categoryFilter],
    queryFn: () =>
      adminApi.getReports({
        page,
        limit,
        status: statusFilter,
        category: categoryFilter,
      }),
  });

  const reports = data?.reports || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Resolution Modal
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [modalMode, setModalMode] = useState<'RESOLVE' | 'DISMISS'>('RESOLVE');
  const [notes, setNotes] = useState('');
  const [actionTaken, setActionTaken] = useState<'NONE' | 'SUSPEND'>('NONE');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenAction = (report: AdminReport, mode: 'RESOLVE' | 'DISMISS') => {
    setSelectedReport(report);
    setModalMode(mode);
    setNotes('');
    setActionTaken('NONE');
    setErrorMsg(null);
  };

  const handleSubmitResolution = async () => {
    if (!selectedReport) return;
    if (!notes.trim()) {
      setErrorMsg('Resolution notes are required for administrative records');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (modalMode === 'RESOLVE') {
        await adminApi.resolveReport(selectedReport.id, notes.trim(), actionTaken);
      } else {
        await adminApi.dismissReport(selectedReport.id, notes.trim());
      }
      setSelectedReport(null);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process report';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Community Moderation Queue</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review reported conduct, inspect evidence, record moderation decisions, and apply suspensions.
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
            Total Reports: <span className="text-white font-bold">{total}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs">
          {[
            { id: 'all', label: 'All Reports' },
            { id: 'OPEN', label: 'Open' },
            { id: 'RESOLVED', label: 'Resolved' },
            { id: 'DISMISSED', label: 'Dismissed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="text-slate-400 font-medium whitespace-nowrap">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            <option value="HARASSMENT">Harassment</option>
            <option value="SPAM">Spam</option>
            <option value="INAPPROPRIATE">Inappropriate Conduct</option>
            <option value="NO_SHOW">No-Show</option>
            <option value="FRAUD">Fraud</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Reported User</th>
                <th className="py-3.5 px-4">Reporter</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Reason / Evidence</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Submitted</th>
                <th className="py-3.5 px-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching moderation queue...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No reports found matching criteria.
                  </td>
                </tr>
              ) : (
                reports.map((r) => {
                  const isOpen = r.status === 'OPEN' || r.status === 'UNDER_REVIEW';

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      {/* Reported User */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{r.reported?.name || 'User'}</div>
                        <div className="text-[11px] text-slate-400">@{r.reported?.username}</div>
                        {r.reported?.isSuspended && (
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold mt-0.5 inline-block">
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Reporter */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{r.reporter?.name || 'Reporter'}</div>
                        <div className="text-[11px] text-slate-400">@{r.reporter?.username}</div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-amber-500/10 text-amber-400 border-amber-500/20">
                          {r.category}
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-300 line-clamp-2 leading-relaxed">{r.reason}</p>
                        {r.resolutionNotes && (
                          <p className="text-[11px] text-emerald-400 mt-1 italic">
                            Notes: {r.resolutionNotes}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {r.status === 'OPEN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <Clock className="w-3 h-3" /> Open
                          </span>
                        ) : r.status === 'RESOLVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                            <XCircle className="w-3 h-3" /> Dismissed
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isOpen ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenAction(r, 'RESOLVE')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleOpenAction(r, 'DISMISS')}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
                            >
                              Dismiss
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Closed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
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

      {/* Resolution / Dismissal Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                {modalMode === 'RESOLVE' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Resolve Report #{selectedReport.id}
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-slate-400" />
                    Dismiss Report #{selectedReport.id}
                  </>
                )}
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 mb-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Reported Member:</span>
                <span className="text-white font-semibold">
                  {selectedReport.reported.name} (@{selectedReport.reported.username})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Submitted By:</span>
                <span className="text-slate-300">
                  {selectedReport.reporter.name} (@{selectedReport.reporter.username})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="text-amber-400 font-bold">{selectedReport.category}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-slate-400 block mb-1">Reason / Description:</span>
                <p className="text-slate-200 italic bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  "{selectedReport.reason}"
                </p>
              </div>
            </div>

            {/* If resolving: Action taken toggle */}
            {modalMode === 'RESOLVE' && (
              <div className="space-y-2 mb-4">
                <label className="text-xs font-semibold text-slate-300">Sanction / Action to Apply</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionTaken('NONE')}
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition ${
                      actionTaken === 'NONE'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-slate-200">Issue Warning Only</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Resolve without suspension</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionTaken('SUSPEND')}
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition ${
                      actionTaken === 'SUSPEND'
                        ? 'bg-rose-500/10 border-rose-500/30 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-rose-400 flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5" /> Suspend User
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Suspend reported account</div>
                  </button>
                </div>
              </div>
            )}

            {/* Resolution Notes */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-slate-300">
                Moderation Notes <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain the justification for this decision (recorded to audit log)..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitResolution}
                disabled={submitting || !notes.trim()}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition disabled:opacity-50 ${
                  modalMode === 'RESOLVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {submitting ? 'Recording...' : modalMode === 'RESOLVE' ? 'Confirm Resolution' : 'Dismiss Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
