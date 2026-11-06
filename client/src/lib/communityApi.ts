import { apiFetch } from './api';

export interface AuthorSummary {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface SkillSummary {
  id: number;
  name: string;
  category: string;
}

export interface GroupSummary {
  id: number;
  name: string;
  slug: string;
  visibility: string;
}

export interface CommunityPostItem {
  id: number;
  authorId: number;
  skillId: number | null;
  groupId: number | null;
  postType: 'DISCUSSION' | 'QUESTION' | 'RESOURCE';
  title: string;
  content: string;
  tags: string | null;
  upvoteCount: number;
  commentCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isHidden: boolean;
  isResolved: boolean;
  acceptedAnswerId: number | null;
  createdAt: string;
  updatedAt: string;
  author: AuthorSummary;
  skill: SkillSummary | null;
  group: GroupSummary | null;
  hasUpvoted?: boolean;
}

export interface CommunityCommentItem {
  id: number;
  postId: number;
  authorId: number;
  parentId: number | null;
  content: string;
  depth: number;
  upvoteCount: number;
  isAcceptedAnswer: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  author: AuthorSummary;
  hasUpvoted?: boolean;
  replies?: CommunityCommentItem[];
}

export interface StudyGroupItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  skillId: number | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  membershipRules: string | null;
  creatorId: number;
  memberCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  creator: AuthorSummary;
  skill: SkillSummary | null;
  membership?: {
    isMember: boolean;
    role: 'OWNER' | 'MODERATOR' | 'MEMBER' | null;
    status: 'ACTIVE' | 'PENDING' | 'REJECTED' | null;
  };
}

export interface StudyGroupMemberItem {
  id: number;
  groupId: number;
  userId: number;
  role: 'OWNER' | 'MODERATOR' | 'MEMBER';
  status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  joinedAt: string;
  user: AuthorSummary;
}

export interface CommunityAnalyticsData {
  totalPosts: number;
  totalDiscussions: number;
  totalQuestions: number;
  resolvedQuestions: number;
  totalComments: number;
  totalStudyGroups: number;
  popularSkills: Array<{ skillId: number; name: string; count: number }>;
}

export interface CreatePostPayload {
  title: string;
  content: string;
  postType?: 'DISCUSSION' | 'QUESTION' | 'RESOURCE';
  skillId?: number | null;
  groupId?: number | null;
  tags?: string | null;
}

export interface CreateGroupPayload {
  name: string;
  description: string;
  skillId?: number | null;
  visibility?: 'PUBLIC' | 'PRIVATE';
  membershipRules?: string | null;
}

