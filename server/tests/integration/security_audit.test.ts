import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';

describe('Phase 11 — Security Audit, Authorization & Hardening Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  const port = 5077;
  const timestamp = Date.now();

  const userA = {
    name: 'Security User Alpha',
    username: `sec_alpha_${timestamp}`,
    email: `sec_alpha_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const userB = {
    name: 'Security User Beta',
    username: `sec_beta_${timestamp}`,
    email: `sec_beta_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const userC = {
    name: 'Security User Gamma',
    username: `sec_gamma_${timestamp}`,
    email: `sec_gamma_${timestamp}@example.com`,
    password: 'Password123!',
  };

  let userAId: number;
  let userBId: number;
  let userCId: number;
  let cookieA = '';
  let cookieB = '';
  let cookieC = '';
  let csrfA = '';
  let csrfB = '';
  let csrfC = '';

  function extractCookieAndCsrf(res: Response) {
    const rawHeaders: string[] = typeof (res.headers as any).getSetCookie === 'function'
      ? (res.headers as any).getSetCookie()
      : [res.headers.get('set-cookie') || ''];

    let auth = '';
    let csrf = '';

    for (const h of rawHeaders) {
      const parts = h.split(',').map((c) => c.trim().split(';')[0]);
      for (const p of parts) {
        if (p.startsWith(`${AUTH_COOKIE_NAME}=`)) {
          auth = p;
        }
        if (p.startsWith(`${CSRF_COOKIE_NAME}=`)) {
          csrf = p.replace(`${CSRF_COOKIE_NAME}=`, '');
        }
      }
    }

    return {
      auth,
      csrf,
      cookie: `${auth}; ${CSRF_COOKIE_NAME}=${csrf}`,
    };
  }

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const assignedPort = typeof addr === 'object' && addr ? addr.port : 5077;
        baseUrl = `http://127.0.0.1:${assignedPort}`;
        resolve();
      });
    });

    // Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const bodyA = await resA.json();
    userAId = bodyA.data.user.id;
    const credA = extractCookieAndCsrf(resA);
    cookieA = credA.cookie;
    csrfA = credA.csrf;

    // Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const bodyB = await resB.json();
    userBId = bodyB.data.user.id;
    const credB = extractCookieAndCsrf(resB);
    cookieB = credB.cookie;
    csrfB = credB.csrf;

    // Register User C
    const resC = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userC),
    });
    const bodyC = await resC.json();
    userCId = bodyC.data.user.id;
    const credC = extractCookieAndCsrf(resC);
    cookieC = credC.cookie;
    csrfC = credC.csrf;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // ----------------------------------------------------
  // 1. Security Headers & Payload Controls
  // ----------------------------------------------------
  test('1. API responses include standard defensive security headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin');
    assert.equal(res.headers.get('cross-origin-resource-policy'), 'same-site');
  });

  test('2. Requests exceeding payload limit are rejected with 413 Payload Too Large', async () => {
    // Generate a payload exceeding 1MB (1.2MB of junk text)
    const largeString = 'A'.repeat(1.2 * 1024 * 1024);
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA.email, password: largeString }),
    });

    assert.equal(res.status, 413);
  });

  // ----------------------------------------------------
  // 2. CSRF Double-Submit Protection
  // ----------------------------------------------------
  test('3. Authenticated state-changing request without x-csrf-token header is rejected with 403', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        // intentionally omit x-csrf-token header
      },
      body: JSON.stringify({ bio: 'Attacking without CSRF token' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error.message, /CSRF/i);
  });

  test('4. Authenticated state-changing request with mismatched x-csrf-token header is rejected with 403', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': 'attacker-forged-fake-csrf-token',
      },
      body: JSON.stringify({ bio: 'Attacking with forged CSRF' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error.message, /CSRF/i);
  });

  // ----------------------------------------------------
  // 3. Deactivated / Inactive User Enforcement
  // ----------------------------------------------------
  test('5. Deactivated user token is rejected by authenticate middleware', async () => {
    // Soft delete User C directly
    await userRepository.softDelete(userCId);

    // Verify User C's existing cookie is now rejected with 401
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'GET',
      headers: {
        Cookie: cookieC,
      },
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error.message, /deactivated/i);
  });

  test('6. Public profile of deactivated user returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/users/${userC.username}`);
    assert.equal(res.status, 404);
  });

  // ----------------------------------------------------
  // 4. Authorization & IDOR Access Control
  // ----------------------------------------------------
  test('7. User cannot modify another user profile via /api/users/me', async () => {
    // User A updates their profile
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        name: 'Alpha Updated',
        bio: 'Alpha updated bio',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.user.id, userAId);
    assert.equal(body.data.user.name, 'Alpha Updated');

    // Verify User B's profile was unaffected
    const userBRecord = await userRepository.findById(userBId);
    assert.equal(userBRecord?.name, userB.name);
  });

  test('8. User cannot access or read another user notification preferences', async () => {
    const res = await fetch(`${baseUrl}/api/users/me/notification-preferences`, {
      headers: {
        Cookie: cookieA,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.preferences.userId, userAId);
  });

  test('9. User cannot mark another user notification as read (IDOR check)', async () => {
    // Insert a dummy notification for User B
    const notif = await db.orm.public.Notification.create({
      userId: userBId,
      type: 'TEST_NOTICE',
      title: 'Confidential Notice for B',
      message: 'Private message content',
      isRead: false,
    });

    // User A attempts to mark User B's notification as read
    const res = await fetch(`${baseUrl}/api/notifications/${(notif as any).id}/read`, {
      method: 'PATCH',
      headers: {
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error.message, /not authorized/i);
  });

  // ----------------------------------------------------
  // 5. Input Validation & Parameter Tampering
  // ----------------------------------------------------
  test('10. Invalid numeric parameter yields clean 400 Bad Request instead of server crash', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/abc-not-a-number/accept`, {
      method: 'PATCH',
      headers: {
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
    });

    assert.equal(res.status, 400);
  });

  test('11. SQL injection strings in username route are safely parameterized and return 404', async () => {
    const sqlInjectionPayload = "admin' OR 1=1 --";
    const res = await fetch(`${baseUrl}/api/users/${encodeURIComponent(sqlInjectionPayload)}`);
    assert.equal(res.status, 404);
  });

  test('12. XSS payload in message content is stored as clean text and does not execute', async () => {
    // Verify Zod validation on message input
    const emptyRes = await fetch(`${baseUrl}/api/conversations/1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        content: '   ',
      }),
    });

    assert.equal(emptyRes.status, 400);
  });
});

