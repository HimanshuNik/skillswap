import { apiFetch } from './api';

// ---- AI Recommendations & Similarity ----

export interface AIRecommendationUser {
  userId: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  location: string | null;
  averageRating: number;
  totalReviews: number;
  score: number; // 0 - 100
  recommendationReason: string;
  explanation: string;
  matchedTeachingSkill: string;
  matchedLearningSkill: string;
  teachingScore: number;
  learningScore: number;
  availabilityScore: number;
  ratingScore: number;
  matchingDays: string[];
  userTimezone: string;
  partnerTimezone: string;
}

export interface AIRecommendationsResponse {
  data: AIRecommendationUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SkillSimilarityResponse {
  skillA: string;
  skillB: string;
  similarity: number;
  relationship: 'EXACT' | 'ALIAS' | 'RELATED' | 'UNRELATED';
  isCanonicalMatch: boolean;
  canonicalSkillA?: { id: number; name: string };
  canonicalSkillB?: { id: number; name: string };
  explanation: string;
}

export type RecommendationFeedbackType = 'HELPFUL' | 'NOT_RELEVANT' | 'ALREADY_CONNECTED' | 'NOT_INTERESTED';

// ---- Learning Roadmaps ----

export interface RoadmapMilestone {
  id: number;
  roadmapId: number;
  orderIndex: number;
  title: string;
  description: string | null;
  topics: string[];
  practiceProjects: string[];
  suggestedSessionGoals: string[];
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuggestedMentor {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  averageRating: number;
  totalReviews: number;
}

export interface LearningRoadmap {
  id: number;
  userId: number;
  skillId: number | null;
  skillName: string;
  currentProficiency: string;
  targetProficiency: string;
  learningObjective: string;
  preferredPace: 'RELAXED' | 'MODERATE' | 'INTENSIVE';
  estimatedWeeks: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
  milestones: RoadmapMilestone[];
  suggestedPartners?: SuggestedMentor[];
}

export interface CreateRoadmapPayload {
  skillName: string;
  currentProficiency: 'Beginner' | 'Intermediate' | 'Advanced';
  targetProficiency: 'Intermediate' | 'Advanced' | 'Expert';
  learningObjective: string;
  preferredPace?: 'RELAXED' | 'MODERATE' | 'INTENSIVE';
}

// ---- Smart Scheduling ----

export interface SmartScheduleSuggestion {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  startTimeIso: string;
  endTimeIso: string;
  userLocalTime: string;
  partnerLocalTime: string;
  userTimezone: string;
  partnerTimezone: string;
  confidenceScore: number;
  reason: string;
}

export interface SmartScheduleResponse {
  partnerId: number;
  userTimezone: string;
  partnerTimezone: string;
  suggestions: SmartScheduleSuggestion[];
}

// ---- AI Assistant ----

export interface AIAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedFollowUps?: string[];
}

export interface AIAssistantResponse {
  reply: string;
  suggestedFollowUps: string[];
  model: string;
  tokensUsed?: number;
}

// ---- Admin AI Analytics ----

export interface AdminAIOverviewResponse {
  totalRequests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
  averageLatencyMs: number;
  byFeature: Record<string, { requests: number; tokens: number; estimatedCostUsd: number }>;
  byProvider: Record<string, { requests: number; tokens: number; estimatedCostUsd: number }>;
}

// ---- API Functions ----

export const aiApi = {
  // Recommendations
  async getRecommendations(page = 1, limit = 10, minScore = 30): Promise<AIRecommendationsResponse> {
    return apiFetch<AIRecommendationsResponse>(`/api/ai/recommendations?page=${page}&limit=${limit}&minScore=${minScore}`);
  },

  async submitRecommendationFeedback(
    recommendedUserId: number,
    feedbackType: RecommendationFeedbackType,
    reason?: string
  ): Promise<{ success: boolean; data: Record<string, unknown> }> {
    return apiFetch<{ success: boolean; data: Record<string, unknown> }>('/api/ai/recommendations/feedback', {
      method: 'POST',
      body: JSON.stringify({ recommendedUserId, feedbackType, reason }),
    });
  },

  // Semantic similarity
  async analyzeSimilarity(skillA: string, skillB: string): Promise<{ success: boolean; data: SkillSimilarityResponse }> {
    return apiFetch<{ success: boolean; data: SkillSimilarityResponse }>('/api/ai/similarity', {
      method: 'POST',
      body: JSON.stringify({ skillA, skillB }),
    });
  },

  // Roadmaps
  async createRoadmap(payload: CreateRoadmapPayload): Promise<{ success: boolean; data: LearningRoadmap }> {
    return apiFetch<{ success: boolean; data: LearningRoadmap }>('/api/ai/roadmaps', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getRoadmaps(status?: string): Promise<{ success: boolean; data: LearningRoadmap[] }> {
    const url = status && status !== 'ALL' ? `/api/ai/roadmaps?status=${status}` : '/api/ai/roadmaps';
    return apiFetch<{ success: boolean; data: LearningRoadmap[] }>(url);
  },

  async getRoadmap(roadmapId: number): Promise<{ success: boolean; data: LearningRoadmap }> {
    return apiFetch<{ success: boolean; data: LearningRoadmap }>(`/api/ai/roadmaps/${roadmapId}`);
  },

  async updateMilestone(roadmapId: number, milestoneId: number, isCompleted: boolean): Promise<{ success: boolean; data: RoadmapMilestone }> {
    return apiFetch<{ success: boolean; data: RoadmapMilestone }>(`/api/ai/roadmaps/${roadmapId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted }),
    });
  },

  async deleteRoadmap(roadmapId: number): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(`/api/ai/roadmaps/${roadmapId}`, {
      method: 'DELETE',
    });
  },

  // Scheduling
  async getSchedulingSuggestions(partnerId: number, durationMinutes = 60): Promise<{ success: boolean; data: SmartScheduleResponse }> {
    return apiFetch<{ success: boolean; data: SmartScheduleResponse }>(
      `/api/ai/scheduling/suggestions?partnerId=${partnerId}&durationMinutes=${durationMinutes}`
    );
  },

  // Assistant
  async chatAssistant(
    question: string,
    context?: {
      targetSkill?: string;
      sessionTopic?: string;
      currentLevel?: string;
    }
  ): Promise<{ success: boolean; data: AIAssistantResponse }> {
    return apiFetch<{ success: boolean; data: AIAssistantResponse }>('/api/ai/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ question, context }),
    });
  },

  // Admin AI Overview
  async getAdminAIOverview(): Promise<{ success: boolean; data: AdminAIOverviewResponse }> {
    return apiFetch<{ success: boolean; data: AdminAIOverviewResponse }>('/api/ai/admin/overview');
  },
};
