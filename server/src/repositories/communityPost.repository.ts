import { db } from '../prisma/db.js';

export interface CommunityPostRecord {
  id: number;
  authorId: number;
  skillId: number | null;
  groupId: number | null;
  postType: string; // DISCUSSION, QUESTION, RESOURCE
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
}

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

export interface CommunityPostWithDetails extends CommunityPostRecord {
  author: AuthorSummary;
  skill: SkillSummary | null;
  group: GroupSummary | null;
  hasUpvoted?: boolean;
}

export class CommunityPostRepository {
  async create(data: {
    authorId: number;
    title: string;
    content: string;
    postType?: string;
    skillId?: number | null;
    groupId?: number | null;
    tags?: string | null;
  }): Promise<CommunityPostRecord> {
    const post = await db.orm.public.CommunityPost.create({
      authorId: data.authorId,
      title: data.title,
      content: data.content,
      postType: data.postType || 'DISCUSSION',
      skillId: data.skillId || null,
      groupId: data.groupId || null,
      tags: data.tags || null,
      upvoteCount: 0,
      commentCount: 0,
      viewCount: 0,
      isPinned: false,
      isLocked: false,
      isHidden: false,
      isResolved: false,
      acceptedAnswerId: null,
    });

    return post as unknown as CommunityPostRecord;
  }

  async findById(id: number): Promise<CommunityPostRecord | null> {
    const post = await db.orm.public.CommunityPost.where({ id }).first();
    return post as unknown as CommunityPostRecord | null;
  }

  async findMany(filters: {
    skillId?: number;
    groupId?: number | null;
    postType?: string;
    search?: string;
    sort?: 'recent' | 'popular' | 'unanswered';
    isResolved?: boolean;
    page?: number;
    limit?: number;
    includeHidden?: boolean;
    excludePrivateGroups?: boolean;
    allowedGroupIds?: number[];
  }): Promise<{ posts: CommunityPostRecord[]; total: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(50, filters.limit || 20));

    // Fetch candidate posts
    let allPosts = (await db.orm.public.CommunityPost.all()) as unknown as CommunityPostRecord[];

    // Filter hidden
    if (!filters.includeHidden) {
      allPosts = allPosts.filter((p) => !p.isHidden);
    }

    // Filter group privacy
    if (filters.groupId !== undefined) {
      if (filters.groupId === null) {
        // Only public community posts (not inside any group)
        allPosts = allPosts.filter((p) => p.groupId === null);
      } else {
        // Specific group
        allPosts = allPosts.filter((p) => p.groupId === filters.groupId);
      }
    } else if (filters.excludePrivateGroups) {
      // General community feed: exclude posts in private groups unless user is in allowedGroupIds
      const allowed = new Set(filters.allowedGroupIds || []);
      allPosts = allPosts.filter((p) => p.groupId === null || allowed.has(p.groupId));
    }

    // Filter skill
    if (filters.skillId !== undefined) {
      allPosts = allPosts.filter((p) => p.skillId === filters.skillId);
    }

    // Filter post type
    if (filters.postType && filters.postType !== 'ALL') {
      allPosts = allPosts.filter((p) => p.postType === filters.postType);
    }

    // Filter resolution status
    if (filters.isResolved !== undefined) {
      allPosts = allPosts.filter((p) => p.isResolved === filters.isResolved);
    }

