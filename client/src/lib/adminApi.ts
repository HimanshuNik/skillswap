import { apiFetch } from './api';
import type { AuthUser } from '../types/user';

export interface PlatformOverviewStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    deactivated: number;
    newLast7Days: number;
    newLast30Days: number;
  };
  skills: {
    total: number;
    active: number;
    disabled: number;
  };
  swaps: {
    total: number;
    pending: number;
    accepted: number;
    completed: number;
    acceptanceRate: number;
  };
  sessions: {
    total: number;
    scheduled: number;
    completed: number;
    disputed: number;
    completionRate: number;
  };
  reviews: {
    total: number;
    averageRating: number;
  };
  reports: {
    pending: number;
    total: number;
  };
  emails: {
    pending: number;
    sent: number;
    failed: number;
    total: number;
  };
}

export interface GrowthTrends {
  userSignups: Array<{ date: string; count: number }>;
  sessionCompletions: Array<{ date: string; count: number }>;
  swapRequests: Array<{ date: string; count: number }>;
}

export interface TopSkills {
  topTeaching: Array<{ id: number; name: string; category: string; count: number }>;
  topLearning: Array<{ id: number; name: string; category: string; count: number }>;
}

export interface UserSkillItem {
  id: number;
  userId: number;
  skillId: number;
  proficiencyLevel?: string;
  targetLevel?: string;
  skill?: {
    id: number;
    name: string;
    category: string;
  };
}

export interface AdminUser extends AuthUser {
  role?: 'USER' | 'MODERATOR' | 'ADMIN';
  isSuspended?: boolean;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  suspendedBy?: number | null;
  isActive?: boolean;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  totalPages: number;
}

export interface AdminReport {
  id: number;
  reporterId: number;
  reportedId: number;
  targetType: string;
  targetId: number | null;
  category: string;
  reason: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolutionNotes: string | null;
  resolvedBy: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  reported: {
    id: number;
    name: string;
    username: string;
    email: string;
    isSuspended: boolean;
  };
}

export interface AdminReportListResponse {
  reports: AdminReport[];
  total: number;
  totalPages: number;
}

export interface AdminSkill {
  id: number;
  name: string;
  category: string;
  description: string | null;
  isDisabled: boolean;
  createdAt: string;
  teachersCount: number;
  learnersCount: number;
  totalUsage: number;
}

export interface AdminAuditLog {
  id: number;
  actorId: number;
  action: string;
  targetType: string;
  targetId: number | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: {
    id: number;
    name: string;
    username: string;
    email: string;
    role?: string;
  };
}

export interface AdminAuditListResponse {
  logs: AdminAuditLog[];
  total: number;
  totalPages: number;
}

