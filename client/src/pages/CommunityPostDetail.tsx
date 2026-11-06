import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  CheckCircle,
  Share2,
  Trash2,
  Flag,
  Reply,
  Lock,
  Pin,
  Shield,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '../components/app/AppLayout';
import {
  communityApi,
  type CommunityPostItem,
  type CommunityCommentItem,
} from '../lib/communityApi';
import { useAuthStore } from '../store/useAuthStore';

export const CommunityPostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [commentContent, setCommentContent] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: 'COMMUNITY_POST' | 'COMMUNITY_COMMENT';
    id: number;
  }>({ type: 'COMMUNITY_POST', id: postId });
  const [reportCategory, setReportCategory] = useState<
    'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'MISLEADING' | 'OTHER'
  >('SPAM');
  const [reportReason, setReportReason] = useState('');

  // 1. Post Query
  const {
    data: post,
    isLoading: isPostLoading,
    error: postError,
  } = useQuery<CommunityPostItem>({
    queryKey: ['community-post', postId],
    queryFn: () => communityApi.getPost(postId),
    enabled: !isNaN(postId),
  });

  // 2. Comments Query
  const { data: comments = [], isLoading: isCommentsLoading } = useQuery<
    CommunityCommentItem[]
  >({
    queryKey: ['community-comments', postId],
    queryFn: () => communityApi.getComments(postId),
    enabled: !isNaN(postId),
  });

  // Mutations
  const votePostMutation = useMutation({
    mutationFn: () => communityApi.toggleVote('POST', postId),
    onSuccess: (data) => {
      queryClient.setQueryData<CommunityPostItem>(['community-post', postId], (old) => {
        if (!old) return old;
        return {
          ...old,
          hasUpvoted: data.upvoted,
          upvoteCount: data.count,
        };
      });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update vote'),
  });

  const voteCommentMutation = useMutation({
    mutationFn: (commentId: number) => communityApi.toggleVote('COMMENT', commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update vote'),
  });

  const createCommentMutation = useMutation({
    mutationFn: (payload: { content: string; parentId?: number | null }) =>
      communityApi.createComment(postId, payload),
    onSuccess: () => {
      toast.success(post?.postType === 'QUESTION' ? 'Answer posted! 💡' : 'Comment added! 💬');
      setCommentContent('');
      setReplyingToCommentId(null);
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-post', postId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to submit comment'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => communityApi.deleteComment(postId, commentId),
    onSuccess: () => {
      toast.success('Comment removed');
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-post', postId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete comment'),
  });

  const deletePostMutation = useMutation({
    mutationFn: () => communityApi.deletePost(postId),
    onSuccess: () => {
      toast.success('Post successfully deleted');
      navigate('/community');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete post'),
  });

  const markAcceptedMutation = useMutation({
    mutationFn: (commentId: number) => communityApi.markAcceptedAnswer(postId, commentId),
    onSuccess: () => {
      toast.success('Answer marked as accepted solution! +25 XP awarded 🎉');
      queryClient.invalidateQueries({ queryKey: ['community-post', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to accept solution'),
  });

  const unmarkAcceptedMutation = useMutation({
    mutationFn: () => communityApi.unmarkAcceptedAnswer(postId),
    onSuccess: () => {
      toast.success('Accepted answer unmarked');
      queryClient.invalidateQueries({ queryKey: ['community-post', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-comments', postId] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to unmark solution'),
  });

  const reportMutation = useMutation({
    mutationFn: () =>
      communityApi.reportContent({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        category: reportCategory,
        reason: reportReason.trim(),
      }),
    onSuccess: () => {
      toast.success('Report submitted. Our moderation team has been notified.');
      setIsReportModalOpen(false);
      setReportReason('');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to submit report'),
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Discussion link copied to clipboard!');
  };

  const isAuthor = user?.id === post?.authorId;
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  if (isPostLoading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="h-8 w-32 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-64 rounded-3xl bg-slate-100 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (!post || postError) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md text-center py-16 space-y-4">
          <Shield className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Discussion Not Available</h2>
          <p className="text-xs text-slate-500">
            This post may have been removed, locked, or belongs to a private study group you haven't joined yet.
          </p>
          <Link
            to="/community"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-500"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Community
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-8 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/community"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Community
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>

            <button
              onClick={() => {
                setReportTarget({ type: 'COMMUNITY_POST', id: post.id });
                setIsReportModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" /> Report
            </button>

            {(isAuthor || isPrivileged) && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this post?')) {
                    deletePostMutation.mutate();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Post Container */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {/* Post Header & Author */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                {post.author.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{post.author.name}</span>
                  <span className="text-xs text-slate-400">@{post.author.username}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {post.viewCount} views
                  </span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
              {post.isLocked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
              {post.isResolved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> Solved
                </span>
              )}
              {post.skill && (
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {post.skill.name}
                </span>
              )}
            </div>
          </div>

          {/* Title & Body */}
          <div className="space-y-4">
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              {post.title}
            </h1>
            <div className="prose prose-slate max-w-none text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {post.content}
            </div>
          </div>

          {/* Tags */}
          {post.tags && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {post.tags.split(',').map((tag, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                >
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Upvote & Reply Bar */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={() => votePostMutation.mutate()}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                post.hasUpvoted
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${post.hasUpvoted ? 'fill-white' : ''}`} />
              {post.upvoteCount} {post.hasUpvoted ? 'Upvoted' : 'Upvote'}
            </button>

            <span className="text-xs font-semibold text-slate-500">
              {comments.length} {post.postType === 'QUESTION' ? 'Answers' : 'Comments'}
            </span>
          </div>
        </div>

        {/* Comments / Answers Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            {post.postType === 'QUESTION' ? 'Answers & Solutions' : 'Discussion Thread'}
          </h2>

          {/* Post New Comment / Answer */}
          {!post.isLocked ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                {post.postType === 'QUESTION' ? 'Submit Your Answer' : 'Join the Discussion'}
              </label>
              <textarea
                rows={4}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={
                  post.postType === 'QUESTION'
                    ? 'Explain your solution step by step, including code or resource references...'
                    : 'Share your perspective or follow-up question...'
                }
                className="w-full rounded-xl border border-slate-300 p-3 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
              />
              <div className="flex justify-end">
                <button
                  disabled={createCommentMutation.isPending || !commentContent.trim()}
                  onClick={() => createCommentMutation.mutate({ content: commentContent.trim() })}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                >
                  {createCommentMutation.isPending
                    ? 'Submitting...'
                    : post.postType === 'QUESTION'
                    ? 'Post Answer (+25 XP if accepted)'
                    : 'Post Comment'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2 font-medium">
              <Lock className="w-4 h-4 text-slate-400" />
              This discussion is locked. New comments cannot be added.
            </div>
          )}

          {/* Comments List */}
          {isCommentsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`rounded-2xl border bg-white p-5 shadow-2xs space-y-3 transition-all ${
                    comment.isAcceptedAnswer
                      ? 'border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Accepted Solution Banner */}
                  {comment.isAcceptedAnswer && (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-100 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Accepted Solution
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold">+25 XP Awarded</span>
                    </div>
                  )}

                  {/* Comment Author Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                        {comment.author.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">{comment.author.name}</span>
                          <span className="text-[11px] text-slate-400">@{comment.author.username}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mark / Unmark Accepted Answer Button */}
                      {post.postType === 'QUESTION' && (isAuthor || isPrivileged) && !comment.isDeleted && (
                        comment.isAcceptedAnswer ? (
                          <button
                            onClick={() => unmarkAcceptedMutation.mutate()}
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                          >
                            Unmark Solution
                          </button>
                        ) : (
                          <button
                            onClick={() => markAcceptedMutation.mutate(comment.id)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 cursor-pointer"
                          >
                            Accept Solution
                          </button>
                        )
                      )}

                      {/* Delete comment */}
                      {(user?.id === comment.authorId || isPrivileged) && !comment.isDeleted && (
                        <button
                          onClick={() => {
                            if (confirm('Delete this comment?')) {
                              deleteCommentMutation.mutate(comment.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {comment.content}
                  </p>

                  {/* Footer: Vote and Reply buttons */}
                  {!comment.isDeleted && (
                    <div className="flex items-center gap-4 pt-1 text-xs">
                      <button
                        onClick={() => voteCommentMutation.mutate(comment.id)}
                        className={`inline-flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                          comment.hasUpvoted ? 'text-emerald-600' : 'text-slate-500 hover:text-emerald-600'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${comment.hasUpvoted ? 'fill-emerald-500' : ''}`} />
                        {comment.upvoteCount}
                      </button>

                      {!post.isLocked && (
                        <button
                          onClick={() =>
                            setReplyingToCommentId(
                              replyingToCommentId === comment.id ? null : comment.id
                            )
                          }
                          className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <Reply className="w-3.5 h-3.5" /> Reply
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setReportTarget({ type: 'COMMUNITY_COMMENT', id: comment.id });
                          setIsReportModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-600 ml-auto cursor-pointer"
                      >
                        <Flag className="w-3 h-3" /> Report
                      </button>
                    </div>
                  )}

                  {/* Inline Reply Form */}
                  {replyingToCommentId === comment.id && (
                    <div className="mt-3 pl-4 border-l-2 border-emerald-500 space-y-2">
                      <textarea
                        rows={2}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Reply to @${comment.author.username}...`}
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setReplyingToCommentId(null)}
                          className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={createCommentMutation.isPending || !replyContent.trim()}
                          onClick={() =>
                            createCommentMutation.mutate({
                              content: replyContent.trim(),
                              parentId: comment.id,
                            })
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Threaded Replies (Depth > 0) */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 space-y-3 pl-4 sm:pl-6 border-l-2 border-slate-100">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="rounded-xl bg-slate-50/60 p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{reply.author.name}</span>
                              <span className="text-[10px] text-slate-400">@{reply.author.username}</span>
                              <span className="text-[10px] text-slate-400">• {new Date(reply.createdAt).toLocaleDateString()}</span>
                            </div>
                            {(user?.id === reply.authorId || isPrivileged) && !reply.isDeleted && (
                              <button
                                onClick={() => {
                                  if (confirm('Delete this reply?')) {
                                    deleteCommentMutation.mutate(reply.id);
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{reply.content}</p>
                          {!reply.isDeleted && (
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                onClick={() => voteCommentMutation.mutate(reply.id)}
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                                  reply.hasUpvoted ? 'text-emerald-600' : 'text-slate-500 hover:text-emerald-600'
                                }`}
                              >
                                <ThumbsUp className={`w-3 h-3 ${reply.hasUpvoted ? 'fill-emerald-500' : ''}`} />
                                {reply.upvoteCount}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 italic">
              No answers or comments yet. Share your thoughts above!
            </div>
          )}
        </div>

        {/* Modal: Report Content */}
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-600" />
                Report Inappropriate Content
              </h3>
              <p className="text-xs text-slate-500">
                Help maintain a safe learning community. All reports are confidential and reviewed by moderators.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={reportCategory}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setReportCategory(
                        e.target.value as 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'MISLEADING' | 'OTHER'
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                  >
                    <option value="SPAM">Spam or Unsolicited Promotion</option>
                    <option value="HARASSMENT">Harassment or Hate Speech</option>
                    <option value="INAPPROPRIATE">Inappropriate or Offensive Material</option>
                    <option value="MISLEADING">Misleading Information or Plagiarism</option>
                    <option value="OTHER">Other Issue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Details & Reason</label>
                  <textarea
                    rows={4}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Describe why this content violates community guidelines..."
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reportMutation.isPending || reportReason.trim().length < 5}
                  onClick={() => reportMutation.mutate()}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
                >
                  {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
export default CommunityPostDetail;

