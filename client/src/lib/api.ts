import type {
  AuthUser,
  Skill,
  FullProfile,
  PublicUserProfile,
  UserTeachingSkill,
  UserLearningSkill,
  UserAvailabilitySlot,
  DiscoverUser,
  DiscoverPagination,
  SkillMatch,
} from '../types/user';
import type { OnboardingData } from '../types/onboarding';
import type {
  SessionWithDetails,
  CreateSessionPayload,
  RescheduleSessionPayload,
  MeetingInfo,
} from '../types/session';
import type {
  Review,
  CreateReviewPayload,
  UserReputation,
  UserReviewsResponse,
} from '../types/review';
import type { Notification, NotificationsResponse } from '../types/notification';

export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: Array<{ field?: string; message: string }>;
  public readonly status: number;

  constructor(
    message: string,
    status = 500,
    code = 'INTERNAL_ERROR',
    details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Extracts a cookie value by name from document.cookie.
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Double submit CSRF protection
  const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
    (options.method || 'GET').toUpperCase()
  );
  if (isMutatingMethod) {
    const csrfToken = getCookie('skillswap_csrf');
    if (csrfToken && !headers.has('x-csrf-token')) {
      headers.set('x-csrf-token', csrfToken);
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // Always include HTTP-only cookies
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  const rawData: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errObj = typeof rawData === 'object' && rawData !== null ? (rawData as Record<string, unknown>) : null;
    const errInfo = typeof errObj?.error === 'object' && errObj.error !== null ? (errObj.error as Record<string, unknown>) : null;
    const errorMessage = typeof errInfo?.message === 'string' ? errInfo.message : typeof errObj?.message === 'string' ? errObj.message : response.statusText;
    const errorCode = typeof errInfo?.code === 'string' ? errInfo.code : 'REQUEST_FAILED';
    const errorDetails = Array.isArray(errInfo?.details)
      ? (errInfo.details as Array<{ field?: string; message: string }>)
      : undefined;
    throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
  }

  return rawData as T;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<{ user: AuthUser; csrfToken?: string }> {
    const res = await apiFetch<{ success: boolean; data: { user: AuthUser; csrfToken?: string } }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  async login(payload: LoginPayload): Promise<{ user: AuthUser; csrfToken?: string }> {
    const res = await apiFetch<{ success: boolean; data: { user: AuthUser; csrfToken?: string } }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  async logout(): Promise<void> {
    await apiFetch<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  async getMe(): Promise<{ user: AuthUser; csrfToken?: string }> {
    const res = await apiFetch<{ success: boolean; data: { user: AuthUser; csrfToken?: string } }>(
      '/api/auth/me'
    );
    return res.data;
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export const skillsApi = {
  async getSkills(category?: string): Promise<Skill[]> {
    const url = category ? `/api/skills?category=${encodeURIComponent(category)}` : '/api/skills';
    const res = await apiFetch<{ success: boolean; data: { skills: Skill[] } }>(url);
    return res.data.skills;
  },
};

export const onboardingApi = {
  async submit(payload: OnboardingData): Promise<FullProfile> {
    const res = await apiFetch<{ success: boolean; data: FullProfile }>('/api/onboarding', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
};

export const userApi = {
  async getMe(): Promise<FullProfile> {
    const res = await apiFetch<{ success: boolean; data: FullProfile }>('/api/users/me');
    return res.data;
  },

  async updateProfile(payload: {
    name?: string;
    bio?: string | null;
    location?: string | null;
    timezone?: string | null;
    avatarUrl?: string | null;
  }): Promise<{ user: AuthUser }> {
    const res = await apiFetch<{ success: boolean; data: { user: AuthUser } }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async getPublicProfile(username: string): Promise<PublicUserProfile> {
    const res = await apiFetch<{ success: boolean; data: PublicUserProfile }>(
      `/api/users/${encodeURIComponent(username)}`
    );
    return res.data;
  },

  async addTeachingSkill(payload: {
    skillId?: number;
    skillName?: string;
    proficiencyLevel: string;
  }): Promise<UserTeachingSkill> {
    const res = await apiFetch<{ success: boolean; data: { teachingSkill: UserTeachingSkill } }>(
      '/api/users/me/skills/teaching',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data.teachingSkill;
  },

  async removeTeachingSkill(skillId: number): Promise<void> {
    await apiFetch<{ success: boolean }>(`/api/users/me/skills/teaching/${skillId}`, {
      method: 'DELETE',
    });
  },

  async addLearningSkill(payload: {
    skillId?: number;
    skillName?: string;
    targetLevel: string;
  }): Promise<UserLearningSkill> {
    const res = await apiFetch<{ success: boolean; data: { learningSkill: UserLearningSkill } }>(
      '/api/users/me/skills/learning',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.data.learningSkill;
  },

  async removeLearningSkill(skillId: number): Promise<void> {
    await apiFetch<{ success: boolean }>(`/api/users/me/skills/learning/${skillId}`, {
      method: 'DELETE',
    });
  },

  async updateAvailability(payload: {
    schedule: UserAvailabilitySlot[];
    timezone?: string;
  }): Promise<UserAvailabilitySlot[]> {
    const res = await apiFetch<{ success: boolean; data: { availability: UserAvailabilitySlot[] } }>(
      '/api/users/me/availability',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    return res.data.availability;
  },

  async deleteAccount(payload: { password: string }): Promise<{ message: string }> {
    return apiFetch<{ success: boolean; message: string }>('/api/users/me', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },

  async getNotificationPreferences(): Promise<{
    swapRequests: boolean;
    messages: boolean;
    sessions: boolean;
    reviews: boolean;
    emailAlerts: boolean;
    pushEnabled?: boolean;
    pushSwapRequests?: boolean;
    pushMessages?: boolean;
    pushSessions?: boolean;
    pushReminders?: boolean;
    pushGroupActivity?: boolean;
  }> {
    const res = await apiFetch<{
      success: boolean;
      data: {
        preferences: {
          swapRequests: boolean;
          messages: boolean;
          sessions: boolean;
          reviews: boolean;
          emailAlerts: boolean;
          pushEnabled?: boolean;
          pushSwapRequests?: boolean;
          pushMessages?: boolean;
          pushSessions?: boolean;
          pushReminders?: boolean;
          pushGroupActivity?: boolean;
        };
      };
    }>('/api/users/me/notification-preferences');
    return res.data.preferences;
  },

  async updateNotificationPreferences(payload: {
    swapRequests?: boolean;
    messages?: boolean;
    sessions?: boolean;
    reviews?: boolean;
    emailAlerts?: boolean;
    pushEnabled?: boolean;
    pushSwapRequests?: boolean;
    pushMessages?: boolean;
    pushSessions?: boolean;
    pushReminders?: boolean;
    pushGroupActivity?: boolean;
  }): Promise<{
    swapRequests: boolean;
    messages: boolean;
    sessions: boolean;
    reviews: boolean;
    emailAlerts: boolean;
    pushEnabled?: boolean;
    pushSwapRequests?: boolean;
    pushMessages?: boolean;
    pushSessions?: boolean;
    pushReminders?: boolean;
    pushGroupActivity?: boolean;
  }> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: {
        preferences: {
          swapRequests: boolean;
          messages: boolean;
          sessions: boolean;
          reviews: boolean;
          emailAlerts: boolean;
          pushEnabled?: boolean;
          pushSwapRequests?: boolean;
          pushMessages?: boolean;
          pushSessions?: boolean;
          pushReminders?: boolean;
          pushGroupActivity?: boolean;
        };
      };
    }>('/api/users/me/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data.preferences;
  },
};

export const discoveryApi = {
  async getDiscoverUsers(params: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ users: DiscoverUser[]; pagination: DiscoverPagination }> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const url = qs ? `/api/users?${qs}` : '/api/users';
    const res = await apiFetch<{
      success: boolean;
      data: { users: DiscoverUser[]; pagination: DiscoverPagination };
    }>(url);
    return res.data;
  },
};

export const matchesApi = {
  async getMatches(limit = 20): Promise<{ matches: SkillMatch[]; total: number }> {
    const res = await apiFetch<{
      success: boolean;
      data: { matches: SkillMatch[]; total: number };
    }>(`/api/matches?limit=${limit}`);
    return res.data;
  },
};

export const swapRequestsApi = {
  async createSwapRequest(payload: {
    receiverId: number;
    senderSkillId: number;
    receiverSkillId: number;
    message?: string | null;
  }): Promise<import('../types/swapRequest').SwapRequest> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { swapRequest: import('../types/swapRequest').SwapRequest };
    }>('/api/swap-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.swapRequest;
  },

  async getIncomingRequests(): Promise<import('../types/swapRequest').SwapRequest[]> {
    const res = await apiFetch<{
      success: boolean;
      data: { requests: import('../types/swapRequest').SwapRequest[] };
    }>('/api/swap-requests/incoming');
    return res.data.requests;
  },

  async getOutgoingRequests(): Promise<import('../types/swapRequest').SwapRequest[]> {
    const res = await apiFetch<{
      success: boolean;
      data: { requests: import('../types/swapRequest').SwapRequest[] };
    }>('/api/swap-requests/outgoing');
    return res.data.requests;
  },

  async getPendingCount(): Promise<number> {
    const res = await apiFetch<{
      success: boolean;
      data: { pendingCount: number };
    }>('/api/swap-requests/pending-count');
    return res.data.pendingCount;
  },

  async getActiveWithUser(
    targetUserId: number
  ): Promise<import('../types/swapRequest').SwapRequest | null> {
    const res = await apiFetch<{
      success: boolean;
      data: { activeRequest: import('../types/swapRequest').SwapRequest | null };
    }>(`/api/swap-requests/with-user/${targetUserId}`);
    return res.data.activeRequest;
  },

  async acceptSwapRequest(
    id: number
  ): Promise<{ swapRequest: import('../types/swapRequest').SwapRequest; conversationId: number }> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { swapRequest: import('../types/swapRequest').SwapRequest; conversationId: number };
    }>(`/api/swap-requests/${id}/accept`, {
      method: 'PATCH',
    });
    return res.data;
  },

  async rejectSwapRequest(
    id: number
  ): Promise<import('../types/swapRequest').SwapRequest> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { swapRequest: import('../types/swapRequest').SwapRequest };
    }>(`/api/swap-requests/${id}/reject`, {
      method: 'PATCH',
    });
    return res.data.swapRequest;
  },

  async cancelSwapRequest(
    id: number
  ): Promise<import('../types/swapRequest').SwapRequest> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { swapRequest: import('../types/swapRequest').SwapRequest };
    }>(`/api/swap-requests/${id}/cancel`, {
      method: 'PATCH',
    });
    return res.data.swapRequest;
  },
};

export const conversationsApi = {
  async getConversations(): Promise<import('../types/chat').ConversationSummary[]> {
    const res = await apiFetch<{
      success: boolean;
      data: { conversations: import('../types/chat').ConversationSummary[] };
    }>('/api/conversations');
    return res.data.conversations;
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiFetch<{
      success: boolean;
      data: { unreadCount: number };
    }>('/api/conversations/unread-count');
    return res.data.unreadCount;
  },

  async getMessages(
    conversationId: number,
    options: { limit?: number; beforeId?: number } = {}
  ): Promise<import('../types/chat').ConversationMessagesResponse> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.beforeId) params.set('beforeId', String(options.beforeId));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch<{
      success: boolean;
      data: import('../types/chat').ConversationMessagesResponse;
    }>(`/api/conversations/${conversationId}/messages${qs}`);
    return res.data;
  },

  async sendMessage(
    conversationId: number,
    content: string,
    clientMessageId?: string
  ): Promise<import('../types/chat').ChatMessage> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { message: import('../types/chat').ChatMessage };
    }>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, clientMessageId }),
    });
    return res.data.message;
  },

  async markAsRead(
    conversationId: number
  ): Promise<{ conversationId: number; lastReadAt: string; readCount: number }> {
    const res = await apiFetch<{
      success: boolean;
      data: { conversationId: number; lastReadAt: string; readCount: number };
    }>(`/api/conversations/${conversationId}/read`, {
      method: 'PATCH',
    });
    return res.data;
  },
};

