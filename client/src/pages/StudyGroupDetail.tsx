import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  MessageSquare,
  Shield,
  Plus,
  Lock,
  Globe,
  ArrowLeft,
  Clock,
  Video,
  FileText,
  Download,
  ExternalLink,
  CheckSquare,
  Target,
  Megaphone,
  BarChart3,
  MessageCircle,
  Send,
  Pin,
  Trash2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '../components/app/AppLayout';
import {
  communityApi,
  type StudyGroupItem,
  type StudyGroupMemberItem,
  type CreatePostPayload,
  type CommunityPostItem,
} from '../lib/communityApi';
import {
  collaborationApi,
  type GroupSessionItem,
  type GroupResourceItem,
  type GroupTaskItem,
  type GroupMilestoneItem,
  type GroupMessageItem,
  type GroupAnnouncementItem,
  type GroupAnalyticsData,
} from '../lib/collaborationApi';
import { useAuthStore } from '../store/useAuthStore';
import { GroupSessionModal } from '../components/collaboration/GroupSessionModal';
import { GroupVideoMeetingModal } from '../components/collaboration/GroupVideoMeetingModal';
import { ResourceUploaderModal } from '../components/collaboration/ResourceUploaderModal';
import { GroupTaskModal } from '../components/collaboration/GroupTaskModal';
import { GroupMilestoneModal } from '../components/collaboration/GroupMilestoneModal';
import { GroupAnnouncementModal } from '../components/collaboration/GroupAnnouncementModal';
import { getSocket } from '../lib/socket';

type TabKey =
  | 'DISCUSSIONS'
  | 'SESSIONS'
  | 'RESOURCES'
  | 'TASKS'
  | 'MILESTONES'
  | 'CHAT'
  | 'ANNOUNCEMENTS'
  | 'ANALYTICS'
  | 'MEMBERS'
  | 'RULES';

interface StudyGroupDetailProps {
  defaultTab?: TabKey;
}

