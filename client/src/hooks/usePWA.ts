import { useState, useEffect, useCallback } from 'react';
import { onUpdateAvailable, applyServiceWorkerUpdate } from '../lib/pwa/registerServiceWorker';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISSED_KEY = 'skillswap_pwa_install_dismissed';
const DISMISSED_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  });
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent) && !('MSStream' in window);
  });
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    // 1. Listen for standalone media query changes
    const mql = window.matchMedia('(display-mode: standalone)');
    const handleMqlChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    mql.addEventListener('change', handleMqlChange);

    // 2. Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const dismissedAt = localStorage.getItem(DISMISSED_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISSED_DURATION_MS) {
        return;
      }
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Listen for appinstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsStandalone(true);
      localStorage.removeItem(DISMISSED_KEY);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // 4. Listen for service worker updates
    const unsubscribeUpdate = onUpdateAvailable(() => {
      setHasUpdate(true);
    });

    return () => {
      mql.removeEventListener('change', handleMqlChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      unsubscribeUpdate();
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstall(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('[PWA] Error launching install prompt:', err);
    }
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    setCanInstall(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  }, []);

  const updateApp = useCallback(() => {
    applyServiceWorkerUpdate();
  }, []);

  return {
    canInstall,
    isStandalone,
    isIOS,
    hasUpdate,
    installApp,
    dismissInstall,
    updateApp,
    applyUpdate: updateApp,
  };
}