    // Search keyword
    if (filters.search && filters.search.trim().length > 0) {
      const q = filters.search.toLowerCase().trim();
      allPosts = allPosts.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q);
        const contentMatch = p.content.toLowerCase().includes(q);
        const tagMatch = p.tags ? p.tags.toLowerCase().includes(q) : false;
        return titleMatch || contentMatch || tagMatch;
      });
    }

    // Total count before pagination
    const total = allPosts.length;

    // Sorting
    allPosts.sort((a, b) => {
      // Pinned posts always bubble to top unless sorting by specific criteria
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      if (filters.sort === 'popular') {
        const scoreA = a.upvoteCount * 2 + a.commentCount;
        const scoreB = b.upvoteCount * 2 + b.commentCount;
        if (scoreB !== scoreA) return scoreB - scoreA;
      } else if (filters.sort === 'unanswered') {
        if (a.commentCount !== b.commentCount) return a.commentCount - b.commentCount;
      }

      // Default: recent
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedPosts = allPosts.slice(startIndex, startIndex + limit);

    return { posts: paginatedPosts, total };
  }

  async update(id: number, data: Partial<CommunityPostRecord>): Promise<CommunityPostRecord | null> {
    const updated = await db.orm.public.CommunityPost.where({ id }).update({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.postType !== undefined && { postType: data.postType }),
      ...(data.skillId !== undefined && { skillId: data.skillId }),
      ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
      ...(data.isLocked !== undefined && { isLocked: data.isLocked }),
      ...(data.isHidden !== undefined && { isHidden: data.isHidden }),
      ...(data.isResolved !== undefined && { isResolved: data.isResolved }),
      ...(data.acceptedAnswerId !== undefined && { acceptedAnswerId: data.acceptedAnswerId }),
    });

    return (updated as unknown as CommunityPostRecord) || null;
  }

  async incrementUpvotes(id: number, delta: number): Promise<void> {
    const post = await this.findById(id);
    if (!post) return;
    const newCount = Math.max(0, post.upvoteCount + delta);
    await db.orm.public.CommunityPost.where({ id }).update({ upvoteCount: newCount });
  }

  async incrementComments(id: number, delta: number): Promise<void> {
    const post = await this.findById(id);
    if (!post) return;
    const newCount = Math.max(0, post.commentCount + delta);
    await db.orm.public.CommunityPost.where({ id }).update({ commentCount: newCount });
  }

  async incrementViews(id: number): Promise<void> {
    const post = await this.findById(id);
    if (!post) return;
    await db.orm.public.CommunityPost.where({ id }).update({ viewCount: post.viewCount + 1 });
  }

  async delete(id: number): Promise<void> {
    await db.orm.public.CommunityPost.where({ id }).delete();
  }

  async populateDetails(
    posts: CommunityPostRecord[],
    currentUserId?: number
  ): Promise<CommunityPostWithDetails[]> {
    if (posts.length === 0) return [];

    const authorIds = [...new Set(posts.map((p) => p.authorId))];
    const skillIds = [...new Set(posts.map((p) => p.skillId).filter((id): id is number => id !== null))];
    const groupIds = [...new Set(posts.map((p) => p.groupId).filter((id): id is number => id !== null))];
    const postIds = posts.map((p) => p.id);

    // Parallel lookups
    const [allUsers, allSkills, allGroups, userVotes] = await Promise.all([
      db.orm.public.User.all(),
      skillIds.length > 0 ? db.orm.public.Skill.all() : Promise.resolve([]),
      groupIds.length > 0 ? db.orm.public.StudyGroup.all() : Promise.resolve([]),
      currentUserId
        ? db.orm.public.CommunityVote.where({ userId: currentUserId, targetType: 'POST' }).all()
        : Promise.resolve([]),
    ]);

    const userMap = new Map(
      (allUsers as any[]).map((u) => [
        u.id,
        { id: u.id, name: u.name, username: u.username, avatarUrl: u.avatarUrl || null },
      ])
    );

    const skillMap = new Map(
      (allSkills as any[]).map((s) => [
        s.id,
        { id: s.id, name: s.name, category: s.category },
      ])
    );

    const groupMap = new Map(
      (allGroups as any[]).map((g) => [
        g.id,
        { id: g.id, name: g.name, slug: g.slug, visibility: g.visibility },
      ])
    );

    const upvotedPostIds = new Set(
      (userVotes as any[]).map((v) => v.targetId)
    );

    return posts.map((post) => {
      const author = userMap.get(post.authorId) || {
        id: post.authorId,
        name: 'Community Member',
        username: `user_${post.authorId}`,
        avatarUrl: null,
      };

      const skill = post.skillId ? skillMap.get(post.skillId) || null : null;
      const group = post.groupId ? groupMap.get(post.groupId) || null : null;
      const hasUpvoted = upvotedPostIds.has(post.id);

      return {
        ...post,
        author,
        skill,
        group,
        hasUpvoted,
      };
    });
  }
}
