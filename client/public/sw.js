/**
 * SkillSwap Production Service Worker
 * Version: 1.0.0 (Phase 22 PWA)
 * 
 * Boundaries:
 * - Pre-caches static application shell and offline fallback.
 * - Enforces strict security boundary: NEVER caches credentials, tokens, payment, or private messages.
 * - Supports Push API with VAPID payload handling.
 * - Handles notification click navigation safely without open redirects.
 */

const CACHE_STATIC_NAME = 'skillswap-static-v1';
const CACHE_RUNTIME_NAME = 'skillswap-runtime-v1';
const CACHE_OFFLINE_NAME = 'skillswap-offline-v1';

const STATIC_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg',
];

// Sensitive or mutating routes that must NEVER be cached
const UNCACHEABLE_PREFIXES = [
  '/api/auth',
  '/api/conversations',
  '/api/sessions',
  '/api/swap-requests',
  '/api/billing',
  '/api/admin',
  '/api/reports',
  '/socket.io',
];

// 1. Install Event — Precache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE_URLS).catch((err) => {
        console.warn('[ServiceWorker] Some static precache assets failed:', err);
      });
    })
  );
});

// 2. Activate Event — Clean up stale caches and claim clients
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_STATIC_NAME, CACHE_RUNTIME_NAME, CACHE_OFFLINE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event — Strict Caching Strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-HTTP/HTTPS requests (e.g., chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // Never cache non-GET requests
  if (request.method !== 'GET') return;

  // Never cache sensitive API prefixes or requests carrying mutating CSRF tokens
  const isUncacheable = UNCACHEABLE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  if (isUncacheable || request.headers.has('x-csrf-token')) {
    return;
  }

  // Strategy A: Static Assets (JS chunks, CSS, images, icons, fonts)
  // Cache-First with Network Fallback
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            const responseClone = networkResponse.clone();
            caches.open(CACHE_STATIC_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
            return networkResponse;
          })
          .catch(() => {
            // Return empty response on network failure for non-critical assets
            return new Response('', { status: 408, statusText: 'Request timed out' });
          });
      })
    );
    return;
  }

  // Strategy B: Public Catalog & Health Endpoints (/api/skills, /api/health)
  // Network-First with Cache Fallback
  if (url.pathname === '/api/skills' || url.pathname === '/api/health') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_RUNTIME_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ success: false, offline: true }), {
              headers: { 'Content-Type': 'application/json' },
            });
          });
        })
    );
    return;
  }

  // Strategy C: HTML Navigation Requests (mode === 'navigate')
  // Network-First with SPA index.html or offline.html fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        // First try to serve cached SPA index.html so client-side routing handles the view
        return caches.match('/index.html').then((cachedIndex) => {
          if (cachedIndex) return cachedIndex;
          // Fall back to branded offline.html
          return caches.match('/offline.html');
        });
      })
    );
    return;
  }
});

// 4. Push Event — Web Push Notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'SkillSwap Alert',
    body: 'You have a new update on SkillSwap.',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    data: { url: '/dashboard' },
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.svg',
    badge: data.badge || '/icons/icon-192.svg',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/dashboard' },
    actions: [
      { action: 'open', title: 'Open SkillSwap' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 5. Notification Click Event — Navigate to relevant route safely
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Safe redirect validation: target must be internal relative path
  let targetUrl = '/dashboard';
  if (event.notification.data && typeof event.notification.data.url === 'string') {
    const rawUrl = event.notification.data.url;
    // Disallow external URLs (e.g., http://, https://, //evil.com)
    if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
      targetUrl = rawUrl;
    }
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// 6. Message Event — Update triggers and user logout cache sanitization
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Clear user-specific cache on logout to prevent cross-account leaks
  if (event.data.type === 'CLEAR_USER_CACHE') {
    caches.delete(CACHE_RUNTIME_NAME);
  }
});