export interface EmailJobRecord {
  id: number;
  recipientEmail: string;
  recipientName: string | null;
  template: string;
  subject: string;
  payload: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  scheduledFor: string;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailJobsResponse {
  stats: {
    pending: number;
    sent: number;
    failed: number;
    total: number;
  };
  recentJobs: EmailJobRecord[];
}

export interface PlatformSettingItem {
  value: string;
  description: string | null;
  updatedAt?: string;
}

export const adminApi = {
  async getOverview(): Promise<PlatformOverviewStats> {
    const res = await apiFetch<{ success: boolean; data: PlatformOverviewStats }>('/api/admin/overview');
    return res.data;
  },

  async getTrends(days = 14): Promise<GrowthTrends> {
    const res = await apiFetch<{ success: boolean; data: GrowthTrends }>(`/api/admin/trends?days=${days}`);
    return res.data;
  },

  async getTopSkills(limit = 5): Promise<TopSkills> {
    const res = await apiFetch<{ success: boolean; data: TopSkills }>(`/api/admin/skills/top?limit=${limit}`);
    return res.data;
  },

  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
  } = {}): Promise<AdminUserListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.role) query.set('role', params.role);

    const res = await apiFetch<{ success: boolean; data: AdminUserListResponse }>(`/api/admin/users?${query.toString()}`);
    return res.data;
  },

  async getUserDetails(id: number): Promise<{
    user: AdminUser;
    teachingSkills: UserSkillItem[];
    learningSkills: UserSkillItem[];
  }> {
    const res = await apiFetch<{
      success: boolean;
      data: { user: AdminUser; teachingSkills: UserSkillItem[]; learningSkills: UserSkillItem[] };
    }>(`/api/admin/users/${id}`);
    return res.data;
  },

  async suspendUser(id: number, reason: string): Promise<AdminUser> {
    const res = await apiFetch<{ success: boolean; data: AdminUser }>(`/api/admin/users/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.data;
  },

  async reactivateUser(id: number): Promise<AdminUser> {
    const res = await apiFetch<{ success: boolean; data: AdminUser }>(`/api/admin/users/${id}/reactivate`, {
      method: 'POST',
    });
    return res.data;
  },

  async changeUserRole(id: number, role: 'USER' | 'MODERATOR' | 'ADMIN'): Promise<AdminUser> {
    const res = await apiFetch<{ success: boolean; data: AdminUser }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    return res.data;
  },

  async getReports(params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
  } = {}): Promise<AdminReportListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);
    if (params.category) query.set('category', params.category);

    const res = await apiFetch<{ success: boolean; data: AdminReportListResponse }>(`/api/admin/reports?${query.toString()}`);
    return res.data;
  },

  async resolveReport(id: number, resolutionNotes: string, actionTaken?: 'NONE' | 'SUSPEND'): Promise<AdminReport> {
    const res = await apiFetch<{ success: boolean; data: AdminReport }>(`/api/admin/reports/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes, actionTaken }),
    });
    return res.data;
  },

  async dismissReport(id: number, resolutionNotes: string): Promise<AdminReport> {
    const res = await apiFetch<{ success: boolean; data: AdminReport }>(`/api/admin/reports/${id}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes }),
    });
    return res.data;
  },

  async getSkills(params: {
    search?: string;
    category?: string;
    status?: string;
  } = {}): Promise<AdminSkill[]> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category) query.set('category', params.category);
    if (params.status) query.set('status', params.status);

    const res = await apiFetch<{ success: boolean; data: AdminSkill[] }>(`/api/admin/skills?${query.toString()}`);
    return res.data;
  },

  async createSkill(data: { name: string; category: string; description?: string }): Promise<AdminSkill> {
    const res = await apiFetch<{ success: boolean; data: AdminSkill }>('/api/admin/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async updateSkill(
    id: number,
    data: { name?: string; category?: string; description?: string; isDisabled?: boolean }
  ): Promise<AdminSkill> {
    const res = await apiFetch<{ success: boolean; data: AdminSkill }>(`/api/admin/skills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },

  async getSettings(): Promise<Record<string, PlatformSettingItem>> {
    const res = await apiFetch<{ success: boolean; data: Record<string, PlatformSettingItem> }>('/api/admin/settings');
    return res.data;
  },

  async updateSettings(settings: Record<string, string>): Promise<Record<string, PlatformSettingItem>> {
    const res = await apiFetch<{ success: boolean; data: Record<string, PlatformSettingItem> }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
    return res.data;
  },

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    targetType?: string;
  } = {}): Promise<AdminAuditListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.action) query.set('action', params.action);
    if (params.targetType) query.set('targetType', params.targetType);

    const res = await apiFetch<{ success: boolean; data: AdminAuditListResponse }>(`/api/admin/audit?${query.toString()}`);
    return res.data;
  },

  async getEmailJobs(): Promise<EmailJobsResponse> {
    const res = await apiFetch<{ success: boolean; data: EmailJobsResponse }>('/api/admin/emails');
    return res.data;
  },

  async triggerReminders(): Promise<{ scanned: number; remindersQueued: number; jobsProcessed: number }> {
    const res = await apiFetch<{
      success: boolean;
      data: { scanned: number; remindersQueued: number; jobsProcessed: number };
    }>('/api/admin/reminders/run', {
      method: 'POST',
    });
    return res.data;
  },

  async submitReport(data: {
    reportedId: number;
    targetType: string;
    targetId?: number | null;
    category: string;
    reason: string;
  }): Promise<{ id: number; status: string }> {
    const res = await apiFetch<{ success: boolean; data: { id: number; status: string } }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
};
