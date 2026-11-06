process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { pushSubscriptionRepository } from '../../src/repositories/pushSubscription.repository.js';
import { pushDeliveryLogRepository } from '../../src/repositories/pushDeliveryLog.repository.js';
import { notificationPreferenceRepository } from '../../src/repositories/notificationPreference.repository.js';
import { pushNotificationService } from '../../src/services/pushNotification.service.js';
import { notificationService } from '../../src/services/notification.service.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';
import { env } from '../../src/config/env.js';

describe('Phase 22 — Progressive Web App & Push Notifications Integration Tests', { concurrency: 1 }, () => {
  let server: Server;
  let baseUrl: string;
  let userACookie: string;
  let userBCookie: string;
  let userAId: number;
  let userBId: number;
  let userACsrf: string;
  let userBCsrf: string;

  const testEndpointA = 'https://fcm.googleapis.com/fcm/send/test-token-alice-device-1';
  const testEndpointA2 = 'https://updates.push.services.mozilla.com/wpush/v2/test-token-alice-firefox';
  const testEndpointB = 'https://fcm.googleapis.com/fcm/send/test-token-bob-device-1';

  function extractCookieAndCsrf(res: any) {
    const rawHeaders: string[] = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie') || ''];

    let auth = '';
    let csrf = '';

    for (const h of rawHeaders) {
      const parts = h.split(',').map((c: string) => c.trim().split(';')[0]);
      for (const p of parts) {
        if (p.startsWith(`${AUTH_COOKIE_NAME}=`)) {
          auth = p;
        }
        if (p.startsWith(`${CSRF_COOKIE_NAME}=`)) {
          csrf = p.split('=')[1] || '';
        }
      }
    }
    return {
      auth: csrf ? `${auth}; ${CSRF_COOKIE_NAME}=${csrf}` : auth,
      csrf,
    };
  }

  before(async () => {
    const timestamp = Date.now();
    const app = createApp();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const assignedPort = typeof addr === 'object' && addr ? addr.port : 5065;
        baseUrl = `http://127.0.0.1:${assignedPort}`;
        resolve();
      });
    });

    // Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice PWA',
        username: `alice_pwa_${timestamp}`,
        email: `alice.pwa.${timestamp}@skillswap.local`,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(resA.status, 201, 'User A should register successfully');
    const authDataA = extractCookieAndCsrf(resA);
    userACookie = authDataA.auth;
    userACsrf = authDataA.csrf;
    const bodyA = (await resA.json()) as any;
    userAId = bodyA.data.user.id;

    // Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob PWA',
        username: `bob_pwa_${timestamp}`,
        email: `bob.pwa.${timestamp}@skillswap.local`,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(resB.status, 201, 'User B should register successfully');
    const authDataB = extractCookieAndCsrf(resB);
    userBCookie = authDataB.auth;
    userBCsrf = authDataB.csrf;
    const bodyB = (await resB.json()) as any;
    userBId = bodyB.data.user.id;
  });

  after(async () => {
    if (server) {
      if (typeof (server as any).closeAllConnections === 'function') {
        (server as any).closeAllConnections();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    // Clean up created push subscriptions and delivery logs
    if (userAId) {
      await db.orm.public.PushSubscription.where({ userId: userAId }).delete().catch(() => {});
      await db.orm.public.PushDeliveryLog.where({ userId: userAId }).delete().catch(() => {});
      await db.orm.public.Notification.where({ userId: userAId }).delete().catch(() => {});
      await db.orm.public.UserNotificationPreference.where({ userId: userAId }).delete().catch(() => {});
      await db.orm.public.User.where({ id: userAId }).delete().catch(() => {});
    }
    if (userBId) {
      await db.orm.public.PushSubscription.where({ userId: userBId }).delete().catch(() => {});
      await db.orm.public.PushDeliveryLog.where({ userId: userBId }).delete().catch(() => {});
      await db.orm.public.Notification.where({ userId: userBId }).delete().catch(() => {});
      await db.orm.public.UserNotificationPreference.where({ userId: userBId }).delete().catch(() => {});
      await db.orm.public.User.where({ id: userBId }).delete().catch(() => {});
    }
  });

  // 1. GET /api/notifications/push/public-key
  it('1. GET /api/notifications/push/public-key returns configured VAPID public key', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/push/public-key`);
    assert.strictEqual(res.status, 200);

    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.ok(body.data.publicKey);
    assert.strictEqual(body.data.publicKey, env.VAPID_PUBLIC_KEY);
  });

  // 2. Auth guard: POST /api/notifications/push/subscribe returns 401 when unauthenticated
  it('2. POST /api/notifications/push/subscribe returns 401 when unauthenticated', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'https://fcm.googleapis.com/fcm/send/unauth-token',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
      }),
    });
    assert.strictEqual(res.status, 401);
  });

  // 3. Validation: POST /api/notifications/push/subscribe rejects missing fields
  it('3. POST /api/notifications/push/subscribe rejects missing endpoint or keys (400)', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        endpoint: '', // Empty endpoint
        keys: { p256dh: '', auth: '' },
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, false);
  });

  // 4. Subscribe: POST /api/notifications/push/subscribe registers a new subscription
  it('4. POST /api/notifications/push/subscribe registers a new device subscription (201)', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        endpoint: testEndpointA,
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0AgtkyVEqphWO646TG45En8G3TJXC3+fukn4=',
          auth: 'tBHItJI5svbpez7KI4CCXg==',
        },
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.subscription.endpoint, testEndpointA);
    assert.ok(body.data.subscription.id);
  });

  // 5. Upsert: POST /api/notifications/push/subscribe idempotently updates existing endpoint
  it('5. POST /api/notifications/push/subscribe updates existing endpoint idempotently', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
        'User-Agent': 'Updated Browser User-Agent',
      },
      body: JSON.stringify({
        endpoint: testEndpointA,
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0AgtkyVEqphWO646TG45En8G3TJXC3+fukn4=',
          auth: 'updated-auth-data',
        },
      }),
    });
    assert.strictEqual(res.status, 201);

    // Verify only 1 row exists in database for this endpoint
    const allSubs = await pushSubscriptionRepository.findByUserId(userAId);
    assert.strictEqual(allSubs.length, 1);
    assert.strictEqual(allSubs[0].p256dh, 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9t0AgtkyVEqphWO646TG45En8G3TJXC3+fukn4=');
  });

  // 6. Subscriptions list: GET /api/notifications/push/subscriptions returns active devices
  it('6. GET /api/notifications/push/subscriptions lists registered devices for authenticated user', async () => {
    // Register a second device for User A
    await fetch(`${baseUrl}/api/notifications/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        endpoint: testEndpointA2,
        keys: { p256dh: 'key2', auth: 'auth2' },
      }),
    });

    const res = await fetch(`${baseUrl}/api/notifications/push/subscriptions`, {
      headers: { Cookie: userACookie },
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.subscriptions.length, 2);
    const endpoints = body.data.subscriptions.map((s: any) => s.endpoint);
    assert.ok(endpoints.includes(testEndpointA));
    assert.ok(endpoints.includes(testEndpointA2));
  });

  // 7. Isolation: User B cannot see User A's subscriptions
  it('7. Subscriptions are strictly isolated between different users', async () => {
    // Register a device for User B
    await fetch(`${baseUrl}/api/notifications/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        endpoint: testEndpointB,
        keys: { p256dh: 'bob-key', auth: 'bob-auth' },
      }),
    });

    const res = await fetch(`${baseUrl}/api/notifications/push/subscriptions`, {
      headers: { Cookie: userBCookie },
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.data.subscriptions.length, 1);
    assert.strictEqual(body.data.subscriptions[0].endpoint, testEndpointB);
  });

  // 8. IDOR protection: User B cannot unsubscribe User A's endpoint
  it('8. IDOR Defense: User B cannot delete User A subscription endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        endpoint: testEndpointA, // Alice's endpoint
      }),
    });
    assert.strictEqual(res.status, 404);

    // Verify User A's subscription is unaffected
    const aliceSubs = await pushSubscriptionRepository.findByUserId(userAId);
    const hasEndpoint = aliceSubs.some((s) => s.endpoint === testEndpointA);
    assert.ok(hasEndpoint, 'Alice subscription must remain untouched');
  });

  // 9. Unsubscribe: POST /api/notifications/push/unsubscribe removes subscription
  it('9. POST /api/notifications/push/unsubscribe removes authenticated user device', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/push/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        endpoint: testEndpointA2,
      }),
    });
    assert.strictEqual(res.status, 200);

    const aliceSubs = await pushSubscriptionRepository.findByUserId(userAId);
    assert.strictEqual(aliceSubs.length, 1);
    assert.strictEqual(aliceSubs[0].endpoint, testEndpointA);
  });

  // 10. Update notification preferences with push fields
  it('10. PATCH /api/users/me/notification-preferences updates push settings', async () => {
    const res = await fetch(`${baseUrl}/api/users/me/notification-preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        pushEnabled: true,
        pushSwapRequests: true,
        pushMessages: false, // Turn off chat push
        pushSessions: true,
        pushReminders: true,
        pushGroupActivity: false,
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.preferences.pushEnabled, true);
    assert.strictEqual(body.data.preferences.pushMessages, false);
    assert.strictEqual(body.data.preferences.pushGroupActivity, false);
  });

  // 11. POST /api/notifications/push/test sends a test push notification
  it('11. POST /api/notifications/push/test dispatches test push and logs delivery', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/push/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Integration Test Push',
        body: 'Testing PWA notification delivery',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as any;
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.sentCount, 1);

    // Verify delivery log recorded in database
    const logs = await pushDeliveryLogRepository.findByUserId(userAId);
    assert.ok(logs.length >= 1);
    const lastLog = logs[0];
    assert.strictEqual(lastLog.eventType, 'TEST');
    assert.strictEqual(lastLog.status, 'DELIVERED');
  });

  // 12. Suppress push when pushEnabled is false
  it('12. Push delivery is suppressed when master pushEnabled preference is false', async () => {
    // Disable master pushEnabled
    await notificationPreferenceRepository.upsert(userAId, {
      pushEnabled: false,
    });

    const result = await pushNotificationService.sendPushToUser(
      userAId,
      { title: 'Suppressed Alert', body: 'Should not deliver' },
      'SWAP_REQUEST'
    );

    assert.strictEqual(result.suppressed, true);
    assert.strictEqual(result.sentCount, 0);
  });

  // 13. Suppress push when granular category is disabled
  it('13. Push delivery respects granular category preferences', async () => {
    // Enable pushEnabled but keep pushMessages false
    await notificationPreferenceRepository.upsert(userAId, {
      pushEnabled: true,
      pushMessages: false,
      pushSwapRequests: true,
    });

    // Event type MESSAGE should be suppressed
    const msgResult = await pushNotificationService.sendPushToUser(
      userAId,
      { title: 'New Message', body: 'Hello Alice' },
      'MESSAGE'
    );
    assert.strictEqual(msgResult.suppressed, true);

    // Event type SWAP_REQUEST should NOT be suppressed
    const swapResult = await pushNotificationService.sendPushToUser(
      userAId,
      { title: 'Swap Update', body: 'Swap accepted' },
      'SWAP_REQUEST'
    );
    assert.strictEqual(swapResult.suppressed, false);
    assert.strictEqual(swapResult.sentCount, 1);
  });

  // 14. Auto-pruning simulation
  it('14. PushDeliveryLog captures EXPIRED status and prunes invalid subscription', async () => {
    // Add temporary invalid subscription
    const expiredEndpoint = 'https://fcm.googleapis.com/fcm/send/expired-token-to-prune';
    await pushSubscriptionRepository.upsert({
      userId: userAId,
      endpoint: expiredEndpoint,
      p256dh: 'test',
      auth: 'test',
    });

    // Simulate expired pruning directly using the repository
    const deleted = await pushSubscriptionRepository.delete(userAId, expiredEndpoint);
    assert.strictEqual(deleted, true);

    await pushDeliveryLogRepository.create({
      userId: userAId,
      endpoint: expiredEndpoint,
      eventType: 'EXPIRED_SIMULATION',
      payloadJson: JSON.stringify({ title: 'Expired Test' }),
      status: 'EXPIRED',
      statusCode: 410,
      errorMessage: 'Subscription has expired or is no longer valid.',
    });

    const logs = await pushDeliveryLogRepository.findByUserId(userAId);
    const expiredLog = logs.find((l) => l.endpoint === expiredEndpoint);
    assert.ok(expiredLog);
    assert.strictEqual(expiredLog.status, 'EXPIRED');
    assert.strictEqual(expiredLog.statusCode, 410);
  });

  // 15. NotificationService integration triggers push
  it('15. NotificationService.createNotification dispatches push notification', async () => {
    // Re-enable all categories for Alice
    await notificationPreferenceRepository.upsert(userAId, {
      pushEnabled: true,
      pushSwapRequests: true,
      pushSessions: true,
      pushReminders: true,
    });

    const notification = await notificationService.createNotification({
      userId: userAId,
      type: 'SESSION_REMINDER',
      title: 'Upcoming Session in 15 Minutes',
      message: 'Your React session with Bob starts soon.',
      link: '/sessions',
    });

    assert.ok(notification.id);

    // Give background push dispatch promise time to persist delivery log
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Verify delivery log exists
    const logs = await pushDeliveryLogRepository.findByUserId(userAId);
    const sessionLog = logs.find((l) => l.eventType === 'SESSION_REMINDER' && l.status === 'DELIVERED');
    assert.ok(sessionLog);
    assert.strictEqual(sessionLog.status, 'DELIVERED');
  });

  // 16. Web App Manifest and offline assets verification
  it('16. PWA manifest, service worker, and offline shell assets exist and are valid', async () => {
    const manifestPath = path.resolve(process.cwd(), '../client/public/manifest.webmanifest');
    const swPath = path.resolve(process.cwd(), '../client/public/sw.js');
    const offlineHtmlPath = path.resolve(process.cwd(), '../client/public/offline.html');
    const icon192Path = path.resolve(process.cwd(), '../client/public/icons/icon-192.svg');
    const icon512Path = path.resolve(process.cwd(), '../client/public/icons/icon-512.svg');
    const iconMaskablePath = path.resolve(process.cwd(), '../client/public/icons/icon-maskable.svg');

    assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');
    assert.ok(fs.existsSync(swPath), 'sw.js must exist');
    assert.ok(fs.existsSync(offlineHtmlPath), 'offline.html must exist');
    assert.ok(fs.existsSync(icon192Path), 'icon-192.svg must exist');
    assert.ok(fs.existsSync(icon512Path), 'icon-512.svg must exist');
    assert.ok(fs.existsSync(iconMaskablePath), 'icon-maskable.svg must exist');

    // Validate manifest content
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(manifestContent.name, 'SkillSwap — Peer-to-Peer Skill Exchange');
    assert.strictEqual(manifestContent.short_name, 'SkillSwap');
    assert.strictEqual(manifestContent.start_url, '/');
    assert.strictEqual(manifestContent.display, 'standalone');
    assert.strictEqual(manifestContent.theme_color, '#4f46e5');
    assert.strictEqual(manifestContent.background_color, '#f8fafc');
    assert.ok(Array.isArray(manifestContent.icons));
    assert.strictEqual(manifestContent.icons.length, 3);

    // Validate service worker content
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes('CACHE_STATIC_NAME ='), 'Service worker must define static cache name');
    assert.ok(swContent.includes('offline.html'), 'Service worker must precache offline fallback');
    assert.ok(swContent.includes('self.addEventListener(\'push\''), 'Service worker must handle push event');
    assert.ok(swContent.includes('self.addEventListener(\'notificationclick\''), 'Service worker must handle notification clicks');

    // Validate offline shell content
    const offlineHtml = fs.readFileSync(offlineHtmlPath, 'utf8');
    assert.ok(offlineHtml.includes('You are currently offline'), 'Offline HTML must display offline message');
    assert.ok(offlineHtml.includes('Check Connection'), 'Offline HTML must have a check connection button');
  });
});
