import { useQuery } from '@tanstack/react-query';
import { discoveryApi } from '../lib/api';
import type { DiscoverUser, DiscoverPagination } from '../types/user';

export const DISCOVER_QUERY_KEY = (params: { search?: string; category?: string; page?: number }) => [
  'discover',
  params.search || '',
  params.category || 'All',
  params.page || 1,
];

export function useDiscoverUsers(params: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<{ users: DiscoverUser[]; pagination: DiscoverPagination }>({
    queryKey: DISCOVER_QUERY_KEY(params),
    queryFn: () => discoveryApi.getDiscoverUsers(params),
    staleTime: 60 * 1000,
  });
}

