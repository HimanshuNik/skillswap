import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { onboardingApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { AUTH_QUERY_KEY } from './useAuth';
import { USER_PROFILE_QUERY_KEY } from './useUserProfile';
import type { OnboardingData } from '../types/onboarding';

export function useOnboarding() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (data: OnboardingData) => onboardingApi.submit(data),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
      queryClient.invalidateQueries({ queryKey: USER_PROFILE_QUERY_KEY });
      toast.success('Onboarding complete! Welcome to SkillSwap!');
      navigate('/dashboard', { replace: true });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save onboarding data. Please check all steps.');
    },
  });
}

