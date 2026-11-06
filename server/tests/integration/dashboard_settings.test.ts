import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { notificationService } from '../../src/services/notification.service.js';
import { calculateProfileCompletion } from '../../src/utils/profileCompletion.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';

describe('Phase 9 — Dashboard, Profile & Settings Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  const port = 5066;
  const timestamp = Date.now();

  const userA = {
    name: 'Dashboard Tester A',
    username: `dash_a_${timestamp}`,
    email: `dash_a_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const userB = {
    name: 'Dashboard Tester B',
    username: `dash_b_${timestamp}`,
    email: `dash_b_${timestamp}@example.com`,
    password: 'Password123!',
  };

  let userAId: number;
  let userBId: number;
  let cookieA = '';
  let cookieB = '';
  let csrfA = '';
  let csrfB = '';
  let skillReactId: number;
  let skillDesignId: number;

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
      cookie: `${auth}; ${CSRF_COOKIE_NAME}=${csrf}`,
      csrf,
    };
  }

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const assignedPort = typeof addr === 'object' && addr ? addr.port : 5066;
        baseUrl = `http://127.0.0.1:${assignedPort}`;
        resolve();
      });
    });

    // 1. Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const dataA = await resA.json();
    userAId = dataA.data.user.id;
    const extractedA = extractCookieAndCsrf(resA);
    cookieA = extractedA.cookie;
    csrfA = extractedA.csrf;

    // 2. Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const dataB = await resB.json();
    userBId = dataB.data.user.id;
    const extractedB = extractCookieAndCsrf(resB);
    cookieB = extractedB.cookie;
    csrfB = extractedB.csrf;

    // 3. Find or create test skills
    const skills = (await db.orm.public.Skill.all()) as any[];
    let reactSkill = skills.find((s) => s.name === 'React');
    if (!reactSkill) {
      reactSkill = await db.orm.public.Skill.create({
        name: 'React',
        category: 'Development',
      });
    }
    skillReactId = reactSkill.id;

    let designSkill = skills.find((s) => s.name === 'UI/UX Design');
    if (!designSkill) {
      designSkill = await db.orm.public.Skill.create({
        name: 'UI/UX Design',
        category: 'Design',
      });
    }
    skillDesignId = designSkill.id;

    // 4. Onboard User A: teaches React, learns UI/UX Design
    const onbA = await fetch(`${baseUrl}/api/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        profile: {
          displayName: userA.name,
          bio: 'Full-stack developer passionate about skill swapping',
          location: 'San Francisco, CA',
        },
        teachingSkills: [{ name: 'React', level: 'Advanced' }],
        learningSkills: [{ name: 'UI/UX Design', targetLevel: 'Beginner' }],
        availability: {
          schedule: [
            { day: 'Monday', slots: ['Morning', 'Evening'] },
            { day: 'Wednesday', slots: ['Evening'] },
          ],
          timezone: 'America/Los_Angeles',
        },
      }),
    });
    assert.equal(onbA.status, 200, 'User A onboarding should succeed');

    // 5. Onboard User B: teaches UI/UX Design, learns React
    const onbB = await fetch(`${baseUrl}/api/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
      body: JSON.stringify({
        profile: {
          displayName: userB.name,
          bio: 'Product designer wanting to master frontend code',
          location: 'San Francisco, CA',
        },
        teachingSkills: [{ name: 'UI/UX Design', level: 'Expert' }],
        learningSkills: [{ name: 'React', targetLevel: 'Intermediate' }],
        availability: {
          schedule: [
            { day: 'Monday', slots: ['Morning'] },
            { day: 'Friday', slots: ['Evening'] },
          ],
          timezone: 'America/Los_Angeles',
        },
      }),
    });
    assert.equal(onbB.status, 200, 'User B onboarding should succeed');
  });

  after(async () => {
    // Cleanup test users and associated records
    try {
      if (userAId) {
        await db.orm.public.UserNotificationPreference.where({ userId: userAId }).delete().catch(() => {});
        await db.orm.public.Notification.where({ userId: userAId }).delete().catch(() => {});
        await db.orm.public.UserTeachingSkill.where({ userId: userAId }).delete().catch(() => {});
        await db.orm.public.UserLearningSkill.where({ userId: userAId }).delete().catch(() => {});
        await db.orm.public.UserAvailability.where({ userId: userAId }).delete().catch(() => {});
        await db.orm.public.User.where({ id: userAId }).delete().catch(() => {});
      }
      if (userBId) {
        await db.orm.public.UserNotificationPreference.where({ userId: userBId }).delete().catch(() => {});
        await db.orm.public.Notification.where({ userId: userBId }).delete().catch(() => {});
        await db.orm.public.UserTeachingSkill.where({ userId: userBId }).delete().catch(() => {});
        await db.orm.public.UserLearningSkill.where({ userId: userBId }).delete().catch(() => {});
        await db.orm.public.UserAvailability.where({ userId: userBId }).delete().catch(() => {});
        await db.orm.public.User.where({ id: userBId }).delete().catch(() => {});
      }
    } catch {}

    server?.closeAllConnections?.();
    server?.close();
  });

  test('1. GET /api/dashboard returns 401 when unauthenticated', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`);
    assert.equal(res.status, 401);
  });

  test('2. Profile completion calculation accurately weights items', () => {
    const full = calculateProfileCompletion({
      user: {
        name: 'Alex Developer',
        bio: 'Hello world',
        location: 'San Francisco',
        avatarUrl: 'https://example.com/avatar.png',
      },
      teachingSkillsCount: 2,
      learningSkillsCount: 1,
      hasAvailability: true,
    });

    assert.equal(full.percentage, 100);
    assert.equal(full.missingItems.length, 0);

    const partial = calculateProfileCompletion({
      user: {
        name: 'Partial User',
        bio: null,
        location: null,
        avatarUrl: null,
      },
      teachingSkillsCount: 1,
      learningSkillsCount: 0,
      hasAvailability: false,
    });

    assert.ok(partial.percentage < 100);
    assert.ok(partial.missingItems.some((i) => i.key === 'bio'));
    assert.ok(partial.missingItems.some((i) => i.key === 'learningSkills'));
    assert.ok(partial.missingItems.some((i) => i.key === 'availability'));
  });

  test('3. GET /api/dashboard returns aggregated dashboard metrics for authenticated user', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Cookie: cookieA },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.summary);
    assert.ok(Array.isArray(body.data.recommendations));
    assert.ok(Array.isArray(body.data.upcomingSessions));
    assert.ok(Array.isArray(body.data.recentActivity));
    assert.ok(body.data.profileCompletion);
    assert.ok(body.data.profileCompletion.percentage > 0);

    // Verify recommendations include reciprocal match User B
    const bMatch = body.data.recommendations.find((m: any) => m.userId === userBId);
    assert.ok(bMatch, 'User B should appear in reciprocal recommendations for User A');
    assert.equal(bMatch.isReciprocal, true);
  });

  test('4. GET /api/dashboard/summary returns accurate statistics', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/summary`, {
      headers: { Cookie: cookieA },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(typeof body.data.completedSessions, 'number');
    assert.equal(typeof body.data.activeSwaps, 'number');
    assert.equal(typeof body.data.upcomingSessionsCount, 'number');
    assert.equal(typeof body.data.unreadMessagesCount, 'number');
    assert.equal(typeof body.data.unreadNotificationsCount, 'number');
    assert.equal(body.data.teachingSkillsCount, 1);
    assert.equal(body.data.learningSkillsCount, 1);
  });

  test('5. GET /api/dashboard/activity returns chronological activity list', async () => {
    const res = await fetch(`${baseUrl}/api/dashboard/activity?limit=5`, {
      headers: { Cookie: cookieA },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.activities));
  });

  test('6. POST /api/auth/change-password validates current password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword999!',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error.message, /Incorrect current password/i);
  });

  test('7. POST /api/auth/change-password validates new password length', async () => {
    const res = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        currentPassword: userA.password,
        newPassword: 'short',
      }),
    });

    assert.equal(res.status, 400);
  });

  test('8. POST /api/auth/change-password successfully updates password', async () => {
    const newPassword = 'UpdatedPassword123!';
    const res = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        currentPassword: userA.password,
        newPassword,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify old password no longer works
    const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userA.email,
        password: userA.password,
      }),
    });
    assert.equal(oldLogin.status, 401);

    // Verify new password works
    const newLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userA.email,
        password: newPassword,
      }),
    });
    assert.equal(newLogin.status, 200);
    const updatedA = extractCookieAndCsrf(newLogin);
    cookieA = updatedA.cookie;
    csrfA = updatedA.csrf;
    userA.password = newPassword; // update test state
  });

  test('9. GET and PATCH /api/users/me/notification-preferences', async () => {
    // 1. Get default preferences
    const getRes = await fetch(`${baseUrl}/api/users/me/notification-preferences`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.success, true);
    assert.equal(getBody.data.preferences.swapRequests, true);
    assert.equal(getBody.data.preferences.sessions, true);

    // 2. Disable session notifications
    const patchRes = await fetch(`${baseUrl}/api/users/me/notification-preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        sessions: false,
      }),
    });
    assert.equal(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.equal(patchBody.data.preferences.sessions, false);
    assert.equal(patchBody.data.preferences.swapRequests, true);

    // 3. Test notification suppression in notification.service
    const notif = await notificationService.createNotification({
      userId: userAId,
      type: 'SESSION_SCHEDULED',
      title: 'Session scheduled',
      message: 'Your reciprocal session is scheduled',
    });

    assert.equal(notif.id, 0, 'Suppressed notification should not create a database record');
  });

  test('10. DELETE /api/users/me validates password confirmation', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
      body: JSON.stringify({
        password: 'WrongPassword!',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error.message, /Incorrect password/i);
  });

  test('11. DELETE /api/users/me soft-deactivates user and rejects future logins', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
      body: JSON.stringify({
        password: userB.password,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify user is marked inactive in database
    const userInDb = await userRepository.findById(userBId);
    assert.ok(userInDb);
    assert.equal(userInDb.isActive, false);
    assert.ok(userInDb.deletedAt);

    // Verify login attempt fails with deactivated message
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userB.email,
        password: userB.password,
      }),
    });

    assert.equal(loginRes.status, 401);
    const loginBody = await loginRes.json();
    assert.match(loginBody.error.message, /deactivated/i);
  });

  test('12. Public profile query never exposes sensitive credentials', async () => {
    const res = await fetch(`${baseUrl}/api/users/${userA.username}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.passwordHash, undefined);
    assert.equal(body.data.passwordResetHash, undefined);
    assert.equal(body.data.passwordResetExpiresAt, undefined);
  });
});
