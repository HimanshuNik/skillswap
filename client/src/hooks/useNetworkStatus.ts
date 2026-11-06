import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  const verifyBackendConnectivity = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsOnline(false);
      return false;
    }

    setIsReconnecting(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const online = res.ok || res.status === 200 || res.status === 304;
      setIsOnline(online);
      return online;
    } catch {
      clearTimeout(timeoutId);
      setIsOnline(false);
      return false;
    } finally {
      setIsReconnecting(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      verifyBackendConnectivity();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic heartbeat every 45 seconds to verify active connection
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        verifyBackendConnectivity();
      } else {
        setIsOnline(false);
      }
    }, 45000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [verifyBackendConnectivity]);

  return {
    isOnline,
    isReconnecting,
    retryConnection: verifyBackendConnectivity,
  };
}

