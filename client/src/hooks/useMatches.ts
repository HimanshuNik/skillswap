import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '../lib/api';
import type { SkillMatch } from '../types/user';

export const MATCHES_QUERY_KEY = ['matches'];

export function useMatches(limit = 20) {
  return useQuery<{ matches: SkillMatch[]; total: number }>({
    queryKey: MATCHES_QUERY_KEY,
    queryFn: () => matchesApi.getMatches(limit),
    staleTime: 60 * 1000,
  });
}

