import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  HelpCircle,
  BookOpen,
  Users,
  Search,
  Plus,
  ThumbsUp,
  CheckCircle,
  Eye,
  Filter,
  Award,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '../components/app/AppLayout';
import {
  communityApi,
  type CommunityAnalyticsData,
  type CreatePostPayload,
} from '../lib/communityApi';
import { useSkills } from '../hooks/useSkills';

export const Community = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: skills = [] } = useSkills();

  // Filters & State
  const [activeTab, setActiveTab] = useState<'ALL' | 'DISCUSSION' | 'QUESTION' | 'RESOURCE'>('ALL');
  const [selectedSkillId, setSelectedSkillId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'unanswered'>('recent');
  const [page, setPage] = useState(1);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPostType, setNewPostType] = useState<'DISCUSSION' | 'QUESTION' | 'RESOURCE'>('DISCUSSION');
  const [newSkillId, setNewSkillId] = useState<number | undefined>(undefined);
  const [newTags, setNewTags] = useState('');

  // 1. Posts Query
  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ['community-posts', activeTab, selectedSkillId, searchQuery, sortBy, page],
    queryFn: () =>
      communityApi.listPosts({
        postType: activeTab,
        skillId: selectedSkillId,
        search: searchQuery || undefined,
        sort: sortBy,
        page,
        limit: 15,
      }),
  });

  // 2. Analytics Query
  const { data: analytics } = useQuery<CommunityAnalyticsData>({
    queryKey: ['community-analytics'],
    queryFn: () => communityApi.getAnalytics(),
  });

  // 3. Recommended Study Groups Query
  const { data: groupsData } = useQuery({
    queryKey: ['community-recommended-groups'],
    queryFn: () => communityApi.listGroups({ limit: 4 }),
  });

  // Mutations
  const createPostMutation = useMutation({
    mutationFn: (payload: CreatePostPayload) => communityApi.createPost(payload),
    onSuccess: (post) => {
      toast.success(
        post.postType === 'QUESTION' ? 'Question posted! 💡' : 'Discussion started! 💬'
      );
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['community-analytics'] });
      navigate(`/community/posts/${post.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to publish post');
    },
  });

  const voteMutation = useMutation({
    mutationFn: (postId: number) => communityApi.toggleVote('POST', postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update vote');
    },
  });

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Title and content are required');
      return;
    }
    createPostMutation.mutate({
      title: newTitle.trim(),
      content: newContent.trim(),
      postType: newPostType,
      skillId: newSkillId || null,
      tags: newTags.trim() || null,
    });
  };

  const getPostTypeBadge = (type: string) => {
    switch (type) {
      case 'QUESTION':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <HelpCircle className="w-3 h-3" /> Question
          </span>
        );
      case 'RESOURCE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <BookOpen className="w-3 h-3" /> Resource
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <MessageSquare className="w-3 h-3" /> Discussion
          </span>
        );
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 sm:p-10 text-white shadow-xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              SkillSwap Learning Community
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Learn in Public, Share Knowledge & Grow Together
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Ask coding questions, exchange peer tips, discover learning roadmaps, and form focused study groups with reciprocal skill partners.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Start Discussion
              </button>

              <Link
                to="/community/groups"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-xs hover:bg-white/20 transition-all"
              >
                <Users className="w-4 h-4 text-emerald-400" /> Explore Study Groups
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          {analytics && (
            <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-emerald-400">{analytics.totalPosts}</p>
                <p className="text-xs text-slate-400">Community Posts</p>
              </div>
              <div>
                <p className="text-2xl font-black text-amber-400">{analytics.totalQuestions}</p>
                <p className="text-xs text-slate-400">Questions Asked</p>
              </div>
              <div>
                <p className="text-2xl font-black text-teal-400">{analytics.resolvedQuestions}</p>
                <p className="text-xs text-slate-400">Solved Solutions</p>
              </div>
              <div>
                <p className="text-2xl font-black text-sky-400">{analytics.totalStudyGroups}</p>
                <p className="text-xs text-slate-400">Active Study Groups</p>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Feed Column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search discussions, questions, solutions, or tags..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 shrink-0">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSortBy(e.target.value as 'recent' | 'popular' | 'unanswered')
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Popular & Voted</option>
                  <option value="unanswered">Needs Answer</option>
                </select>
              </div>
            </div>

            {/* Post Type Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {[
                { id: 'ALL' as const, label: 'All Feeds', icon: MessageSquare },
                { id: 'DISCUSSION' as const, label: 'Discussions', icon: MessageSquare },
                { id: 'QUESTION' as const, label: 'Questions', icon: HelpCircle },
                { id: 'RESOURCE' as const, label: 'Resources & Guides', icon: BookOpen },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Active Skill Filter Pill (if any) */}
            {selectedSkillId && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Filtered by skill:</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  {skills.find((s) => s.id === selectedSkillId)?.name || 'Skill'}
                  <button
                    onClick={() => setSelectedSkillId(undefined)}
                    className="ml-1 hover:text-emerald-950 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}

            {/* Posts List */}
            {isPostsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : postsData?.posts && postsData.posts.length > 0 ? (
              <div className="space-y-4">
                {postsData.posts.map((post) => (
                  <div
                    key={post.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                          {post.author.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{post.author.name}</span>
                            <span className="text-[11px] text-slate-400">@{post.author.username}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {post.isResolved && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Solved
                          </span>
                        )}
                        {getPostTypeBadge(post.postType)}
                      </div>
                    </div>

                    <Link to={`/community/posts/${post.id}`} className="block group-hover:text-emerald-600 transition-colors">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {post.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>
                    </Link>

                    {/* Metadata & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        {post.skill && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {post.skill.name}
                          </span>
                        )}
                        {post.group && (
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                            👥 {post.group.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => voteMutation.mutate(post.id)}
                          className={`inline-flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                            post.hasUpvoted ? 'text-emerald-600' : 'text-slate-500 hover:text-emerald-600'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${post.hasUpvoted ? 'fill-emerald-500' : ''}`} />
                          {post.upvoteCount}
                        </button>

                        <Link
                          to={`/community/posts/${post.id}`}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {post.commentCount} {post.postType === 'QUESTION' ? 'answers' : 'replies'}
                        </Link>

                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Eye className="w-3.5 h-3.5" />
                          {post.viewCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {postsData.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-500">
                      Page {page} of {postsData.totalPages}
                    </span>
                    <button
                      disabled={page >= postsData.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">No discussions found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Be the first to kick off a discussion or ask a peer learning question!
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-500 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Discussion
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Skill Categories Widget */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-600" />
                Skill Categories
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedSkillId(undefined)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    selectedSkillId === undefined
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Skills
                </button>
                {skills.slice(0, 15).map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedSkillId(skill.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      selectedSkillId === skill.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Recommended Study Groups Widget */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Study Circles
                </h3>
                <Link to="/community/groups" className="text-xs font-semibold text-emerald-600 hover:underline">
                  View All
                </Link>
              </div>

              {groupsData?.groups && groupsData.groups.length > 0 ? (
                <div className="space-y-3">
                  {groupsData.groups.map((group) => (
                    <Link
                      key={group.id}
                      to={`/community/groups/${group.id}`}
                      className="block p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 line-clamp-1">{group.name}</span>
                        <span className="text-[10px] font-semibold text-slate-400">{group.memberCount} members</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{group.description}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No study groups formed yet.</p>
              )}
            </div>

            {/* Community Guidelines Widget */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-2">
              <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                Community Code of Conduct
              </h4>
              <p className="text-[11px] text-amber-800/80 leading-relaxed">
                SkillSwap is a safe peer exchange space. Be kind, credit original authors, provide actionable answers, and help fellow learners succeed.
              </p>
            </div>
          </div>
        </div>

        {/* Modal: Create Post */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Start a Community Post</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                {/* Post Type Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Post Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'DISCUSSION' as const, label: 'Discussion', icon: MessageSquare },
                      { id: 'QUESTION' as const, label: 'Ask Question', icon: HelpCircle },
                      { id: 'RESOURCE' as const, label: 'Share Resource', icon: BookOpen },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewPostType(t.id)}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          newPostType === t.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={
                      newPostType === 'QUESTION'
                        ? 'e.g. How do I optimize PostgreSQL connections in Node.js?'
                        : 'e.g. Tips for building reciprocal skill partnerships'
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                {/* Category Skill */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Skill Category (Optional)
                  </label>
                  <select
                    value={newSkillId || ''}
                    onChange={(e) => setNewSkillId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                  >
                    <option value="">General Community</option>
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
                  <textarea
                    required
                    rows={6}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Provide detailed context, code snippets, or discussion points..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="react, typescript, beginner"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                {/* Submit Buttons */}
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
                    disabled={createPostMutation.isPending}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                  >
                    {createPostMutation.isPending ? 'Publishing...' : 'Publish Post'}
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
export default Community;

