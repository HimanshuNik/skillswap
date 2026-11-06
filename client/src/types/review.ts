export interface ReviewerSummary {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface Review {
  id: number;
  sessionId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: ReviewerSummary;
  skill?: {
    id: number;
    name: string;
    category: string;
  };
  sessionCompletionDate?: string;
}

export interface CreateReviewPayload {
  sessionId: number;
  rating: number;
  comment?: string | null;
}

export interface UserReputation {
  userId: number;
  averageRating: number;
  totalReviews: number;
  completedTeachingSessions: number;
  completedSessions: number;
  hasReviews: boolean;
}

export interface UserReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
  reputation: UserReputation;
}

