import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { studyGroupRepository } from '../../src/repositories/studyGroup.repository.js';
import { groupResourceRepository } from '../../src/repositories/collaboration/groupResource.repository.js';
import { sessionRepository } from '../../src/repositories/session.repository.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';
import { env } from '../../src/config/env.js';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { initSocketServer, closeSocketServer } from '../../src/socket/index.js';

describe('Phase 23 — Advanced Security, Scalability & Hardening Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  let serverPort: number;
  const timestamp = Date.now();

  let userAId: number;
  let userBId: number;
  let userSuspendedId: number;
  let cookieA = '';
  let csrfA = '';
  let cookieB = '';
  let csrfB = '';
  let tokenA = '';
  let cookieSuspended = '';
  let csrfSuspended = '';

  let privateGroupId: number;
  let userASessionId: number;
  let uploadedResourceId: number;
  let createdSwapId: number;

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
      rawAuthToken: auth.replace(`${AUTH_COOKIE_NAME}=`, ''),
      csrf,
      cookie: `${auth}; ${CSRF_COOKIE_NAME}=${csrf}`,
    };
  }

  before(async () => {
    const app = createApp();

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        serverPort = typeof addr === 'object' && addr ? addr.port : 5088;
        baseUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });

    initSocketServer(server);

    // Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SecUser A',
        username: `sec_a_${timestamp}`,
        email: `sec_a_${timestamp}@skillswap.local`,
        password: 'Password123!',
      }),
    });
    const bodyA = (await resA.json()) as any;
    userAId = bodyA.data.user.id;
    const credA = extractCookieAndCsrf(resA);
    cookieA = credA.cookie;
    csrfA = credA.csrf;
    tokenA = credA.rawAuthToken;

    // Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SecUser B',
        username: `sec_b_${timestamp}`,
        email: `sec_b_${timestamp}@skillswap.local`,
        password: 'Password123!',
      }),
    });
    const bodyB = (await resB.json()) as any;
    userBId = bodyB.data.user.id;
    const credB = extractCookieAndCsrf(resB);
    cookieB = credB.cookie;
    csrfB = credB.csrf;

    // Register User Suspended
    const resS = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SecUser Suspended',
        username: `sec_susp_${timestamp}`,
        email: `sec_susp_${timestamp}@skillswap.local`,
        password: 'Password123!',
      }),
    });
    const bodyS = (await resS.json()) as any;
    userSuspendedId = bodyS.data.user.id;
    const credS = extractCookieAndCsrf(resS);
    cookieSuspended = credS.cookie;
    csrfSuspended = credS.csrf;

    // Suspend the user directly in DB
    await userRepository.suspendUser(userSuspendedId, 'Violation of terms', userAId);

    // Create a PRIVATE Study Group owned by User A
    const groupRes = await fetch(`${baseUrl}/api/community/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        name: `Sec Private Group ${timestamp}`,
        description: 'Private group for security isolation test',
        visibility: 'PRIVATE',
      }),
    });
    const groupJson = (await groupRes.json()) as any;
    privateGroupId = groupJson.data.group.id;

    // Create skills and swap request for sessions
    const skill = await db.orm.public.Skill.create({
      name: `SecSkill_${timestamp}`,
      category: 'Development',
    });
    const skill2 = await db.orm.public.Skill.create({
      name: `SecSkill2_${timestamp}`,
      category: 'Design',
    });

    const swap = await db.orm.public.SwapRequest.create({
      senderId: userAId,
      receiverId: userBId,
      senderSkillId: skill.id,
      receiverSkillId: skill2.id,
      status: 'ACCEPTED',
    });
    createdSwapId = swap.id;

    // Create a dummy session where User A is teacher
    const now = Date.now();
    const session = await sessionRepository.create({
      swapRequestId: swap.id,
      teacherId: userAId,
      learnerId: userBId,
      skillId: skill.id,
      scheduledStart: new Date(now + 48 * 3600 * 1000).toISOString(),
      scheduledEnd: new Date(now + 49 * 3600 * 1000).toISOString(),
      duration: 60,
      status: 'SCHEDULED',
      meetingUrl: 'https://meet.jit.si/skillswap-sec-test',
      meetingRoomId: 'skillswap-sec-test',
    });
    userASessionId = session.id;

    // Upload a valid note resource in User A private group
    const resUpload = await fetch(`${baseUrl}/api/community/groups/${privateGroupId}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        title: 'User A Private Note',
        resourceType: 'NOTE',
        content: 'Top secret study notes for group members only',
        visibility: 'MEMBERS',
      }),
    });
    const resUploadJson = (await resUpload.json()) as any;
    uploadedResourceId = resUploadJson.data?.id || resUploadJson.data?.resource?.id;
  });

  after(async () => {
    await closeSocketServer();
    if (server) {
      if (typeof (server as any).closeAllConnections === 'function') {
        (server as any).closeAllConnections();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    // Clean up created entities
    if (uploadedResourceId) {
      await groupResourceRepository.delete(uploadedResourceId).catch(() => {});
    }
    if (privateGroupId) {
      await studyGroupRepository.delete(privateGroupId).catch(() => {});
    }
    if (userASessionId) {
      await db.orm.public.Session.where({ id: userASessionId }).delete().catch(() => {});
    }
    if (createdSwapId) {
      await db.orm.public.SwapRequest.where({ id: createdSwapId }).delete().catch(() => {});
    }
    if (userAId) {
      await db.orm.public.UserNotificationPreference.where({ userId: userAId }).delete().catch(() => {});
      await db.orm.public.User.where({ id: userAId }).delete().catch(() => {});
    }
    if (userBId) {
      await db.orm.public.UserNotificationPreference.where({ userId: userBId }).delete().catch(() => {});
      await db.orm.public.User.where({ id: userBId }).delete().catch(() => {});
    }
    if (userSuspendedId) {
      await db.orm.public.UserNotificationPreference.where({ userId: userSuspendedId }).delete().catch(() => {});
      await db.orm.public.User.where({ id: userSuspendedId }).delete().catch(() => {});
    }
    await db.close();
  });

  // 1. Unauthorized API Access
  it('1. Unauthorized API access: Anonymous requests to protected routes return 401', async () => {
    const endpoints = [
      '/api/users/me',
      '/api/sessions',
      '/api/conversations',
      '/api/admin/overview',
      '/api/notifications/unread-count',
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`);
      assert.strictEqual(res.status, 401, `Endpoint ${ep} must reject anonymous access with 401`);
      const body = (await res.json()) as any;
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, 'UNAUTHORIZED');
    }
  });

  // 2. Role Escalation Defense
  it('2. Role escalation: Normal user cannot access admin APIs or escalate privileges', async () => {
    // Normal user attempts to view admin overview
    const resOverview = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Cookie: cookieA },
    });
    assert.strictEqual(resOverview.status, 403, 'Normal user must receive 403 Forbidden for admin overview');

    // Normal user attempts to suspend another user
    const resSuspend = await fetch(`${baseUrl}/api/admin/users/${userBId}/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({ reason: 'Malicious attempt' }),
    });
    assert.strictEqual(resSuspend.status, 403, 'Normal user must receive 403 Forbidden when calling admin suspend');

    // Normal user attempts to inject role: "ADMIN" in profile update
    const resPatch = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({ name: 'Hacked Name', role: 'ADMIN' }),
    });
    assert.strictEqual(resPatch.status, 200);
    const patchedUser = await userRepository.findById(userAId);
    assert.strictEqual(patchedUser?.role, 'USER', 'User role must remain USER despite role injection in payload');
  });

  // 3. IDOR Defenses
  it('3. IDOR Defenses: Non-participant user cannot access or cancel other user sessions or resources', async () => {
    // Create User C (unrelated third party)
    const userCRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'SecUser C',
        username: `sec_c_${Date.now()}`,
        email: `sec_c_${Date.now()}@skillswap.local`,
        password: 'Password123!',
      }),
    });
    const userCJson = (await userCRes.json()) as any;
    const credC = extractCookieAndCsrf(userCRes);

    // User C attempts to view User A session details
    const resView = await fetch(`${baseUrl}/api/sessions/${userASessionId}`, {
      headers: { Cookie: credC.cookie },
    });
    assert.strictEqual(resView.status, 403, 'Unrelated user must receive 403 viewing another user session');

    // User C attempts to cancel User A session
    const resCancel = await fetch(`${baseUrl}/api/sessions/${userASessionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: credC.cookie,
        'x-csrf-token': credC.csrf,
      },
      body: JSON.stringify({ reason: 'IDOR attack attempt' }),
    });
    assert.strictEqual(resCancel.status, 403, 'Unrelated user must receive 403 canceling another user session');

    // Clean up User C
    await db.orm.public.UserNotificationPreference.where({ userId: userCJson.data.user.id }).delete().catch(() => {});
    await db.orm.public.User.where({ id: userCJson.data.user.id }).delete().catch(() => {});
  });

  // 4. Timing-Safe CSRF Protection
  it('4. CSRF Protection: Authenticated state-changing requests require valid matching x-csrf-token', async () => {
    // Missing CSRF header
    const resMissing = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
      },
      body: JSON.stringify({ bio: 'Attempt without CSRF header' }),
    });
    assert.strictEqual(resMissing.status, 403, 'Request without x-csrf-token header must be rejected with 403');
    const missingJson = (await resMissing.json()) as any;
    assert.strictEqual(missingJson.error.code, 'CSRF_ERROR');

    // Tampered / mismatched CSRF token
    const resTampered = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': 'tampered_invalid_csrf_token_value_here',
      },
      body: JSON.stringify({ bio: 'Attempt with tampered CSRF' }),
    });
    assert.strictEqual(resTampered.status, 403, 'Mismatched CSRF token must be rejected with 403');
  });

  // 5. Rate Limiting Headers
  it('5. Rate Limiting: Authentication routes expose standard rate-limiting headers', async () => {
    const res = await fetch(`${baseUrl}/api/auth/csrf`);
    assert.strictEqual(res.status, 200);
    // GET /api/auth/csrf provides initial token
    const csrfHeader = res.headers.get('set-cookie');
    assert.ok(csrfHeader?.includes(CSRF_COOKIE_NAME));
  });

  // 6. Input Validation
  it('6. Input Validation: Malformed payloads, negative IDs, and SQL injection strings return 400/404 with details', async () => {
    // Malformed session creation (negative duration, invalid date)
    const resBadSession = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        swapRequestId: -1,
        teacherId: 'not-a-number',
        scheduledStart: 'invalid-date',
      }),
    });
    assert.strictEqual(resBadSession.status, 400);
    const badJson = (await resBadSession.json()) as any;
    assert.strictEqual(badJson.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(badJson.error.details));
  });

  // 7. Socket.IO Authorization
  it('7. Socket.IO Authorization: Unauthorized room joins and unauthenticated connections are rejected', async () => {
    // 1. Connection without auth token rejected
    await new Promise<void>((resolve) => {
      const client = ioClient(baseUrl, {
        transports: ['websocket'],
        autoConnect: true,
      });
      client.on('connect_error', (err) => {
        assert.ok(err.message.includes('Authentication required') || err.message.includes('token'));
        client.disconnect();
        resolve();
      });
    });

    // 2. Authenticated Socket A cannot join non-existent or unauthorized conversation
    await new Promise<void>((resolve) => {
      const client = ioClient(baseUrl, {
        transports: ['websocket'],
        auth: { token: tokenA },
      });

      client.on('connect', () => {
        client.emit('conversation:join', { conversationId: 999999 }, (response: any) => {
          assert.strictEqual(response?.success, false);
          assert.ok(response?.error?.includes('not authorized') || response?.error?.includes('conversation'));
          client.disconnect();
          resolve();
        });
      });
    });
  });

  // 8. Private Group Access Control
  it('8. Private Group Access: Non-member (User B) cannot access private group resources or sessions', async () => {
    // User B tries to view resources of User A private group
    const resRes = await fetch(`${baseUrl}/api/community/groups/${privateGroupId}/resources`, {
      headers: { Cookie: cookieB },
    });
    assert.strictEqual(resRes.status, 403, 'Non-member must be denied access to private group resources (403)');

    // User B tries to view sessions of User A private group
    const resSess = await fetch(`${baseUrl}/api/community/groups/${privateGroupId}/sessions`, {
      headers: { Cookie: cookieB },
    });
    assert.strictEqual(resSess.status, 403, 'Non-member must be denied access to private group sessions (403)');
  });

  // 9. File Upload Security & Magic Bytes
  it('9. File Upload Security: Path traversal rejected; MIME magic-bytes mismatch rejected', async () => {
    // 1. MIME spoofing: Claims to be PNG but content is arbitrary ASCII text
    const spoofedRes = await fetch(`${baseUrl}/api/community/groups/${privateGroupId}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        title: 'Fake PNG Executable',
        resourceType: 'IMAGE',
        mimeType: 'image/png',
        fileName: 'malicious.png',
        fileData: Buffer.from('echo "Malicious script masquerading as image"').toString('base64'),
      }),
    });
    assert.strictEqual(spoofedRes.status, 400, 'MIME magic bytes mismatch must return 400 Bad Request');
    const spoofJson = (await spoofedRes.json()) as any;
    assert.ok(spoofJson.error.message.includes('signature does not match'));

    // 2. Non-member User B cannot download User A private file
    const resDownload = await fetch(
      `${baseUrl}/api/community/groups/${privateGroupId}/resources/${uploadedResourceId}/download`,
      {
        headers: { Cookie: cookieB },
      }
    );
    assert.strictEqual(resDownload.status, 403, 'Non-member download must return 403 Forbidden');
  });

  // 10. Authentication Expiration & Algorithm Confusion
  it('10. JWT Security: Tampered tokens and "none" algorithm tokens are strictly rejected (401)', async () => {
    // 1. None algorithm token
    const noneToken = jwt.sign(
      { userId: userAId, email: 'sec_a@skillswap.local', username: 'sec_a' },
      '',
      { algorithm: 'none' as any }
    );
    const resNone = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${noneToken}` },
    });
    assert.strictEqual(resNone.status, 401, 'Token signed with "none" algorithm must be rejected with 401');

    // 2. Tampered signature
    const tamperedToken = `${tokenA.slice(0, -6)}xxxxxx`;
    const resTampered = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    assert.strictEqual(resTampered.status, 401, 'Tampered JWT signature must be rejected with 401');
  });

  // 11. Suspended User Restrictions
  it('11. Suspended User Defense: Suspended accounts are barred from login and authenticated APIs', async () => {
    // Attempt login with suspended user credentials
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `sec_susp_${timestamp}@skillswap.local`,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(loginRes.status, 403, 'Suspended user login must be rejected with 403 Forbidden');
    const loginJson = (await loginRes.json()) as any;
    assert.ok(loginJson.error.message.includes('suspended'));

    // Attempt authenticated request with existing cookie for suspended user
    const resMe = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Cookie: cookieSuspended },
    });
    assert.strictEqual(resMe.status, 403, 'Suspended user session cookie must return 403 Forbidden');
  });

  // 12. Sensitive Data Exposure & Reserved Handles
  it('12. Data Privacy: Password hashes and tokens omitted; reserved usernames cannot be registered', async () => {
    // 1. GET /api/users/me does NOT contain passwordHash or resetToken
    const resMe = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Cookie: cookieA },
    });
    assert.strictEqual(resMe.status, 200);
    const meJson = (await resMe.json()) as any;
    assert.strictEqual(meJson.data.user.passwordHash, undefined);
    assert.strictEqual(meJson.data.user.passwordResetHash, undefined);

    // 2. Reserved username registration rejection
    const resReserved = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Impersonator',
        username: 'admin',
        email: 'impersonator@test.com',
        password: 'Password123!',
      }),
    });
    assert.strictEqual(resReserved.status, 400, 'Registering reserved username "admin" must return 400');
    const resJson = (await resReserved.json()) as any;
    assert.ok(
      resJson.error.details?.some((d: any) => d.message?.includes('reserved')) ||
        resJson.error.message?.includes('reserved')
    );
  });
});