export const StudyGroupDetail: React.FC<StudyGroupDetailProps> = ({ defaultTab }) => {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const initialTab =
    defaultTab ||
    ((searchParams.get('tab')?.toUpperCase() as TabKey) || 'DISCUSSIONS');

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Sync tab with URL
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab: tab.toLowerCase() });
  };

  // Modals state
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'DISCUSSION' | 'QUESTION' | 'RESOURCE'>('DISCUSSION');

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [activeVideoSession, setActiveVideoSession] = useState<GroupSessionItem | null>(null);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Chat message input
  const [chatMessage, setChatMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Resource filters
  const [resourceFilter, setResourceFilter] = useState<'ALL' | 'LINK' | 'NOTE' | 'FILE' | 'IMAGE'>('ALL');
  const [resourceSearch, setResourceSearch] = useState('');

  // 1. Group Query
  const {
    data: group,
    isLoading: isGroupLoading,
    error: groupError,
  } = useQuery<StudyGroupItem>({
    queryKey: ['study-group', groupId],
    queryFn: () => communityApi.getGroup(groupId),
    enabled: !isNaN(groupId),
  });

  const isMember = !!group?.membership?.isMember;
  const isOwnerOrMod =
    group?.membership?.role === 'OWNER' ||
    group?.membership?.role === 'MODERATOR' ||
    user?.role === 'ADMIN';

  // 2. Members Query
  const { data: members = [] } = useQuery<StudyGroupMemberItem[]>({
    queryKey: ['study-group-members', groupId],
    queryFn: () => communityApi.getGroupMembers(groupId, 'ACTIVE'),
    enabled: !isNaN(groupId),
  });

  // 3. Pending Requests Query
  const { data: pendingMembers = [] } = useQuery<StudyGroupMemberItem[]>({
    queryKey: ['study-group-pending-members', groupId],
    queryFn: () => communityApi.getGroupMembers(groupId, 'PENDING'),
    enabled: !isNaN(groupId) && !!isOwnerOrMod,
  });

  // 4. Group Posts Query
  const { data: postsData } = useQuery({
    queryKey: ['study-group-posts', groupId],
    queryFn: () => communityApi.listPosts({ groupId, limit: 30 }),
    enabled: !isNaN(groupId) && (group?.visibility === 'PUBLIC' || isMember),
  });

  // 5. Sessions Query
  const { data: sessions = [] } = useQuery<GroupSessionItem[]>({
    queryKey: ['group-sessions', groupId],
    queryFn: () => collaborationApi.getSessions(groupId),
    enabled: !isNaN(groupId) && (group?.visibility === 'PUBLIC' || isMember),
  });

  // 6. Resources Query
  const { data: resources = [] } = useQuery<GroupResourceItem[]>({
    queryKey: ['group-resources', groupId, resourceFilter, resourceSearch],
    queryFn: () =>
      collaborationApi.getResources(groupId, {
        resourceType: resourceFilter !== 'ALL' ? resourceFilter : undefined,
        search: resourceSearch || undefined,
      }),
    enabled: !isNaN(groupId) && (group?.visibility === 'PUBLIC' || isMember),
  });

  // 7. Tasks Query
  const { data: tasks = [] } = useQuery<GroupTaskItem[]>({
    queryKey: ['group-tasks', groupId],
    queryFn: () => collaborationApi.getTasks(groupId),
    enabled: !isNaN(groupId) && (group?.visibility === 'PUBLIC' || isMember),
  });

  // 8. Milestones Query
  const { data: milestones = [] } = useQuery<GroupMilestoneItem[]>({
    queryKey: ['group-milestones', groupId],
    queryFn: () => collaborationApi.getMilestones(groupId),
    enabled: !isNaN(groupId) && (group?.visibility === 'PUBLIC' || isMember),
  });

  // 9. Announcements Query
  const { data: announcements = [] } = useQuery<GroupAnnouncementItem[]>({
    queryKey: ['group-announcements', groupId],
    queryFn: () => collaborationApi.getAnnouncements(groupId),
    enabled: !isNaN(groupId) && (group?.visibility === 'PUBLIC' || isMember),
  });

  // 10. Messages Query
  const { data: messages = [] } = useQuery<GroupMessageItem[]>({
    queryKey: ['group-messages', groupId],
    queryFn: () => collaborationApi.getMessages(groupId, 50),
    enabled: !isNaN(groupId) && isMember,
  });

  // 11. Analytics Query
  const { data: analytics } = useQuery<GroupAnalyticsData>({
    queryKey: ['group-analytics', groupId],
    queryFn: () => collaborationApi.getAnalytics(groupId),
    enabled: !isNaN(groupId) && activeTab === 'ANALYTICS' && (group?.visibility === 'PUBLIC' || isMember),
  });

  // Real-time Chat Socket listener
  useEffect(() => {
    if (!isMember || isNaN(groupId)) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('group:join', { groupId });

    const handleNewMessage = (payload: { groupId: number; message: GroupMessageItem }) => {
      if (payload.groupId === groupId) {
        queryClient.setQueryData<GroupMessageItem[]>(['group-messages', groupId], (prev) => [
          ...(prev || []),
          payload.message,
        ]);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };

    socket.on('group:message:new', handleNewMessage);

    return () => {
      socket.emit('group:leave', { groupId });
      socket.off('group:message:new', handleNewMessage);
    };
  }, [groupId, isMember, queryClient]);

  // Scroll to bottom of chat on load
  useEffect(() => {
    if (activeTab === 'CHAT') {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [activeTab, messages]);

  // Mutations
  const joinMutation = useMutation({
    mutationFn: () => communityApi.joinGroup(groupId),
    onSuccess: () => {
      toast.success('Joined study group! Welcome 🎉');
      queryClient.invalidateQueries({ queryKey: ['study-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['study-group-members', groupId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to join group'),
  });

  const requestJoinMutation = useMutation({
    mutationFn: () => communityApi.requestJoinGroup(groupId),
    onSuccess: () => {
      toast.success('Membership request submitted to group owner! 📨');
      queryClient.invalidateQueries({ queryKey: ['study-group', groupId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to request membership'),
  });

  const leaveMutation = useMutation({
    mutationFn: () => communityApi.leaveGroup(groupId),
    onSuccess: (data) => {
      toast.success(data.message || 'You left the group');
      queryClient.invalidateQueries({ queryKey: ['study-group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['study-group-members', groupId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to leave group'),
  });

  const memberActionMutation = useMutation({
    mutationFn: (variables: {
      targetUserId: number;
      action: 'APPROVE' | 'REJECT' | 'PROMOTE_MODERATOR' | 'DEMOTE_MEMBER' | 'REMOVE';
    }) => communityApi.handleMemberAction(groupId, variables.targetUserId, variables.action),
    onSuccess: () => {
      toast.success('Member updated successfully');
      queryClient.invalidateQueries({ queryKey: ['study-group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['study-group-pending-members', groupId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Action failed'),
  });

  const createPostMutation = useMutation({
    mutationFn: (payload: CreatePostPayload) => communityApi.createPost(payload),
    onSuccess: () => {
      toast.success('Post published to group! 💬');
      setIsPostModalOpen(false);
      setPostTitle('');
      setPostContent('');
      queryClient.invalidateQueries({ queryKey: ['study-group-posts', groupId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create post'),
  });

  const registerSessionMutation = useMutation({
    mutationFn: (sessionId: number) => collaborationApi.registerSession(groupId, sessionId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['group-sessions', groupId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Registration failed'),
  });

  const unregisterSessionMutation = useMutation({
    mutationFn: (sessionId: number) => collaborationApi.unregisterSession(groupId, sessionId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['group-sessions', groupId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Cancellation failed'),
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: (variables: { taskId: number; status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' }) =>
      collaborationApi.updateTask(groupId, variables.taskId, { status: variables.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-tasks', groupId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update task'),
  });

  const updateMilestoneStatusMutation = useMutation({
    mutationFn: (variables: { milestoneId: number; status: 'TODO' | 'IN_PROGRESS' | 'ACHIEVED' }) =>
      collaborationApi.updateMilestone(groupId, variables.milestoneId, {
        status: variables.status,
        isVerified: variables.status === 'ACHIEVED',
      }),
    onSuccess: () => {
      toast.success('Milestone updated!');
      queryClient.invalidateQueries({ queryKey: ['group-milestones', groupId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update milestone'),
  });

  const sendChatMessageMutation = useMutation({
    mutationFn: (content: string) => collaborationApi.sendMessage(groupId, content),
    onSuccess: () => {
      setChatMessage('');
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to send message'),
  });

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    sendChatMessageMutation.mutate(chatMessage);
  };

  if (isGroupLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (groupError || !group) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Study Group Not Found or Private</h2>
          <p className="mt-2 text-sm text-slate-500">
            This study group either does not exist or requires membership approval to view.
          </p>
          <Link
            to="/community/groups"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Study Groups
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        {/* Back Link */}
        <Link
          to="/community/groups"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Study Groups
        </Link>

        {/* Group Header Banner */}
        <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{group.name}</h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    group.visibility === 'PUBLIC'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                  }`}
                >
                  {group.visibility === 'PUBLIC' ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {group.visibility}
                </span>
                {group.skill && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                    {group.skill.name}
                  </span>
                )}
                {group.membership?.isMember && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Role: {group.membership.role}
                  </span>
                )}
              </div>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">{group.description}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {group.memberCount} members
                </span>
                <span>•</span>
                <span>Host: {group.creator.name}</span>
              </div>
            </div>

            {/* Membership Action Button */}
            <div>
              {!user ? (
                <Link
                  to="/login"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Log in to join
                </Link>
              ) : group.membership?.isMember ? (
                group.membership.role === 'OWNER' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-2 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300">
                    <Shield className="h-4 w-4" /> Group Owner
                  </span>
                ) : (
                  <button
                    onClick={() => leaveMutation.mutate()}
                    disabled={leaveMutation.isPending}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-red-950/30"
                  >
                    {leaveMutation.isPending ? 'Leaving...' : 'Leave Group'}
                  </button>
                )
              ) : group.membership?.status === 'PENDING' ? (
                <span className="rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                  Request Pending Approval ⏳
                </span>
              ) : group.visibility === 'PUBLIC' ? (
                <button
                  onClick={() => joinMutation.mutate()}
                  disabled={joinMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {joinMutation.isPending ? 'Joining...' : 'Join Group'}
                </button>
              ) : (
                <button
                  onClick={() => requestJoinMutation.mutate()}
                  disabled={requestJoinMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {requestJoinMutation.isPending ? 'Requesting...' : 'Request to Join'}
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            {[
              { key: 'DISCUSSIONS', label: 'Discussions', icon: MessageSquare, count: postsData?.total },
              { key: 'SESSIONS', label: 'Group Sessions', icon: Video, count: sessions.length },
              { key: 'RESOURCES', label: 'Resources', icon: FileText, count: resources.length },
              { key: 'TASKS', label: 'Tasks', icon: CheckSquare, count: tasks.length },
              { key: 'MILESTONES', label: 'Milestones', icon: Target, count: milestones.length },
              { key: 'CHAT', label: 'Group Chat', icon: MessageCircle, count: messages.length },
              { key: 'ANNOUNCEMENTS', label: 'Announcements', icon: Megaphone, count: announcements.length },
              { key: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
              { key: 'MEMBERS', label: 'Members', icon: Users, count: members.length },
              { key: 'RULES', label: 'Rules', icon: Shield },
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key as TabKey)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === key
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                      activeTab === key ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: DISCUSSIONS */}
        {activeTab === 'DISCUSSIONS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cohort Discussions</h2>
              {isMember && (
                <button
                  onClick={() => setIsPostModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" /> Start Discussion
                </button>
              )}
            </div>

            {postsData?.posts && postsData.posts.length > 0 ? (
              <div className="grid gap-3">
                {postsData.posts.map((post: CommunityPostItem) => (
                  <Link
                    key={post.id}
                    to={`/community/posts/${post.id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              post.postType === 'QUESTION'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                                : post.postType === 'RESOURCE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                            }`}
                          >
                            {post.postType}
                          </span>
                          {post.isResolved && (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <CheckCircle className="h-3.5 w-3.5" /> Resolved
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white">{post.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{post.content}</p>
                      </div>
                      <div className="text-right text-xs text-slate-400 whitespace-nowrap">
                        {post.commentCount} replies
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <MessageSquare className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No discussions yet</h3>
                <p className="mt-1 text-xs text-slate-500">Ask a question or share ideas with your cohort.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: SESSIONS */}
        {activeTab === 'SESSIONS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Group Learning Sessions</h2>
                <p className="text-xs text-slate-500">Live workshops, study sprints, and code reviews.</p>
              </div>
              {isOwnerOrMod && (
                <button
                  onClick={() => setIsSessionModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" /> Schedule Session
                </button>
              )}
            </div>

            {sessions.length > 0 ? (
              <div className="grid gap-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              sess.status === 'LIVE'
                                ? 'bg-red-500 text-white animate-pulse'
                                : sess.status === 'COMPLETED'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : sess.status === 'CANCELED'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}
                          >
                            {sess.status}
                          </span>
                          {sess.topic && (
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                              #{sess.topic}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{sess.title}</h3>
                        {sess.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{sess.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(sess.startTime).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {sess.participantCount || 1} / {sess.maxParticipants} participants
                          </span>
                          <span>•</span>
                          <span>Host: {sess.host.name}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                        {sess.canJoinMeeting && (
                          <button
                            onClick={() => setActiveVideoSession(sess)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                          >
                            <Video className="h-4 w-4" /> Join Video Meeting
                          </button>
                        )}

                        {sess.status === 'SCHEDULED' && (
                          sess.userRegistered ? (
                            sess.hostId !== user?.id ? (
                              <button
                                onClick={() => unregisterSessionMutation.mutate(sess.id)}
                                disabled={unregisterSessionMutation.isPending}
                                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300"
                              >
                                Cancel Registration
                              </button>
                            ) : (
                              <span className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Host Registered
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => registerSessionMutation.mutate(sess.id)}
                              disabled={registerSessionMutation.isPending || !isMember}
                              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              Register for Session
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <Video className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No sessions scheduled</h3>
                <p className="mt-1 text-xs text-slate-500">Group owners and moderators can schedule workshops.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: RESOURCES */}
        {activeTab === 'RESOURCES' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Shared Learning Library</h2>
                <p className="text-xs text-slate-500">Cheatsheets, guides, external documentation, and code snippets.</p>
              </div>
              {isMember && (
                <button
                  onClick={() => setIsResourceModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" /> Share Material
                </button>
              )}
            </div>

            {/* Filter buttons & Search */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', 'LINK', 'NOTE', 'FILE', 'IMAGE'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setResourceFilter(filter)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                      resourceFilter === filter
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                placeholder="Filter materials..."
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {resources.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {resources.map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                          {res.resourceType}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          By {res.uploader.name}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{res.title}</h4>
                      {res.description && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                          {res.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400">
                        {res.downloadCount > 0 ? `${res.downloadCount} downloads` : 'Recently shared'}
                      </span>
                      {res.resourceType === 'LINK' && res.url ? (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Visit Link
                        </a>
                      ) : res.filePath ? (
                        <a
                          href={collaborationApi.getDownloadUrl(groupId, res.id)}
                          download
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <FileText className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No resources shared yet</h3>
                <p className="mt-1 text-xs text-slate-500">Be the first to share notes or guides with your group.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: TASKS */}
        {activeTab === 'TASKS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Collaborative Task Board</h2>
                <p className="text-xs text-slate-500">Coordinate peer goals, exercises, and workshop assignments.</p>
              </div>
              {isMember && (
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" /> Add Task
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(['TODO', 'IN_PROGRESS', 'COMPLETED'] as const).map((status) => {
                const columnTasks = tasks.filter((t) => t.status === status);
                return (
                  <div
                    key={status}
                    className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {status === 'TODO' ? '📋 To Do' : status === 'IN_PROGRESS' ? '⚡ In Progress' : '✅ Completed'}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="mt-3 space-y-3 flex-1">
                      {columnTasks.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                t.priority === 'URGENT'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                  : t.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {t.priority}
                            </span>
                            {t.dueDate && (
                              <span className="text-[10px] text-slate-400">
                                Due {new Date(t.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h4 className="mt-1.5 text-xs font-semibold text-slate-900 dark:text-white">{t.title}</h4>
                          {t.description && (
                            <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 dark:text-slate-400">
                              {t.description}
                            </p>
                          )}
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800 text-[10px]">
                            <span className="text-slate-400">
                              {t.assignee ? `Assigned: ${t.assignee.name}` : 'Unassigned'}
                            </span>
                            {isMember && (
                              <div className="flex items-center gap-1">
                                {status !== 'IN_PROGRESS' && status !== 'COMPLETED' && (
                                  <button
                                    onClick={() => updateTaskStatusMutation.mutate({ taskId: t.id, status: 'IN_PROGRESS' })}
                                    className="text-indigo-600 hover:underline font-semibold"
                                  >
                                    Start →
                                  </button>
                                )}
                                {status !== 'COMPLETED' && (
                                  <button
                                    onClick={() => updateTaskStatusMutation.mutate({ taskId: t.id, status: 'COMPLETED' })}
                                    className="text-emerald-600 hover:underline font-semibold"
                                  >
                                    Done ✓
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-400">No tasks in this lane</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: MILESTONES */}
        {activeTab === 'MILESTONES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Group Learning Milestones</h2>
                <p className="text-xs text-slate-500">Shared goals and verifiable learning achievements.</p>
              </div>
              {isOwnerOrMod && (
                <button
                  onClick={() => setIsMilestoneModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" /> Define Milestone
                </button>
              )}
            </div>

            {milestones.length > 0 ? (
              <div className="grid gap-3">
                {milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                            m.status === 'ACHIEVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {m.status}
                        </span>
                        {m.isVerified && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle className="h-3.5 w-3.5" /> Verified Completion
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{m.title}</h4>
                      {m.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{m.description}</p>
                      )}
                      {m.targetDate && (
                        <p className="text-[10px] text-slate-400">
                          Target: {new Date(m.targetDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {isOwnerOrMod && m.status !== 'ACHIEVED' && (
                      <button
                        onClick={() => updateMilestoneStatusMutation.mutate({ milestoneId: m.id, status: 'ACHIEVED' })}
                        className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Mark Achieved ✓
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <Target className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No milestones defined yet</h3>
                <p className="mt-1 text-xs text-slate-500">Define shared group achievements to track progress.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: CHAT */}
        {activeTab === 'CHAT' && (
          <div className="flex h-[600px] flex-col rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Cohort Chat</h3>
                  <p className="text-[10px] text-slate-500">Real-time messaging with your study group members</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.sender.id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
                        msg.isAnnouncement ? 'bg-amber-50/50 p-2.5 rounded-xl border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{msg.sender.name}</span>
                        <span>•</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-2 text-xs leading-relaxed max-w-md ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No messages yet. Send a greeting to start the conversation!
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar */}
            {isMember ? (
              <form onSubmit={handleSendChat} className="border-t border-slate-100 p-3 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message to the group..."
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim() || sendChatMessageMutation.isPending}
                  className="rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="border-t border-slate-100 p-3 text-center text-xs text-slate-400 dark:border-slate-800">
                You must join this study group to participate in group chat.
              </div>
            )}
          </div>
        )}

        {/* Tab 7: ANNOUNCEMENTS */}
        {activeTab === 'ANNOUNCEMENTS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Group Announcements</h2>
                <p className="text-xs text-slate-500">Official updates from group owners and moderators.</p>
              </div>
              {isOwnerOrMod && (
                <button
                  onClick={() => setIsAnnouncementModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" /> Broadcast Announcement
                </button>
              )}
            </div>

            {announcements.length > 0 ? (
              <div className="grid gap-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className={`rounded-xl border p-5 shadow-xs transition ${
                      ann.isPinned
                        ? 'border-amber-300 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {ann.isPinned && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              <Pin className="h-3 w-3" /> Pinned Announcement
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            Posted by {ann.author.name} on {new Date(ann.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{ann.title}</h3>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{ann.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <Megaphone className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">No announcements posted</h3>
                <p className="mt-1 text-xs text-slate-500">Important notices from group moderators appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 8: ANALYTICS */}
        {activeTab === 'ANALYTICS' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Group Learning Analytics</h2>
              <p className="text-xs text-slate-500">Live PostgreSQL aggregated learning and participation statistics.</p>
            </div>

            {analytics ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <span className="text-xs text-slate-500">Active Members</span>
                    <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{analytics.totalMembers}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <span className="text-xs text-slate-500">Scheduled Sessions</span>
                    <div className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{analytics.scheduledSessions}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <span className="text-xs text-slate-500">Verified Attendance</span>
                    <div className="mt-1 text-2xl font-bold text-emerald-600">{analytics.verifiedAttendanceCount}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <span className="text-xs text-slate-500">Shared Resources</span>
                    <div className="mt-1 text-2xl font-bold text-amber-600">{analytics.sharedResourcesCount}</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Collaborative Tasks Completion</span>
                      <span className="text-xs font-bold text-indigo-600">{analytics.taskCompletionRate}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${analytics.taskCompletionRate}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {analytics.completedTasks} completed out of {analytics.totalTasks} total tasks
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Group Milestones Achieved</span>
                      <span className="text-xs font-bold text-emerald-600">{analytics.milestoneProgressRate}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                        style={{ width: `${analytics.milestoneProgressRate}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {analytics.achievedMilestones} achieved out of {analytics.totalMilestones} total milestones
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">Loading analytics...</div>
            )}
          </div>
        )}

        {/* Tab 9: MEMBERS */}
        {activeTab === 'MEMBERS' && (
          <div className="space-y-6">
            {/* Pending Requests for Owner/Mod */}
            {isOwnerOrMod && pendingMembers.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Pending Join Requests ({pendingMembers.length})
                </h3>
                <div className="grid gap-2">
                  {pendingMembers.map((pm) => (
                    <div
                      key={pm.userId}
                      className="flex items-center justify-between rounded-lg bg-white p-3 shadow-2xs dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700">
                          {pm.user.name[0]}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">{pm.user.name}</div>
                          <div className="text-[10px] text-slate-500">@{pm.user.username}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => memberActionMutation.mutate({ targetUserId: pm.userId, action: 'APPROVE' })}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => memberActionMutation.mutate({ targetUserId: pm.userId, action: 'REJECT' })}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Members Roster */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Members ({members.length})</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700">
                        {m.user.name[0]}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {m.user.name}
                          <span
                            className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                              m.role === 'OWNER'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                                : m.role === 'MODERATOR'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {m.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">@{m.user.username}</div>
                      </div>
                    </div>

                    {isOwnerOrMod && m.role !== 'OWNER' && m.userId !== user?.id && (
                      <div className="flex items-center gap-1">
                        {m.role === 'MEMBER' ? (
                          <button
                            onClick={() => memberActionMutation.mutate({ targetUserId: m.userId, action: 'PROMOTE_MODERATOR' })}
                            className="rounded-lg px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50"
                          >
                            Promote
                          </button>
                        ) : (
                          <button
                            onClick={() => memberActionMutation.mutate({ targetUserId: m.userId, action: 'DEMOTE_MEMBER' })}
                            className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            Demote
                          </button>
                        )}
                        <button
                          onClick={() => memberActionMutation.mutate({ targetUserId: m.userId, action: 'REMOVE' })}
                          className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 10: RULES */}
        {activeTab === 'RULES' && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" /> Study Group Guidelines & Code of Conduct
            </h3>
            <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 space-y-2">
              <p>{group.membershipRules || 'No custom rules defined by group creator. Standard SkillSwap community guidelines apply.'}</p>
              <ul className="list-disc pl-5 pt-2 space-y-1.5 text-xs text-slate-500">
                <li>Be respectful, supportive, and punctual during live learning sessions.</li>
                <li>Share only approved, safe learning materials without commercial or affiliate spam.</li>
                <li>Verify and document collaborative goals accurately to help peer members progress.</li>
                <li>Direct harassment or abusive content will lead to group removal and account suspension.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Modals */}
        <GroupSessionModal
          isOpen={isSessionModalOpen}
          onClose={() => setIsSessionModalOpen(false)}
          onSubmit={async (data) => {
            await collaborationApi.createSession(groupId, data);
            toast.success('Session scheduled successfully!');
            queryClient.invalidateQueries({ queryKey: ['group-sessions', groupId] });
          }}
        />

        <GroupVideoMeetingModal
          isOpen={!!activeVideoSession}
          onClose={() => setActiveVideoSession(null)}
          session={activeVideoSession}
        />

        <ResourceUploaderModal
          isOpen={isResourceModalOpen}
          onClose={() => setIsResourceModalOpen(false)}
          onSubmit={async (data) => {
            await collaborationApi.createResource(groupId, data);
            toast.success('Resource shared with cohort!');
            queryClient.invalidateQueries({ queryKey: ['group-resources', groupId] });
          }}
        />

        <GroupTaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          members={members}
          onSubmit={async (data) => {
            await collaborationApi.createTask(groupId, data);
            toast.success('Task created successfully!');
            queryClient.invalidateQueries({ queryKey: ['group-tasks', groupId] });
          }}
        />

        <GroupMilestoneModal
          isOpen={isMilestoneModalOpen}
          onClose={() => setIsMilestoneModalOpen(false)}
          onSubmit={async (data) => {
            await collaborationApi.createMilestone(groupId, data);
            toast.success('Milestone defined!');
            queryClient.invalidateQueries({ queryKey: ['group-milestones', groupId] });
          }}
        />

        <GroupAnnouncementModal
          isOpen={isAnnouncementModalOpen}
          onClose={() => setIsAnnouncementModalOpen(false)}
          onSubmit={async (data) => {
            await collaborationApi.createAnnouncement(groupId, data);
            toast.success('Announcement broadcast to group!');
            queryClient.invalidateQueries({ queryKey: ['group-announcements', groupId] });
          }}
        />

        {/* Phase 20 Post Creation Modal */}
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Start a Cohort Discussion</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createPostMutation.mutate({
                    title: postTitle,
                    content: postContent,
                    postType,
                    groupId,
                  });
                }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500">Post Type</label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as 'DISCUSSION' | 'QUESTION' | 'RESOURCE')}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="DISCUSSION">Discussion</option>
                    <option value="QUESTION">Question</option>
                    <option value="RESOURCE">Resource</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500">Title</label>
                  <input
                    type="text"
                    required
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="Discussion title..."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500">Content</label>
                  <textarea
                    rows={4}
                    required
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="What would you like to discuss?"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPostModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createPostMutation.isPending}
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createPostMutation.isPending ? 'Publishing...' : 'Publish'}
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

export default StudyGroupDetail;

