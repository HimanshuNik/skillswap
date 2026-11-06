import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../lib/api';
import type { CreateReviewPayload, UserReviewsResponse, UserReputation, Review } from '../types/review';

export const REVIEW_KEYS = {
  all: ['reviews'] as const,
  user: (userId: number, page?: number, sort?: string) =>
    [...REVIEW_KEYS.all, 'user', userId, { page, sort }] as const,
  reputation: (userId: number) => [...REVIEW_KEYS.all, 'reputation', userId] as const,
  session: (sessionId: number) => [...REVIEW_KEYS.all, 'session', sessionId] as const,
};

export function useUserReviews(
  userId: number | undefined,
  page = 1,
  sort: 'newest' | 'highest' | 'lowest' = 'newest'
) {
  return useQuery<UserReviewsResponse>({
    queryKey: REVIEW_KEYS.user(userId ?? 0, page, sort),
    queryFn: () =>
      userId ? reviewsApi.getUserReviews(userId, { page, sort }) : Promise.reject('Invalid user ID'),
    enabled: !!userId && userId > 0,
    staleTime: 30 * 1000,
  });
}

export function useUserReputation(userId: number | undefined) {
  return useQuery<UserReputation>({
    queryKey: REVIEW_KEYS.reputation(userId ?? 0),
    queryFn: () => (userId ? reviewsApi.getUserReputation(userId) : Promise.reject('Invalid user ID')),
    enabled: !!userId && userId > 0,
    staleTime: 30 * 1000,
  });
}

export function useSessionReviews(sessionId: number | undefined) {
  return useQuery<Review[]>({
    queryKey: REVIEW_KEYS.session(sessionId ?? 0),
    queryFn: () =>
      sessionId ? reviewsApi.getSessionReviews(sessionId) : Promise.reject('Invalid session ID'),
    enabled: !!sessionId && sessionId > 0,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => reviewsApi.createReview(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.all });
      queryClient.invalidateQueries({ queryKey: REVIEW_KEYS.reputation(data.revieweeId) });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