export const sessionsApi = {
  async getSessions(options: {
    filter?: 'upcoming' | 'past' | 'all';
    status?: string;
    role?: 'teacher' | 'learner';
    swapRequestId?: number;
  } = {}): Promise<SessionWithDetails[]> {
    const params = new URLSearchParams();
    if (options.filter) params.set('filter', options.filter);
    if (options.status) params.set('status', options.status);
    if (options.role) params.set('role', options.role);
    if (options.swapRequestId) params.set('swapRequestId', String(options.swapRequestId));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch<{
      success: boolean;
      data: { sessions: SessionWithDetails[] };
    }>(`/api/sessions${qs}`);
    return res.data.sessions;
  },

  async getSession(id: number): Promise<SessionWithDetails> {
    const res = await apiFetch<{
      success: boolean;
      data: { session: SessionWithDetails };
    }>(`/api/sessions/${id}`);
    return res.data.session;
  },

  async createSession(payload: CreateSessionPayload): Promise<SessionWithDetails> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { session: SessionWithDetails };
    }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.session;
  },

  async proposeReschedule(
    id: number,
    payload: RescheduleSessionPayload
  ): Promise<SessionWithDetails> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { session: SessionWithDetails };
    }>(`/api/sessions/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.session;
  },

  async respondReschedule(
    id: number,
    action: 'ACCEPT' | 'REJECT'
  ): Promise<SessionWithDetails> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { session: SessionWithDetails };
    }>(`/api/sessions/${id}/reschedule/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    return res.data.session;
  },

  async cancelSession(id: number, reason: string): Promise<SessionWithDetails> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { session: SessionWithDetails };
    }>(`/api/sessions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data.session;
  },

  async getMeetingInfo(id: number): Promise<MeetingInfo> {
    const res = await apiFetch<{
      success: boolean;
      data: MeetingInfo;
    }>(`/api/sessions/${id}/meeting`);
    return res.data;
  },

  async startSession(id: number): Promise<MeetingInfo> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: MeetingInfo;
    }>(`/api/sessions/${id}/start`, {
      method: 'POST',
    });
    return res.data;
  },

  async completeSession(id: number): Promise<SessionWithDetails> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { session: SessionWithDetails };
    }>(`/api/sessions/${id}/complete`, {
      method: 'POST',
    });
    return res.data.session;
  },

  async confirmCompletion(
    id: number,
    payload: { action: 'CONFIRM' | 'DISPUTE'; disputeReason?: string }
  ): Promise<SessionWithDetails> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { session: SessionWithDetails };
    }>(`/api/sessions/${id}/complete/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.session;
  },
};

