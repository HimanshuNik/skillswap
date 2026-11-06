import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../lib/adminApi';
import {
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  RefreshCw,
} from 'lucide-react';

export const AdminEmails: React.FC = () => {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-emails'],
    queryFn: () => adminApi.getEmailJobs(),
  });

  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{
    scanned: number;
    remindersQueued: number;
    jobsProcessed: number;
  } | null>(null);

  const handleTriggerReminders = async () => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await adminApi.triggerReminders();
      setTriggerResult(res);
      refetch();
    } catch (err) {
      console.error('Failed to trigger reminders:', err);
    } finally {
      setTriggering(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading transactional email queue...</p>
        </div>
      </div>
    );
  }

  const getTemplateBadge = (template: string) => {
    switch (template) {
      case 'WELCOME':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PASSWORD_RESET':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'SWAP_REQUEST':
      case 'SWAP_ACCEPTED':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'SESSION_SCHEDULED':
      case 'SESSION_REMINDER':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'ACCOUNT_SUSPENDED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Title & Trigger Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactional Email Delivery Queue</h1>
          <p className="text-xs text-slate-400 mt-1">
            PostgreSQL-backed durable job queue for transactional notices, reminders, and security alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
          <button
            onClick={handleTriggerReminders}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
            <span>{triggering ? 'Dispatching...' : 'Dispatch Queue & Reminders'}</span>
          </button>
        </div>
      </div>

      {/* Trigger Feedback Banner */}
      {triggerResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Worker batch run complete: scanned <strong className="text-white">{triggerResult.scanned}</strong> scheduled sessions, queued <strong className="text-white">{triggerResult.remindersQueued}</strong> new reminders, and dispatched <strong className="text-white">{triggerResult.jobsProcessed}</strong> pending email jobs.
            </span>
          </div>
          <button
            onClick={() => setTriggerResult(null)}
            className="text-emerald-400/70 hover:text-emerald-400 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Enqueued</span>
            <Mail className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{data.stats.total}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Delivered / Sent</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{data.stats.sent}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Execution</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">{data.stats.pending}</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Failed / Retrying</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2">{data.stats.failed}</div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">Recent Transactional Jobs</h2>
          <span className="text-[11px] text-slate-500">Latest 25 entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/40 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Template</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {data.recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No transactional emails have been queued yet.
                  </td>
                </tr>
              ) : (
                data.recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{job.recipientName || 'Member'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{job.recipientEmail}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getTemplateBadge(
                          job.template
                        )}`}
                      >
                        {job.template}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-xs text-slate-200 truncate">{job.subject}</td>

                    <td className="py-3 px-4">
                      {job.status === 'SENT' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                        </span>
                      ) : job.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400">
                      {job.attempts} / {job.maxAttempts}
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
