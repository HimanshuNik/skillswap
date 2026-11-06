import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  authApi,
  type RegisterPayload,
  type LoginPayload,
  type ForgotPasswordPayload,
  type ResetPasswordPayload,
  ApiError,
} from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useEffect } from 'react';

export const AUTH_QUERY_KEY = ['auth', 'me'];

/**
 * Hook to hydrate and synchronize session state with backend.
 */
export function useSession() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  const query = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        const { user } = await authApi.getMe();
        return user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!query.isLoading) {
      if (query.data) {
        setUser(query.data);
      } else {
        setUser(null);
      }
      setLoading(false);
    }
  }, [query.isLoading, query.data, setUser, setLoading]);

  return query;
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
      toast.success('Welcome back!');

      if (!data.user.isOnboarded) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to sign in');
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
      toast.success('Account created successfully!');
      navigate('/onboarding');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create account');
    },
  });
}

import { clearOfflineCache } from '../lib/pwa/registerServiceWorker';

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logout();
      queryClient.clear();
      clearOfflineCache().catch(() => {});
      toast.success('Logged out successfully');
      navigate('/login');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to log out');
      // Even on network error, clear client session and navigate to login
      logout();
      queryClient.clear();
      clearOfflineCache().catch(() => {});
      navigate('/login');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => authApi.forgotPassword(payload),
    onSuccess: (res) => {
      toast.success(res.message);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to request password reset');
    },
  });
}

export function useResetPassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) => authApi.resetPassword(payload),
    onSuccess: (res) => {
      toast.success(res.message);
      navigate('/login');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to reset password');
    },
  });
}