export const reviewsApi = {
  async createReview(payload: CreateReviewPayload): Promise<Review> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { review: Review };
    }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.review;
  },

  async getUserReviews(
    userId: number,
    options: { limit?: number; page?: number; sort?: 'newest' | 'highest' | 'lowest' } = {}
  ): Promise<UserReviewsResponse> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.page) params.set('page', String(options.page));
    if (options.sort) params.set('sort', options.sort);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch<{
      success: boolean;
      data: UserReviewsResponse;
    }>(`/api/reviews/user/${userId}${qs}`);
    return res.data;
  },

  async getUserReputation(userId: number): Promise<UserReputation> {
    const res = await apiFetch<{
      success: boolean;
      data: { reputation: UserReputation };
    }>(`/api/users/${userId}/reputation`);
    return res.data.reputation;
  },

  async getSessionReviews(sessionId: number): Promise<Review[]> {
    const res = await apiFetch<{
      success: boolean;
      data: { reviews: Review[] };
    }>(`/api/reviews/session/${sessionId}`);
    return res.data.reviews;
  },
};

export const notificationsApi = {
  async getNotifications(options: {
    limit?: number;
    page?: number;
    unreadOnly?: boolean;
  } = {}): Promise<NotificationsResponse> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.page) params.set('page', String(options.page));
    if (options.unreadOnly) params.set('unreadOnly', 'true');

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await apiFetch<{
      success: boolean;
      data: NotificationsResponse;
    }>(`/api/notifications${qs}`);
    return res.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiFetch<{
      success: boolean;
      data: { unreadCount: number };
    }>('/api/notifications/unread-count');
    return res.data.unreadCount;
  },

  async markAsRead(id: number): Promise<Notification> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { notification: Notification };
    }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return res.data.notification;
  },

  async markAllAsRead(): Promise<{ markedCount: number; unreadCount: number }> {
    const res = await apiFetch<{
      success: boolean;
      message: string;
      data: { markedCount: number; unreadCount: number };
    }>('/api/notifications/read-all', {
      method: 'PATCH',
    });
    return res.data;
  },
};

