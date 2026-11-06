import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminUser, type UserSkillItem } from '../../lib/adminApi';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Search,
  Shield,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-users', page, limit, statusFilter, roleFilter, search],
    queryFn: () =>
      adminApi.getUsers({
        page,
        limit,
        search: search.trim() || undefined,
        status: statusFilter,
        role: roleFilter,
      }),
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Modals & Selected Target
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userDetails, setUserDetails] = useState<{
    user: AdminUser;
    teachingSkills: UserSkillItem[];
    learningSkills: UserSkillItem[];
  } | null>(null);

  // Suspend Modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Role Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState<'USER' | 'MODERATOR' | 'ADMIN'>('USER');

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleOpenDetails = async (target: AdminUser) => {
    setSelectedUser(target);
    try {
      const details = await adminApi.getUserDetails(target.id);
      setUserDetails(details);
    } catch (err) {
      console.error('Failed to load user details:', err);
    }
  };

  const handleOpenSuspend = (target: AdminUser) => {
    setSelectedUser(target);
    setSuspendReason('');
    setActionError(null);
    setSuspendModalOpen(true);
  };

  const handleConfirmSuspend = async () => {
    if (!selectedUser || !suspendReason.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await adminApi.suspendUser(selectedUser.id, suspendReason.trim());
      setSuspendModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to suspend user account';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReactivate = async (target: AdminUser) => {
    try {
      await adminApi.reactivateUser(target.id);
      refetch();
    } catch (err) {
      console.error('Failed to reactivate user:', err);
    }
  };

  const handleOpenRoleModal = (target: AdminUser) => {
    setSelectedUser(target);
    setNewRole(target.role || 'USER');
    setActionError(null);
    setRoleModalOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await adminApi.changeUserRole(selectedUser.id, newRole);
      setRoleModalOpen(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user role';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Title & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Management Directory</h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, inspect profile history, assign platform roles, and handle account suspensions.
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
            Showing <span className="text-white font-bold">{users.length}</span> of {total} registered members
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username, or email..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9.5 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
            <span className="text-slate-400 font-medium whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Members</option>
              <option value="suspended">Suspended Accounts</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
            <span className="text-slate-400 font-medium whitespace-nowrap">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Roles</option>
              <option value="USER">Members (USER)</option>
              <option value="MODERATOR">Moderators</option>
              <option value="ADMIN">Administrators</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Sessions</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4">Joined</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching directory records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No users matching the specified filters were found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isTargetAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              u.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 text-[11px] truncate">
                              @{u.username} • {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : u.role === 'MODERATOR'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {u.role || 'USER'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                            Suspended
                          </span>
                        ) : u.isActive === false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                            Deactivated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Completed Sessions */}
                      <td className="py-3.5 px-4 text-slate-300 font-semibold">{u.completedSessions}</td>

                      {/* Rating */}
                      <td className="py-3.5 px-4">
                        <span className="text-amber-400 font-semibold">{u.averageRating.toFixed(1)}</span>
                        <span className="text-slate-500 text-[11px] ml-1">({u.totalReviews})</span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(u)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                          >
                            Details
                          </button>

                          {isAdmin && !isCurrent && (
                            <>
                              <button
                                onClick={() => handleOpenRoleModal(u)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                              >
                                Role
                              </button>

                              {u.isSuspended ? (
                                <button
                                  onClick={() => handleConfirmReactivate(u)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium transition flex items-center gap-1"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Reactivate
                                </button>
                              ) : (
                                !isTargetAdmin && (
                                  <button
                                    onClick={() => handleOpenSuspend(u)}
                                    className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition flex items-center gap-1"
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                    Suspend
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
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

      {/* Suspend User Modal */}
      {suspendModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Suspend User Account</h3>
              </div>
              <button
                onClick={() => setSuspendModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              You are about to suspend <strong className="text-white">@{selectedUser.username}</strong> ({selectedUser.name}). The user will immediately be blocked from logging in, scheduling sessions, or sending messages.
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-slate-300">
                Reason for Suspension <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Detail reason for audit logs and user notification email..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSuspendModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={actionLoading || suspendReason.trim().length < 3}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50"
              >
                {actionLoading ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {roleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Assign Platform Role</h3>
              </div>
              <button
                onClick={() => setRoleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Modify permissions for <strong className="text-white">@{selectedUser.username}</strong> ({selectedUser.name}).
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-slate-300">Select Role</label>
              <div className="space-y-2">
                {(['USER', 'MODERATOR', 'ADMIN'] as const).map((r) => (
                  <label
                    key={r}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      newRole === r
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{r}</div>
                      <div className="text-[11px] text-slate-400">
                        {r === 'ADMIN'
                          ? 'Full administrative control, settings, and suspensions'
                          : r === 'MODERATOR'
                          ? 'Review user reports and moderate skills'
                          : 'Standard community peer learner'}
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="roleOption"
                      checked={newRole === r}
                      onChange={() => setNewRole(r)}
                      className="accent-emerald-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Drawer */}
      {selectedUser && userDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <h3 className="font-bold text-white text-base">User Profile Summary</h3>
                <button
                  onClick={() => setUserDetails(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Card */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-emerald-400">
                  {userDetails.user.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{userDetails.user.name}</h4>
                  <p className="text-xs text-slate-400">@{userDetails.user.username} • ID: {userDetails.user.id}</p>
                  <p className="text-xs text-slate-400">{userDetails.user.email}</p>
                </div>
              </div>

              {/* Teaching Skills */}
              <div className="mb-6">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Skills Offered to Teach ({userDetails.teachingSkills.length})
                </h5>
                <div className="space-y-1.5">
                  {userDetails.teachingSkills.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No teaching skills listed.</p>
                  ) : (
                    userDetails.teachingSkills.map((ts) => (
                      <div
                        key={ts.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-white">{ts.skill?.name || 'Skill'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {ts.proficiencyLevel}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Learning Goals */}
              <div className="mb-6">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Skills Desired to Learn ({userDetails.learningSkills.length})
                </h5>
                <div className="space-y-1.5">
                  {userDetails.learningSkills.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No learning goals listed.</p>
                  ) : (
                    userDetails.learningSkills.map((ls) => (
                      <div
                        key={ls.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-white">{ls.skill?.name || 'Skill'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          Target: {ls.targetLevel}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setUserDetails(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
