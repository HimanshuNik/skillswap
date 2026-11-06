import { useQuery } from '@tanstack/react-query';
import { skillsApi } from '../lib/api';
import type { Skill } from '../types/user';

export const SKILLS_QUERY_KEY = ['skills'];

export function useSkills(category?: string) {
  return useQuery<Skill[]>({
    queryKey: category ? [...SKILLS_QUERY_KEY, category] : SKILLS_QUERY_KEY,
    queryFn: () => skillsApi.getSkills(category),
    staleTime: 10 * 60 * 1000,
  });
}