export interface ProfileCompletionItem {
  key: string;
  label: string;
  actionUrl: string;
  completed: boolean;
  weight: number;
}

export interface ProfileCompletion {
  percentage: number;
  completedItems: string[];
  missingItems: Array<{ key: string; label: string; actionUrl: string }>;
  items: ProfileCompletionItem[];
}

export interface DashboardSummary {
  completedSessions: number;
  activeSwaps: number;
  completedSwaps: number;
  upcomingSessionsCount: number;
  pendingRequestsCount: number;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  averageRating: number;
  totalReviews: number;
  teachingSkillsCount: number;
  learningSkillsCount: number;
  profileCompletion: ProfileCompletion;
}

export interface ActivityItem {
  id: string;
  type: 'SWAP_REQUEST' | 'SESSION' | 'REVIEW' | 'NOTIFICATION';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  link: string;
  metadata?: Record<string, unknown>;
}

export interface AggregatedDashboard {
  summary: DashboardSummary;
  recommendations: SkillMatch[];
  upcomingSessions: SessionWithDetails[];
  nextSession: SessionWithDetails | null;
  recentActivity: ActivityItem[];
  profileCompletion: ProfileCompletion;
}

export const dashboardApi = {
  async getDashboard(): Promise<AggregatedDashboard> {
    const res = await apiFetch<{ success: boolean; data: AggregatedDashboard }>('/api/dashboard');
    return res.data;
  },

  async getSummary(): Promise<DashboardSummary> {
    const res = await apiFetch<{ success: boolean; data: DashboardSummary }>('/api/dashboard/summary');
    return res.data;
  },

  async getRecommendations(limit = 3): Promise<SkillMatch[]> {
    const res = await apiFetch<{ success: boolean; data: { recommendations: SkillMatch[] } }>(
      `/api/dashboard/recommendations?limit=${limit}`
    );
    return res.data.recommendations;
  },

  async getActivity(limit = 10): Promise<ActivityItem[]> {
    const res = await apiFetch<{ success: boolean; data: { activities: ActivityItem[] } }>(
      `/api/dashboard/activity?limit=${limit}`
    );
    return res.data.activities;
  },
};







