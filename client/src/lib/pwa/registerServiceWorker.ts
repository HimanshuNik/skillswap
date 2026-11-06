/**
 * Service Worker registration and lifecycle manager.
 */

let swRegistration: ServiceWorkerRegistration | null = null;
type UpdateCallback = (registration: ServiceWorkerRegistration) => void;
const updateCallbacks: Set<UpdateCallback> = new Set();

export function onUpdateAvailable(callback: UpdateCallback): () => void {
  updateCallbacks.add(callback);
  return () => {
    updateCallbacks.delete(callback);
  };
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    swRegistration = registration;

    // Check if an updated service worker is already waiting
    if (registration.waiting) {
      notifyUpdateAvailable(registration);
    }

    // Detect new updates found during page session
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          notifyUpdateAvailable(registration);
        }
      });
    });

    // Handle controller change (reloads page cleanly when skipWaiting is activated)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        // Avoid reload if currently in an active video meeting
        if (!window.location.pathname.includes('/sessions') || !window.location.search.includes('call=')) {
          window.location.reload();
        }
      }
    });

    return registration;
  } catch (err) {
    console.warn('[PWA] Service Worker registration failed:', err);
    return null;
  }
}

function notifyUpdateAvailable(registration: ServiceWorkerRegistration) {
  for (const cb of updateCallbacks) {
    try {
      cb(registration);
    } catch (e) {
      console.error('[PWA] Error in update callback:', e);
    }
  }
}

export function applyServiceWorkerUpdate(): void {
  if (swRegistration && swRegistration.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

export async function clearOfflineCache(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_USER_CACHE' });
  }

  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      for (const k of keys) {
        if (k.includes('runtime')) {
          await caches.delete(k);
        }
      }
    } catch {
      // Ignore cache clearing errors
    }
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      return await registration.unregister();
    }
    return false;
  } catch {
    return false;
  }
}

