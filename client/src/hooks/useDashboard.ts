import { useQuery } from '@tanstack/react-query';
import { dashboardApi, type AggregatedDashboard, type DashboardSummary, type ActivityItem } from '../lib/api';
import type { SkillMatch } from '../types/user';

export function useDashboard() {
  return useQuery<AggregatedDashboard>({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getDashboard(),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(),
    staleTime: 1000 * 30,
  });
}

export function useDashboardRecommendations(limit = 3) {
  return useQuery<SkillMatch[]>({
    queryKey: ['dashboard', 'recommendations', limit],
    queryFn: () => dashboardApi.getRecommendations(limit),
    staleTime: 1000 * 60,
  });
}

export function useDashboardActivity(limit = 10) {
  return useQuery<ActivityItem[]>({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: () => dashboardApi.getActivity(limit),
    staleTime: 1000 * 30,
  });
}

