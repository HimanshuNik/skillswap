import { apiFetch } from './api';

const api = {
  get: <T>(url: string) => apiFetch<T>(`/api${url}`),
  post: <T>(url: string, body?: unknown) =>
    apiFetch<T>(`/api${url}`, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(url: string, body?: unknown) =>
    apiFetch<T>(`/api${url}`, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string) =>
    apiFetch<T>(`/api${url}`, {
      method: 'DELETE',
    }),
};

export interface AuthorSummary {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface GroupSessionItem {
  id: number;
  groupId: number;
  hostId: number;
  title: string;
  description: string | null;
  topic: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  maxParticipants: number;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELED';
  meetingRoomId: string | null;
  meetingUrl: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
  host: AuthorSummary;
  participantCount?: number;
  userRegistered?: boolean;
  canJoinMeeting?: boolean;
  isHost?: boolean;
}

export interface GroupParticipantItem {
  id: number;
  sessionId: number;
  userId: number;
  status: 'REGISTERED' | 'WAITLIST' | 'ATTENDED' | 'ABSENT' | 'CANCELLED';
  isVerifiedAttendance: boolean;
  notes: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
  user: AuthorSummary;
}

export interface GroupResourceItem {
  id: number;
  groupId: number;
  uploaderId: number;
  title: string;
  description: string | null;
  resourceType: 'LINK' | 'NOTE' | 'FILE' | 'IMAGE';
  url: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  visibility: 'MEMBERS' | 'PUBLIC';
  downloadCount: number;
  createdAt: string;
  uploader: AuthorSummary;
}

export interface GroupTaskItem {
  id: number;
  groupId: number;
  creatorId: number;
  assigneeId: number | null;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  creator: AuthorSummary;
  assignee: AuthorSummary | null;
}

export interface GroupMilestoneItem {
  id: number;
  groupId: number;
  creatorId: number;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'ACHIEVED';
  isVerified: boolean;
  completedAt: string | null;
  createdAt: string;
  creator: AuthorSummary;
}

export interface GroupMessageItem {
  id: number;
  groupId: number;
  senderId: number;
  content: string;
  isAnnouncement: boolean;
  isDeleted: boolean;
  createdAt: string;
  sender: AuthorSummary;
}

export interface GroupAnnouncementItem {
  id: number;
  groupId: number;
  authorId: number;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: AuthorSummary;
}

export interface GroupAnalyticsData {
  groupId: number;
  groupName: string;
  totalMembers: number;
  scheduledSessions: number;
  completedSessions: number;
  totalSessions: number;
  verifiedAttendanceCount: number;
  sharedResourcesCount: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  totalMilestones: number;
  achievedMilestones: number;
  milestoneProgressRate: number;
  totalMessages: number;
}

export const collaborationApi = {
  // --- Sessions ---
  async getSessions(groupId: number, status?: string): Promise<GroupSessionItem[]> {
    const params = status ? `?status=${status}` : '';
    const res = await api.get<{ success: boolean; data: GroupSessionItem[] }>(
      `/community/groups/${groupId}/sessions${params}`
    );
    return res.data;
  },

  async getSession(groupId: number, sessionId: number): Promise<GroupSessionItem> {
    const res = await api.get<{ success: boolean; data: GroupSessionItem }>(
      `/community/groups/${groupId}/sessions/${sessionId}`
    );
    return res.data;
  },

  async createSession(
    groupId: number,
    payload: {
      title: string;
      description?: string;
      topic?: string;
      startTime: string;
      endTime: string;
      timezone?: string;
      maxParticipants?: number;
    }
  ): Promise<GroupSessionItem> {
    const res = await api.post<{ success: boolean; data: GroupSessionItem }>(
      `/community/groups/${groupId}/sessions`,
      payload
    );
    return res.data;
  },

  async cancelSession(
    groupId: number,
    sessionId: number,
    reason?: string
  ): Promise<GroupSessionItem> {
    const res = await api.post<{ success: boolean; data: GroupSessionItem }>(
      `/community/groups/${groupId}/sessions/${sessionId}/cancel`,
      { reason }
    );
    return res.data;
  },

  // --- Registration & Attendance ---
  async registerSession(
    groupId: number,
    sessionId: number
  ): Promise<{ status: string; message: string }> {
    const res = await api.post<{ success: boolean; data: { status: string; message: string } }>(
      `/community/groups/${groupId}/sessions/${sessionId}/register`,
      {}
    );
    return res.data;
  },

  async unregisterSession(
    groupId: number,
    sessionId: number
  ): Promise<{ message: string }> {
    const res = await api.post<{ success: boolean; data: { message: string } }>(
      `/community/groups/${groupId}/sessions/${sessionId}/unregister`,
      {}
    );
    return res.data;
  },

  async getParticipants(groupId: number, sessionId: number): Promise<GroupParticipantItem[]> {
    const res = await api.get<{ success: boolean; data: GroupParticipantItem[] }>(
      `/community/groups/${groupId}/sessions/${sessionId}/participants`
    );
    return res.data;
  },

  async updateAttendance(
    groupId: number,
    sessionId: number,
    participantUserId: number,
    payload: { isVerifiedAttendance?: boolean; status?: string; notes?: string }
  ): Promise<GroupParticipantItem> {
    const res = await api.patch<{ success: boolean; data: GroupParticipantItem }>(
      `/community/groups/${groupId}/sessions/${sessionId}/participants/${participantUserId}/attendance`,
      payload
    );
    return res.data;
  },

  // --- Resources ---
  async getResources(
    groupId: number,
    options?: { resourceType?: string; search?: string }
  ): Promise<GroupResourceItem[]> {
    const q = new URLSearchParams();
    if (options?.resourceType) q.append('resourceType', options.resourceType);
    if (options?.search) q.append('search', options.search);
    const qs = q.toString() ? `?${q.toString()}` : '';

    const res = await api.get<{ success: boolean; data: GroupResourceItem[] }>(
      `/community/groups/${groupId}/resources${qs}`
    );
    return res.data;
  },

  async createResource(
    groupId: number,
    payload: {
      title: string;
      description?: string;
      resourceType: 'LINK' | 'NOTE' | 'FILE' | 'IMAGE';
      url?: string;
      content?: string;
      fileName?: string;
      fileData?: string;
      mimeType?: string;
      visibility?: 'MEMBERS' | 'PUBLIC';
    }
  ): Promise<GroupResourceItem> {
    const res = await api.post<{ success: boolean; data: GroupResourceItem }>(
      `/community/groups/${groupId}/resources`,
      payload
    );
    return res.data;
  },

  async deleteResource(groupId: number, resourceId: number): Promise<void> {
    await api.delete(`/community/groups/${groupId}/resources/${resourceId}`);
  },

  getDownloadUrl(groupId: number, resourceId: number): string {
    return `/api/community/groups/${groupId}/resources/${resourceId}/download`;
  },

  // --- Tasks ---
  async getTasks(
    groupId: number,
    options?: { status?: string; assigneeId?: number }
  ): Promise<GroupTaskItem[]> {
    const q = new URLSearchParams();
    if (options?.status) q.append('status', options.status);
    if (options?.assigneeId) q.append('assigneeId', String(options.assigneeId));
    const qs = q.toString() ? `?${q.toString()}` : '';

    const res = await api.get<{ success: boolean; data: GroupTaskItem[] }>(
      `/community/groups/${groupId}/tasks${qs}`
    );
    return res.data;
  },

  async createTask(
    groupId: number,
    payload: {
      title: string;
      description?: string;
      assigneeId?: number;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      dueDate?: string;
    }
  ): Promise<GroupTaskItem> {
    const res = await api.post<{ success: boolean; data: GroupTaskItem }>(
      `/community/groups/${groupId}/tasks`,
      payload
    );
    return res.data;
  },

  async updateTask(
    groupId: number,
    taskId: number,
    payload: {
      title?: string;
      description?: string;
      assigneeId?: number | null;
      priority?: string;
      status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
      dueDate?: string | null;
    }
  ): Promise<GroupTaskItem> {
    const res = await api.patch<{ success: boolean; data: GroupTaskItem }>(
      `/community/groups/${groupId}/tasks/${taskId}`,
      payload
    );
    return res.data;
  },

  async deleteTask(groupId: number, taskId: number): Promise<void> {
    await api.delete(`/community/groups/${groupId}/tasks/${taskId}`);
  },

  // --- Milestones ---
  async getMilestones(groupId: number): Promise<GroupMilestoneItem[]> {
    const res = await api.get<{ success: boolean; data: GroupMilestoneItem[] }>(
      `/community/groups/${groupId}/milestones`
    );
    return res.data;
  },

  async createMilestone(
    groupId: number,
    payload: { title: string; description?: string; targetDate?: string }
  ): Promise<GroupMilestoneItem> {
    const res = await api.post<{ success: boolean; data: GroupMilestoneItem }>(
      `/community/groups/${groupId}/milestones`,
      payload
    );
    return res.data;
  },

  async updateMilestone(
    groupId: number,
    milestoneId: number,
    payload: { status?: 'TODO' | 'IN_PROGRESS' | 'ACHIEVED'; isVerified?: boolean }
  ): Promise<GroupMilestoneItem> {
    const res = await api.patch<{ success: boolean; data: GroupMilestoneItem }>(
      `/community/groups/${groupId}/milestones/${milestoneId}`,
      payload
    );
    return res.data;
  },

  async deleteMilestone(groupId: number, milestoneId: number): Promise<void> {
    await api.delete(`/community/groups/${groupId}/milestones/${milestoneId}`);
  },

  // --- Chat ---
  async getMessages(groupId: number, limit?: number): Promise<GroupMessageItem[]> {
    const p = limit ? `?limit=${limit}` : '';
    const res = await api.get<{ success: boolean; data: GroupMessageItem[] }>(
      `/community/groups/${groupId}/messages${p}`
    );
    return res.data;
  },

  async sendMessage(groupId: number, content: string): Promise<GroupMessageItem> {
    const res = await api.post<{ success: boolean; data: GroupMessageItem }>(
      `/community/groups/${groupId}/messages`,
      { content }
    );
    return res.data;
  },

  // --- Announcements ---
  async getAnnouncements(groupId: number): Promise<GroupAnnouncementItem[]> {
    const res = await api.get<{ success: boolean; data: GroupAnnouncementItem[] }>(
      `/community/groups/${groupId}/announcements`
    );
    return res.data;
  },

  async createAnnouncement(
    groupId: number,
    payload: { title: string; content: string; isPinned?: boolean }
  ): Promise<GroupAnnouncementItem> {
    const res = await api.post<{ success: boolean; data: GroupAnnouncementItem }>(
      `/community/groups/${groupId}/announcements`,
      payload
    );
    return res.data;
  },

  async deleteAnnouncement(groupId: number, announcementId: number): Promise<void> {
    await api.delete(`/community/groups/${groupId}/announcements/${announcementId}`);
  },

  // --- Analytics ---
  async getAnalytics(groupId: number): Promise<GroupAnalyticsData> {
    const res = await api.get<{ success: boolean; data: GroupAnalyticsData }>(
      `/community/groups/${groupId}/analytics`
    );
    return res.data;
  },
};