export const communityApi = {
  // Posts
  async listPosts(filters: {
    skillId?: number;
    groupId?: number | null;
    postType?: string;
    search?: string;
    sort?: 'recent' | 'popular' | 'unanswered';
    isResolved?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ posts: CommunityPostItem[]; total: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters.skillId) params.append('skillId', filters.skillId.toString());
    if (filters.groupId !== undefined) params.append('groupId', filters.groupId === null ? 'null' : filters.groupId.toString());
    if (filters.postType && filters.postType !== 'ALL') params.append('postType', filters.postType);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.isResolved !== undefined) params.append('isResolved', filters.isResolved.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const res = await apiFetch<{
      success: boolean;
      data: {
        posts: CommunityPostItem[];
        pagination: { total: number; totalPages: number };
      };
    }>(`/api/community/posts?${params.toString()}`);

    return {
      posts: res.data.posts,
      total: res.data.pagination.total,
      totalPages: res.data.pagination.totalPages,
    };
  },

  async getPost(id: number): Promise<CommunityPostItem> {
    const res = await apiFetch<{ success: boolean; data: { post: CommunityPostItem } }>(
      `/api/community/posts/${id}`
    );
    return res.data.post;
  },

  async createPost(payload: CreatePostPayload): Promise<CommunityPostItem> {
    const res = await apiFetch<{ success: boolean; data: { post: CommunityPostItem } }>(
      '/api/community/posts',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data.post;
  },

  async updatePost(id: number, payload: Partial<CreatePostPayload>): Promise<CommunityPostItem> {
    const res = await apiFetch<{ success: boolean; data: { post: CommunityPostItem } }>(
      `/api/community/posts/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    return res.data.post;
  },

  async deletePost(id: number): Promise<void> {
    await apiFetch(`/api/community/posts/${id}`, {
      method: 'DELETE',
    });
  },

  // Comments & Replies
  async getComments(postId: number): Promise<CommunityCommentItem[]> {
    const res = await apiFetch<{ success: boolean; data: { comments: CommunityCommentItem[] } }>(
      `/api/community/posts/${postId}/comments`
    );
    return res.data.comments;
  },

  async createComment(
    postId: number,
    payload: { content: string; parentId?: number | null }
  ): Promise<CommunityCommentItem> {
    const res = await apiFetch<{ success: boolean; data: { comment: CommunityCommentItem } }>(
      `/api/community/posts/${postId}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data.comment;
  },

  async deleteComment(postId: number, commentId: number): Promise<void> {
    await apiFetch(`/api/community/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  // Accepted Answer
  async markAcceptedAnswer(postId: number, commentId: number): Promise<void> {
    await apiFetch(`/api/community/posts/${postId}/comments/${commentId}/accept`, {
      method: 'POST',
    });
  },

  async unmarkAcceptedAnswer(postId: number): Promise<void> {
    await apiFetch(`/api/community/posts/${postId}/accept`, {
      method: 'DELETE',
    });
  },

  // Voting
  async toggleVote(targetType: 'POST' | 'COMMENT', targetId: number): Promise<{ upvoted: boolean; count: number }> {
    const res = await apiFetch<{ success: boolean; data: { upvoted: boolean; count: number } }>(
      '/api/community/vote',
      {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId }),
      }
    );
    return res.data;
  },

  // Reporting
  async reportContent(payload: {
    targetType: 'COMMUNITY_POST' | 'COMMUNITY_COMMENT' | 'STUDY_GROUP';
    targetId: number;
    category: string;
    reason: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch<{ success: boolean; message: string }>(
      '/api/community/report',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res;
  },

  // Analytics
  async getAnalytics(): Promise<CommunityAnalyticsData> {
    const res = await apiFetch<{ success: boolean; data: { analytics: CommunityAnalyticsData } }>(
      '/api/community/analytics'
    );
    return res.data.analytics;
  },

  // Study Groups
  async listGroups(filters: {
    skillId?: number;
    visibility?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ groups: StudyGroupItem[]; total: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters.skillId) params.append('skillId', filters.skillId.toString());
    if (filters.visibility && filters.visibility !== 'ALL') params.append('visibility', filters.visibility);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const res = await apiFetch<{
      success: boolean;
      data: {
        groups: StudyGroupItem[];
        pagination: { total: number; totalPages: number };
      };
    }>(`/api/community/groups?${params.toString()}`);

    return {
      groups: res.data.groups,
      total: res.data.pagination.total,
      totalPages: res.data.pagination.totalPages,
    };
  },

  async getUserGroups(): Promise<StudyGroupItem[]> {
    const res = await apiFetch<{ success: boolean; data: { groups: StudyGroupItem[] } }>(
      '/api/community/groups/my'
    );
    return res.data.groups;
  },

  async getGroup(id: number): Promise<StudyGroupItem> {
    const res = await apiFetch<{ success: boolean; data: { group: StudyGroupItem } }>(
      `/api/community/groups/${id}`
    );
    return res.data.group;
  },

  async getGroupBySlug(slug: string): Promise<StudyGroupItem> {
    const res = await apiFetch<{ success: boolean; data: { group: StudyGroupItem } }>(
      `/api/community/groups/slug/${slug}`
    );
    return res.data.group;
  },

  async createGroup(payload: CreateGroupPayload): Promise<StudyGroupItem> {
    const res = await apiFetch<{ success: boolean; data: { group: StudyGroupItem } }>(
      '/api/community/groups',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data.group;
  },

  async joinGroup(id: number): Promise<void> {
    await apiFetch(`/api/community/groups/${id}/join`, {
      method: 'POST',
    });
  },

  async requestJoinGroup(id: number): Promise<void> {
    await apiFetch(`/api/community/groups/${id}/request`, {
      method: 'POST',
    });
  },

  async handleMemberAction(
    groupId: number,
    userId: number,
    action: 'APPROVE' | 'REJECT' | 'PROMOTE_MODERATOR' | 'DEMOTE_MEMBER' | 'REMOVE'
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch<{ success: boolean; message: string }>(
      `/api/community/groups/${groupId}/members/action`,
      {
        method: 'POST',
        body: JSON.stringify({ userId, action }),
      }
    );
    return res;
  },

  async leaveGroup(id: number): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch<{ success: boolean; message: string }>(
      `/api/community/groups/${id}/leave`,
      {
        method: 'POST',
      }
    );
    return res;
  },

  async getGroupMembers(groupId: number, status: string = 'ACTIVE'): Promise<StudyGroupMemberItem[]> {
    const res = await apiFetch<{ success: boolean; data: { members: StudyGroupMemberItem[] } }>(
      `/api/community/groups/${groupId}/members?status=${status}`
    );
    return res.data.members;
  },
};

