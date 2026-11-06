import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../lib/adminApi';
import {
  Users,
  Repeat,
  Video,
  Star,
  ShieldAlert,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Mail,
  CheckCircle2,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<14 | 30>(14);

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchOverview,
    isFetching,
  } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.getOverview(),
  });

  const { data: trends, isLoading: trendsLoading, refetch: refetchTrends } = useQuery({
    queryKey: ['admin-trends', timeRange],
    queryFn: () => adminApi.getTrends(timeRange),
  });

  const { data: topSkills, isLoading: skillsLoading, refetch: refetchSkills } = useQuery({
    queryKey: ['admin-top-skills'],
    queryFn: () => adminApi.getTopSkills(5),
  });

  const handleRefresh = () => {
    refetchOverview();
    refetchTrends();
    refetchSkills();
  };

  const loading = statsLoading || trendsLoading || skillsLoading;

  if (loading || !stats) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading platform metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, user exchange metrics, and system administration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setTimeRange(14)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                timeRange === 14 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setTimeRange(30)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                timeRange === 30 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Users */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Users</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{stats.users.total}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              <span>+{stats.users.newLast7Days} this week</span>
            </div>
          </div>
        </div>

        {/* Swap Activity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Swap Requests</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Repeat className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{stats.swaps.total}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span className="text-teal-400 font-semibold">{stats.swaps.acceptanceRate}%</span> accept rate
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Sessions</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Video className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{stats.sessions.total}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span className="text-cyan-400 font-semibold">{stats.sessions.completionRate}%</span> completed
            </div>
          </div>
        </div>

        {/* Skills Catalog */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Skill Catalog</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">{stats.skills.active}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>{stats.skills.disabled} disabled</span>
            </div>
          </div>
        </div>

        {/* Reputation Rating */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Platform Rating</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Star className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight">
              {stats.reviews.averageRating} <span className="text-sm font-normal text-slate-400">/ 5.0</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>{stats.reviews.total} reviews verified</span>
            </div>
          </div>
        </div>

        {/* Moderation Reports */}
        <div
          className={`rounded-2xl p-4.5 border flex flex-col justify-between ${
            stats.reports.pending > 0
              ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
              : 'bg-slate-900/90 border-slate-800 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Reports</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                stats.reports.pending > 0
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-white">{stats.reports.pending}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              <Link to="/admin/reports" className="text-rose-400 hover:underline inline-flex items-center gap-1 font-medium">
                Review queue <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Trends Visualizer */}
      {trends && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-white">Daily Growth & Exchange Velocity</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily member registrations, completed sessions, and swap requests over the last {timeRange} days.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-300">Signups</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-cyan-500" />
                <span className="text-slate-300">Sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-teal-500" />
                <span className="text-slate-300">Swaps</span>
              </div>
            </div>
          </div>

          {/* Bar Columns Container */}
          <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-slate-800/80 overflow-x-auto">
            {trends.userSignups.map((entry, idx) => {
              const signups = entry.count;
              const sessions = trends.sessionCompletions[idx]?.count || 0;
              const swaps = trends.swapRequests[idx]?.count || 0;
              const maxVal = Math.max(
                5,
                ...trends.userSignups.map((s) => s.count),
                ...trends.sessionCompletions.map((s) => s.count),
                ...trends.swapRequests.map((s) => s.count)
              );

              const hSignups = Math.round((signups / maxVal) * 140);
              const hSessions = Math.round((sessions / maxVal) * 140);
              const hSwaps = Math.round((swaps / maxVal) * 140);

              return (
                <div key={entry.date} className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 bg-slate-800 border border-slate-700 text-[10px] text-white px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none z-10 whitespace-nowrap">
                    <div>{entry.date}</div>
                    <div className="text-emerald-400">Signups: {signups}</div>
                    <div className="text-cyan-400">Sessions: {sessions}</div>
                    <div className="text-teal-400">Swaps: {swaps}</div>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    <div
                      style={{ height: `${Math.max(4, hSignups)}px` }}
                      className="w-1.5 rounded-t bg-emerald-500 hover:bg-emerald-400 transition"
                    />
                    <div
                      style={{ height: `${Math.max(4, hSessions)}px` }}
                      className="w-1.5 rounded-t bg-cyan-500 hover:bg-cyan-400 transition"
                    />
                    <div
                      style={{ height: `${Math.max(4, hSwaps)}px` }}
                      className="w-1.5 rounded-t bg-teal-500 hover:bg-teal-400 transition"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 truncate">
                    {entry.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Skills Leaderboard & Email Queue Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Taught Skills */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Top Teaching Skills</h3>
            <span className="text-[11px] text-emerald-400 font-medium">Supply</span>
          </div>
          <div className="space-y-3">
            {topSkills?.topTeaching.map((skill, index) => (
              <div key={skill.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 font-mono w-4">{index + 1}.</span>
                  <div>
                    <span className="font-semibold text-slate-200">{skill.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">({skill.category})</span>
                  </div>
                </div>
                <span className="font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {skill.count} teachers
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Desired Skills */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Top Learning Goals</h3>
            <span className="text-[11px] text-cyan-400 font-medium">Demand</span>
          </div>
          <div className="space-y-3">
            {topSkills?.topLearning.map((skill, index) => (
              <div key={skill.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 font-mono w-4">{index + 1}.</span>
                  <div>
                    <span className="font-semibold text-slate-200">{skill.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">({skill.category})</span>
                  </div>
                </div>
                <span className="font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {skill.count} learners
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System & Delivery Health */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Transactional Email Queue</h3>
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Total Enqueued</span>
                <span className="font-bold text-white">{stats.emails.total}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Successfully Sent</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {stats.emails.sent}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                <span className="text-slate-400">Pending in Queue</span>
                <span className="font-bold text-amber-400">{stats.emails.pending}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Failed / Retrying</span>
                <span className="font-bold text-rose-400">{stats.emails.failed}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <Link
              to="/admin/emails"
              className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
            >
              Open Email Queue Monitor <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
