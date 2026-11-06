import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { swapRequestsApi } from '../lib/api';
import type { SwapRequest, CreateSwapRequestPayload } from '../types/swapRequest';

export const SWAP_REQUESTS_KEYS = {
  all: ['swap-requests'] as const,
  incoming: () => [...SWAP_REQUESTS_KEYS.all, 'incoming'] as const,
  outgoing: () => [...SWAP_REQUESTS_KEYS.all, 'outgoing'] as const,
  pendingCount: () => [...SWAP_REQUESTS_KEYS.all, 'pending-count'] as const,
  withUser: (targetUserId: number) => [...SWAP_REQUESTS_KEYS.all, 'with-user', targetUserId] as const,
};

export function useIncomingRequests() {
  return useQuery<SwapRequest[]>({
    queryKey: SWAP_REQUESTS_KEYS.incoming(),
    queryFn: () => swapRequestsApi.getIncomingRequests(),
    staleTime: 30 * 1000,
  });
}

export function useOutgoingRequests() {
  return useQuery<SwapRequest[]>({
    queryKey: SWAP_REQUESTS_KEYS.outgoing(),
    queryFn: () => swapRequestsApi.getOutgoingRequests(),
    staleTime: 30 * 1000,
  });
}

export function usePendingRequestsCount() {
  return useQuery<number>({
    queryKey: SWAP_REQUESTS_KEYS.pendingCount(),
    queryFn: () => swapRequestsApi.getPendingCount(),
    staleTime: 15 * 1000,
  });
}

export function useActiveSwapWithUser(targetUserId: number | undefined) {
  return useQuery<SwapRequest | null>({
    queryKey: SWAP_REQUESTS_KEYS.withUser(targetUserId ?? 0),
    queryFn: () => (targetUserId ? swapRequestsApi.getActiveWithUser(targetUserId) : null),
    enabled: !!targetUserId && targetUserId > 0,
    staleTime: 30 * 1000,
  });
}

export function useCreateSwapRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSwapRequestPayload) => swapRequestsApi.createSwapRequest(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SWAP_REQUESTS_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SWAP_REQUESTS_KEYS.withUser(data.receiverId) });
    },
  });
}

export function useAcceptSwapRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => swapRequestsApi.acceptSwapRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SWAP_REQUESTS_KEYS.all });
    },
  });
}

export function useRejectSwapRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => swapRequestsApi.rejectSwapRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SWAP_REQUESTS_KEYS.all });
    },
  });
}

export function useCancelSwapRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => swapRequestsApi.cancelSwapRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SWAP_REQUESTS_KEYS.all });
    },
  });
}

