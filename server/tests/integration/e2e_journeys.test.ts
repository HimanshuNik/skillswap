import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { skillRepository } from '../../src/repositories/skill.repository.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';

describe('Phase 11 — End-to-End User Journeys (8 Comprehensive Journeys)', () => {
  let server: Server;
  let baseUrl: string;
  const port = 5088;
  const timestamp = Date.now();

  const alice = {
    name: 'Alice Journey',
    username: `alice_j_${timestamp}`,
    email: `alice_j_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const bob = {
    name: 'Bob Journey',
    username: `bob_j_${timestamp}`,
    email: `bob_j_${timestamp}@example.com`,
    password: 'Password123!',
  };

  let aliceId: number;
  let bobId: number;
  let cookieAlice = '';
  let cookieBob = '';
  let csrfAlice = '';
  let csrfBob = '';

  let reactSkillId: number;
  let figmaSkillId: number;
  let swapRequestId: number;
  let conversationId: number;
  let sessionDir1Id: number;
  let sessionDir2Id: number;

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
        const assignedPort = typeof addr === 'object' && addr ? addr.port : 5088;
        baseUrl = `http://127.0.0.1:${assignedPort}`;
        resolve();
      });
    });

    // Ensure catalog skills exist
    const react = await skillRepository.findOrCreate('React.js', 'Development');
    const figma = await skillRepository.findOrCreate('Figma UI/UX', 'Design');
    reactSkillId = react.id;
    figmaSkillId = figma.id;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // =========================================================================
  // Journey 1 — Authentication & Onboarding Flow
  // =========================================================================
  test('Journey 1: Register Alice & Bob, Login, Complete Onboarding & Verify Dashboard', async () => {
    // 1. Register Alice
    const regResAlice = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alice),
    });
    assert.equal(regResAlice.status, 201);
    const regBodyAlice = await regResAlice.json();
    aliceId = regBodyAlice.data.user.id;
    const credAlice = extractCookieAndCsrf(regResAlice);
    cookieAlice = credAlice.cookie;
    csrfAlice = credAlice.csrf;

    // 2. Register Bob
    const regResBob = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bob),
    });
    assert.equal(regResBob.status, 201);
    const regBodyBob = await regResBob.json();
    bobId = regBodyBob.data.user.id;
    const credBob = extractCookieAndCsrf(regResBob);
    cookieBob = credBob.cookie;
    csrfBob = credBob.csrf;

    // 3. Complete Onboarding for Alice: Teaches React, Wants Figma
    const onbAlice = await fetch(`${baseUrl}/api/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieAlice,
        'x-csrf-token': csrfAlice,
      },
      body: JSON.stringify({
        profile: {
          displayName: alice.name,
          bio: 'Frontend expert exploring UI design',
          location: 'San Francisco, CA',
        },
        teachingSkills: [{ name: 'React', level: 'Advanced' }],
        learningSkills: [{ name: 'Figma', targetLevel: 'Intermediate' }],
        availability: {
          schedule: [{ day: 'Tuesday', slots: ['Evening'] }],
          sessionLength: 60,
          timezone: 'America/Los_Angeles',
        },
      }),
    });
    assert.equal(onbAlice.status, 200);
    const onbBodyAlice = await onbAlice.json();
    reactSkillId = onbBodyAlice.data.teachingSkills[0].skillId;
    figmaSkillId = onbBodyAlice.data.learningSkills[0].skillId;

    // 4. Complete Onboarding for Bob: Teaches Figma, Wants React
    const onbBob = await fetch(`${baseUrl}/api/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieBob,
        'x-csrf-token': csrfBob,
      },
      body: JSON.stringify({
        profile: {
          displayName: bob.name,
          bio: 'Product designer wanting to master React',
          location: 'San Francisco, CA',
        },
        teachingSkills: [{ name: 'Figma', level: 'Expert' }],
        learningSkills: [{ name: 'React', targetLevel: 'Beginner' }],
        availability: {
          schedule: [{ day: 'Tuesday', slots: ['Evening'] }],
          sessionLength: 60,
          timezone: 'America/Los_Angeles',
        },
      }),
    });
    assert.equal(onbBob.status, 200);

    // 5. Verify Alice's Dashboard metrics
    const dashRes = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Cookie: cookieAlice },
    });
    assert.equal(dashRes.status, 200);
    const dashBody = await dashRes.json();
    assert.equal(dashBody.success, true);
    assert.ok(dashBody.data.profileCompletion.percentage >= 80);
  });

  // =========================================================================
  // Journey 2 — Discovery & Reciprocal Matching
  // =========================================================================
  test('Journey 2: Alice Discovers Bob via Search, Category Filter & Two-Way Matching', async () => {
    // 1. Search Discovery
    const discRes = await fetch(`${baseUrl}/api/users?search=${encodeURIComponent(bob.username)}`);
    assert.equal(discRes.status, 200);
    const discBody = await discRes.json();
    assert.ok(discBody.data.users.some((u: any) => u.id === bobId));

    // 2. Check Two-Way Matches for Alice
    const matchRes = await fetch(`${baseUrl}/api/matches`, {
      headers: { Cookie: cookieAlice },
    });
    assert.equal(matchRes.status, 200);
    const matchBody = await matchRes.json();
    const bobMatch = matchBody.data.matches.find((m: any) => m.userId === bobId);
    assert.ok(bobMatch, 'Bob should appear in Alice matching recommendations');
    assert.ok(bobMatch.isReciprocal, 'Match between Alice and Bob must be flagged reciprocal');
    assert.ok(bobMatch.compatibilityScore >= 70, 'Reciprocal compatibility score must be >= 70');

    // 3. View Bob Public Profile
    const profileRes = await fetch(`${baseUrl}/api/users/${bob.username}`);
    assert.equal(profileRes.status, 200);
    const profileBody = await profileRes.json();
    assert.equal(profileBody.data.username, bob.username);
  });

  // =========================================================================
  // Journey 3 — Swap Requests Lifecycle
  // =========================================================================
  test('Journey 3: Alice sends Swap Request, Bob accepts, Connection created', async () => {
    // 1. Alice proposes skill swap: offers React (senderSkillId), asks for Figma (receiverSkillId)
    const swapReqRes = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieAlice,
        'x-csrf-token': csrfAlice,
      },
      body: JSON.stringify({
        receiverId: bobId,
        senderSkillId: reactSkillId,
        receiverSkillId: figmaSkillId,
        message: 'Hi Bob, I would love to teach you React in exchange for Figma lessons!',
      }),
    });
    assert.equal(swapReqRes.status, 201);
    const swapReqBody = await swapReqRes.json();
    swapRequestId = swapReqBody.data.swapRequest.id;

    // 2. Bob views incoming requests
    const incomingRes = await fetch(`${baseUrl}/api/swap-requests/incoming`, {
      headers: { Cookie: cookieBob },
    });
    assert.equal(incomingRes.status, 200);
    const incomingBody = await incomingRes.json();
    const reqForBob = incomingBody.data.requests.find((r: any) => r.id === swapRequestId);
    assert.ok(reqForBob);
    assert.equal(reqForBob.status, 'PENDING');

    // 3. Bob accepts request
    const acceptRes = await fetch(`${baseUrl}/api/swap-requests/${swapRequestId}/accept`, {
      method: 'PATCH',
      headers: {
        Cookie: cookieBob,
        'x-csrf-token': csrfBob,
      },
    });
    assert.equal(acceptRes.status, 200);
    const acceptBody = await acceptRes.json();
    assert.equal(acceptBody.data.swapRequest.status, 'ACCEPTED');
    conversationId = acceptBody.data.conversationId || acceptBody.data.conversation?.id;
    assert.ok(conversationId, 'Accepting a swap request must create a conversation');
  });

  // =========================================================================
  // Journey 4 — Real-Time Messaging & Read Receipts
  // =========================================================================
  test('Journey 4: Alice & Bob exchange messages and mark conversation as read', async () => {
    // 1. Alice sends first message
    const msgRes1 = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieAlice,
        'x-csrf-token': csrfAlice,
      },
      body: JSON.stringify({
        content: 'Hey Bob! Excited to get started.',
      }),
    });
    assert.equal(msgRes1.status, 201);

    // 2. Bob views conversation messages
    const getMsgsRes = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      headers: { Cookie: cookieBob },
    });
    assert.equal(getMsgsRes.status, 200);
    const getMsgsBody = await getMsgsRes.json();
    assert.equal(getMsgsBody.data.messages.length, 1);
    assert.equal(getMsgsBody.data.messages[0].content, 'Hey Bob! Excited to get started.');

    // 3. Bob marks messages as read
    const readRes = await fetch(`${baseUrl}/api/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: {
        Cookie: cookieBob,
        'x-csrf-token': csrfBob,
      },
    });
    assert.equal(readRes.status, 200);
  });

  // =========================================================================
  // Journey 5 — Session Scheduling, Rescheduling & Direction 1 Completion
  // =========================================================================
  test('Journey 5: Alice schedules Direction 1, reschedules, joins and completes', async () => {
    // Tomorrow at 10:00 AM
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(10, 0, 0, 0);

    // 1. Alice schedules Direction 1: Alice teaches React to Bob
    const schedRes = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieAlice,
        'x-csrf-token': csrfAlice,
      },
      body: JSON.stringify({
        swapRequestId,
        teacherId: aliceId,
        learnerId: bobId,
        skillId: reactSkillId,
        scheduledStart: tomorrow.toISOString(),
        duration: 60,
        notes: 'Intro to React components and hooks',
      }),
    });
    assert.equal(schedRes.status, 201);
    const schedBody = await schedRes.json();
    sessionDir1Id = schedBody.data.session.id;

    // 2. Bob proposes reschedule (+2 hours)
    const newStart = new Date(tomorrow.getTime() + 2 * 3600000);
    const reschedRes = await fetch(`${baseUrl}/api/sessions/${sessionDir1Id}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieBob,
        'x-csrf-token': csrfBob,
      },
      body: JSON.stringify({
        proposedStart: newStart.toISOString(),
        duration: 60,
        reason: 'Conflict with morning standup',
      }),
    });
    assert.equal(reschedRes.status, 200);

    // 3. Alice accepts reschedule proposal
    const acceptReschedRes = await fetch(`${baseUrl}/api/sessions/${sessionDir1Id}/reschedule/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieAlice,
        'x-csrf-token': csrfAlice,
      },
      body: JSON.stringify({
        action: 'ACCEPT',
      }),
    });
    assert.equal(acceptReschedRes.status, 200);

    // 4. Retrieve Meeting Info
    const meetingRes = await fetch(`${baseUrl}/api/sessions/${sessionDir1Id}/meeting`, {
      headers: { Cookie: cookieAlice },
    });
    assert.equal(meetingRes.status, 200);
    const meetingBody = await meetingRes.json();
    assert.ok(meetingBody.data.meetingRoomId);
    assert.equal(meetingBody.data.provider, 'Jitsi');

    // 5. Simulate session window reached (advance session time into the past)
    await db.orm.public.Session.where({ id: sessionDir1Id }).update({
      scheduledStart: new Date(Date.now() - 30 * 60000).toISOString(),
      scheduledEnd: new Date(Date.now() + 30 * 60000).toISOString(),
    });

    // Alice (Teacher) marks session complete
    const completeRes = await fetch(`${baseUrl}/api/sessions/${sessionDir1Id}/complete`, {
      method: 'POST',
      headers: {
        Cookie: cookieAlice,
        'x-csrf-token': csrfAlice,
      },
    });
    assert.equal(completeRes.status, 200);

    // 6. Bob (Learner) confirms completion
    const confirmRes = await fetch(`${baseUrl}/api/sessions/${sessionDir1Id}/complete/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieBob,
        'x-csrf-token': csrfBob,
      },
      body: JSON.stringify({
        action: 'CONFIRM',
      }),
    });
    assert.equal(confirmRes.status, 200);

    // 7. Verify Direction 1 status is COMPLETED and parent SwapRequest remains IN_PROGRESS
    const checkSwap = await db.orm.public.SwapRequest.where({ id: swapRequestId }).first();
    assert.equal((checkSwap as any).status, 'IN_PROGRESS', 'Single direction completed must leave swap IN_PROGRESS');
  });

  // =========================================================================
  // Journey 6 — Reciprocal Swap Completion (Direction 2)
  // =========================================================================
  test('Journey 6: Bob schedules Direction 2 (Figma), completes -> Swap fully COMPLETED', async () => {
    // 1. Bob schedules Direction 2: Bob teaches Figma to Alice
    const nextWeek = new Date(Date.now() + 2 * 86400000);
    nextWeek.setHours(15, 0, 0, 0);

    const schedRes2 = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieBob,
        'x-csrf-token': csrfBob,
      },
      body: JSON.stringify({
        swapRequestId,
        teacherId: bobId,
        learnerId: aliceId,
        skillId: figmaSkillId,
        scheduledStart: nextWeek.toISOString(),
        duration: 60,
        notes: 'Figma autolayout and design tokens',
      }),
    });
    assert.equal(schedRes2.status, 201);
    const schedBody2 = await schedRes2.json();
    sessionDir2Id = schedBody2.data.session.id;

    // 2. Simulate session window reached (advance session time into the past)
    await db.orm.public.Session.where({ id: sessionDir2Id }).update({
      scheduledStart: new Date(Date.now() - 30 * 60000).toISOString(),
      scheduledEnd: new Date(Date.now() + 30 * 60000).toISOString(),
    });

    // Bob (Teacher) marks Direction 2 complete
    const completeRes2 = await fetch(`${baseUrl}/api/sessions/${sessionDir2Id}/complete`, {
      method: 'POST',
      headers: {
        Cookie: cookieBob,
        'x-csrf-token': csrfBob,
      },
    });
    assert.equal(completeRes2.status, 200);

    // 3. Alice (Learner) confirms completion
    const confirmRes2 = await fetch(`${baseUrl}/api/sessions/${sessionDir2Id}/complete/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieAlice,
        'x-csrf-token': csrfAlice,
      },
      body: JSON.stringify({
        action: 'CONFIRM',
      }),
    });
    assert.equal(confirmRes2.status, 200);

    // 4. Verify parent SwapRequest is now fully COMPLETED
    const checkSwap = await db.orm.public.SwapRequest.where({ id: swapRequestId }).first();
    assert.equal((checkSwap as any).status, 'COMPLETED', 'Both directions completed must transition swap to COMPLETED');
  });

  // =========================================================================
  // Journey 7 — Reviews & Real-Time Notifications
  // =========================================================================
  test('Journey 7: Learner reviews teacher, reputation updates, notification received', async () => {
    // 1. Bob (Learner of Session 1) reviews Alice (Teacher of Session 1)
    const reviewRes = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieBob,
        'x-csrf-token': csrfBob,
      },
      body: JSON.stringify({
        sessionId: sessionDir1Id,
        rating: 5,
        comment: 'Alice explained React concepts brilliantly with clear practical code!',
      }),
    });
    assert.equal(reviewRes.status, 201);

    // 2. Verify Alice reputation updated
    const repRes = await fetch(`${baseUrl}/api/reviews/user/${aliceId}/reputation`);
    assert.equal(repRes.status, 200);
    const repBody = await repRes.json();
    assert.equal(repBody.data.reputation.averageRating, 5);
    assert.equal(repBody.data.reputation.totalReviews, 1);

    // 3. Alice checks her notifications and marks as read
    const notifRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Cookie: cookieAlice },
    });
    assert.equal(notifRes.status, 200);
    const notifBody = await notifRes.json();
    assert.ok(notifBody.data.notifications.length > 0);

    const markAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        Cookie: cookieAlice,
        'x-csrf-token': csrfAlice,
      },
    });
    assert.equal(markAllRes.status, 200);
  });

  // =========================================================================
  // Journey 8 — Profile & Settings Management
  // =========================================================================
  test('Journey 8: Edit Profile, update notification preferences & verify persistence', async () => {
    // 1. Alice updates profile bio & location
    const updateRes = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieAlice,
        'x-csrf-token': csrfAlice,
      },
      body: JSON.stringify({
        bio: 'Senior React Developer & Community Mentor',
        location: 'San Francisco, CA',
      }),
    });
    assert.equal(updateRes.status, 200);

    // 2. Alice updates notification preferences
    const prefRes = await fetch(`${baseUrl}/api/users/me/notification-preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieAlice,
        'x-csrf-token': csrfAlice,
      },
      body: JSON.stringify({
        swapRequests: true,
        messages: true,
        sessions: true,
        reviews: true,
        emailAlerts: false,
      }),
    });
    assert.equal(prefRes.status, 200);
    const prefBody = await prefRes.json();
    assert.equal(prefBody.data.preferences.emailAlerts, false);

    // 3. Verify persistence via GET /api/users/me
    const meRes = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Cookie: cookieAlice },
    });
    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.data.user.bio, 'Senior React Developer & Community Mentor');
    assert.equal(meBody.data.user.location, 'San Francisco, CA');
  });
});

