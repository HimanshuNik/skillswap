import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '../lib/api';
import type {
  SessionWithDetails,
  CreateSessionPayload,
  RescheduleSessionPayload,
  MeetingInfo,
} from '../types/session';

export const SESSION_KEYS = {
  all: ['sessions'] as const,
  list: (filter?: 'upcoming' | 'past' | 'all', role?: 'teacher' | 'learner', swapRequestId?: number) =>
    [...SESSION_KEYS.all, 'list', { filter, role, swapRequestId }] as const,
  detail: (id: number) => [...SESSION_KEYS.all, 'detail', id] as const,
  meeting: (id: number) => [...SESSION_KEYS.all, 'meeting', id] as const,
};

export function useSessions(
  filter: 'upcoming' | 'past' | 'all' = 'all',
  role?: 'teacher' | 'learner',
  swapRequestId?: number
) {
  return useQuery<SessionWithDetails[]>({
    queryKey: SESSION_KEYS.list(filter, role, swapRequestId),
    queryFn: () => sessionsApi.getSessions({ filter, role, swapRequestId }),
    staleTime: 15 * 1000,
  });
}

export function useSession(id: number | undefined) {
  return useQuery<SessionWithDetails>({
    queryKey: SESSION_KEYS.detail(id ?? 0),
    queryFn: () => (id ? sessionsApi.getSession(id) : Promise.reject('Invalid session ID')),
    enabled: !!id && id > 0,
  });
}

export function useMeetingInfo(id: number | undefined) {
  return useQuery<MeetingInfo>({
    queryKey: SESSION_KEYS.meeting(id ?? 0),
    queryFn: () => (id ? sessionsApi.getMeetingInfo(id) : Promise.reject('Invalid session ID')),
    enabled: !!id && id > 0,
    refetchInterval: 30 * 1000,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSessionPayload) => sessionsApi.createSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.all });
    },
  });
}

export function useProposeReschedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RescheduleSessionPayload }) =>
      sessionsApi.proposeReschedule(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.detail(data.id) });
    },
  });
}

export function useRespondReschedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'ACCEPT' | 'REJECT' }) =>
      sessionsApi.respondReschedule(id, action),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.detail(data.id) });
    },
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      sessionsApi.cancelSession(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.detail(data.id) });
    },
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => sessionsApi.startSession(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.meeting(id) });
    },
  });
}

export function useCompleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => sessionsApi.completeSession(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.detail(data.id) });
    },
  });
}

export function useConfirmCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { action: 'CONFIRM' | 'DISPUTE'; disputeReason?: string };
    }) => sessionsApi.confirmCompletion(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SESSION_KEYS.detail(data.id) });
    },
  });
}
