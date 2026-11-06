import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Plus,
  Lock,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '../components/app/AppLayout';
import {
  communityApi,
  type StudyGroupItem,
  type CreateGroupPayload,
} from '../lib/communityApi';
import { useSkills } from '../hooks/useSkills';
import { useAuthStore } from '../store/useAuthStore';

export const StudyGroups = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: skills = [] } = useSkills();

  // Filters & State
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<number | undefined>(undefined);
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');
  const [page] = useState(1);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupSkillId, setNewGroupSkillId] = useState<number | undefined>(undefined);
  const [newGroupVisibility, setNewGroupVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [newGroupRules, setNewGroupRules] = useState('');

  // 1. All Groups Query
  const { data: allGroupsData, isLoading: isAllLoading } = useQuery({
    queryKey: ['study-groups', searchQuery, selectedSkillId, visibilityFilter, page],
    queryFn: () =>
      communityApi.listGroups({
        search: searchQuery || undefined,
        skillId: selectedSkillId,
        visibility: visibilityFilter,
        page,
        limit: 12,
      }),
    enabled: activeTab === 'ALL',
  });

  // 2. My Groups Query
  const { data: myGroups = [], isLoading: isMyLoading } = useQuery<StudyGroupItem[]>({
    queryKey: ['my-study-groups'],
    queryFn: () => communityApi.getUserGroups(),
    enabled: activeTab === 'MY' && !!user,
  });

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: (payload: CreateGroupPayload) => communityApi.createGroup(payload),
    onSuccess: () => {
      toast.success('Study circle created! 🎉');
      setIsCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupRules('');
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-study-groups'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create group'),
  });

  const joinGroupMutation = useMutation({
    mutationFn: (groupId: number) => communityApi.joinGroup(groupId),
    onSuccess: () => {
      toast.success('Joined study group! Welcome 🎉');
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-study-groups'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to join group'),
  });

  const requestJoinMutation = useMutation({
    mutationFn: (groupId: number) => communityApi.requestJoinGroup(groupId),
    onSuccess: () => {
      toast.success('Membership request sent to group owner! 📨');
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to send request'),
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupDescription.trim()) {
      toast.error('Name and description are required');
      return;
    }
    createGroupMutation.mutate({
      name: newGroupName.trim(),
      description: newGroupDescription.trim(),
      skillId: newGroupSkillId || null,
      visibility: newGroupVisibility,
      membershipRules: newGroupRules.trim() || null,
    });
  };

  const groups = activeTab === 'ALL' ? allGroupsData?.groups || [] : myGroups;
  const isLoading = activeTab === 'ALL' ? isAllLoading : isMyLoading;

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        {/* Header Hero */}
        <div className="rounded-3xl bg-linear-to-r from-purple-900 via-indigo-900 to-slate-900 p-8 sm:p-10 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-500/30">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Collaborative Learning Circles
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">Peer Study Groups</h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Form small, focused cohorts around specific technologies. Share resources, hold weekly accountability meetups, and solve coding hurdles together.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-500 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Study Group
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Study Groups
            </button>
            <button
              onClick={() => setActiveTab('MY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'MY'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              My Groups {myGroups.length > 0 && `(${myGroups.length})`}
            </button>
          </div>

          <Link
            to="/community"
            className="text-xs font-semibold text-slate-500 hover:text-emerald-600"
          >
            ← Community Discussions
          </Link>
        </div>

        {/* Filters */}
        {activeTab === 'ALL' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups by name..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-purple-600 focus:outline-hidden"
              />
            </div>

            <select
              value={selectedSkillId || ''}
              onChange={(e) => setSelectedSkillId(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:border-purple-600 focus:outline-hidden"
            >
              <option value="">All Skills</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={visibilityFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setVisibilityFilter(e.target.value as 'ALL' | 'PUBLIC' | 'PRIVATE')
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:border-purple-600 focus:outline-hidden"
            >
              <option value="ALL">All Visibility (Public & Private)</option>
              <option value="PUBLIC">Public Groups (Open to All)</option>
              <option value="PRIVATE">Private Cohorts (Request to Join)</option>
            </select>
          </div>
        )}

        {/* Groups Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-48 rounded-3xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : groups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => {
              const isMember = group.membership?.isMember;
              const isPending = group.membership?.status === 'PENDING';

              return (
                <div
                  key={group.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-sm shadow-2xs">
                        {group.name.charAt(0)}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          group.visibility === 'PUBLIC'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {group.visibility === 'PUBLIC' ? (
                          <>
                            <Globe className="w-3 h-3" /> Public
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" /> Private
                          </>
                        )}
                      </span>
                    </div>

                    <div>
                      <Link to={`/community/groups/${group.id}`}>
                        <h3 className="text-base font-bold text-slate-900 hover:text-purple-600 transition-colors">
                          {group.name}
                        </h3>
                      </Link>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {group.description}
                      </p>
                    </div>

                    {group.skill && (
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {group.skill.name}
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      👥 {group.memberCount} members
                    </span>

                    {isMember ? (
                      <Link
                        to={`/community/groups/${group.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200 transition-all"
                      >
                        Enter Group <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200">
                        Request Pending
                      </span>
                    ) : group.visibility === 'PUBLIC' ? (
                      <button
                        onClick={() => joinGroupMutation.mutate(group.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition-all cursor-pointer"
                      >
                        Join Group
                      </button>
                    ) : (
                      <button
                        onClick={() => requestJoinMutation.mutate(group.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-all cursor-pointer"
                      >
                        Request Access
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">No study groups found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start your own study cohort to exchange knowledge with peers.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-purple-500 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Create Group
            </button>
          </div>
        )}

        {/* Modal: Create Study Group */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Create Study Group</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Group Name</label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. React 19 & TypeScript Study Circle"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-purple-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Focus Skill
                  </label>
                  <select
                    value={newGroupSkillId || ''}
                    onChange={(e) => setNewGroupSkillId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-purple-600 focus:outline-hidden"
                  >
                    <option value="">General Engineering & Design</option>
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Visibility</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewGroupVisibility('PUBLIC')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        newGroupVisibility === 'PUBLIC'
                          ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold text-xs text-slate-900 block">🌐 Public</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Anyone on SkillSwap can join immediately.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewGroupVisibility('PRIVATE')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        newGroupVisibility === 'PRIVATE'
                          ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold text-xs text-slate-900 block">🔒 Private</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Requires owner/moderator approval to join.
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Group Description & Purpose
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Describe your meeting rhythm, topics covered, and ideal member background..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-purple-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Membership Guidelines (Optional)
                  </label>
                  <input
                    type="text"
                    value={newGroupRules}
                    onChange={(e) => setNewGroupRules(e.target.value)}
                    placeholder="e.g. Active participation in weekly peer code reviews"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-purple-600 focus:outline-hidden"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createGroupMutation.isPending}
                    className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-purple-500 disabled:opacity-50 cursor-pointer"
                  >
                    {createGroupMutation.isPending ? 'Creating...' : 'Create Study Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
export default StudyGroups;

