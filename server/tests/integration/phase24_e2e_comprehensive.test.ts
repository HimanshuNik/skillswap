import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { skillRepository } from '../../src/repositories/skill.repository.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';

describe('Phase 24 — Comprehensive End-to-End User Journeys (8 Priority Flows)', () => {
  let server: Server;
  let baseUrl: string;
  const timestamp = Date.now();

  // Test users
  const userA = {
    name: 'Alice Phase24',
    username: `p24_alice_${timestamp}`,
    email: `p24_alice_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const userB = {
    name: 'Bob Phase24',
    username: `p24_bob_${timestamp}`,
    email: `p24_bob_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const admin = {
    name: 'Admin Phase24',
    username: `p24_adm_${timestamp}`,
    email: `p24_adm_${timestamp}@example.com`,
    password: 'Password123!',
  };

  let userA_Id: number;
  let userB_Id: number;
  let adminId: number;

  let cookieA = '';
  let cookieB = '';
  let cookieAdmin = '';
  let csrfA = '';
  let csrfB = '';
  let csrfAdmin = '';

  let reactSkillId: number;
  let pythonSkillId: number;
  let swapRequestId: number;
  let conversationId: number;
  let sessionId: number;
  let communityPostId: number;
  let studyGroupId: number;
  let groupSessionId: number;

  function extractCookieAndCsrf(res: Response) {
    const rawHeaders: string[] =
      typeof (res.headers as any).getSetCookie === 'function'
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
        const port = typeof addr === 'object' && addr ? addr.port : 5099;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Ensure base skills exist in database
    const s1 = await skillRepository.findOrCreate('React', 'Development');
    const s2 = await skillRepository.findOrCreate('Python', 'Development');
    reactSkillId = s1.id;
    pythonSkillId = s2.id;
  });

  after(async () => {
    if (server) {
      server.closeAllConnections?.();
      server.close();
    }
  });

  // =========================================================================
  // JOURNEY 1: Register -> Onboard -> Dashboard
  // =========================================================================
  test('Journey 1: Register Alice & Bob, Complete Onboarding & Verify Dashboard', async () => {
    // 1. Register Alice
    const resRegA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    assert.equal(resRegA.status, 201);
    const bodyRegA = await resRegA.json();
    userA_Id = bodyRegA.data.user.id;
    const credA = extractCookieAndCsrf(resRegA);
    cookieA = credA.cookie;
    csrfA = credA.csrf;

    // 2. Register Bob
    const resRegB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    assert.equal(resRegB.status, 201);
    const bodyRegB = await resRegB.json();
    userB_Id = bodyRegB.data.user.id;
    const credB = extractCookieAndCsrf(resRegB);
    cookieB = credB.cookie;
    csrfB = credB.csrf;

    // 3. Complete Onboarding for Alice: Teaches React, Wants Python
    const resOnbA = await fetch(`${baseUrl}/api/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        profile: {
          displayName: userA.name,
          bio: 'Frontend engineer eager to master data pipelines and backend Python.',
          location: 'San Francisco, CA',
        },
        teachingSkills: [{ name: 'React', level: 'Expert' }],
        learningSkills: [{ name: 'Python', targetLevel: 'Intermediate' }],
        availability: {
          schedule: [{ day: 'Wednesday', slots: ['Evening'] }],
          sessionLength: 60,
          timezone: 'America/Los_Angeles',
        },
      }),
    });
    assert.equal(resOnbA.status, 200);

    // 4. Complete Onboarding for Bob: Teaches Python, Wants React
    const resOnbB = await fetch(`${baseUrl}/api/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
      body: JSON.stringify({
        profile: {
          displayName: userB.name,
          bio: 'Backend Python developer wanting to learn modern React 19 UI.',
          location: 'Austin, TX',
        },
        teachingSkills: [{ name: 'Python', level: 'Advanced' }],
        learningSkills: [{ name: 'React', targetLevel: 'Intermediate' }],
        availability: {
          schedule: [{ day: 'Wednesday', slots: ['Evening'] }],
          sessionLength: 60,
          timezone: 'America/Chicago',
        },
      }),
    });
    assert.equal(resOnbB.status, 200);

    // 5. Verify Alice's Dashboard
    const resDashA = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(resDashA.status, 200);
    const dashBodyA = await resDashA.json();
    assert.equal(dashBodyA.success, true);
    assert.ok(dashBodyA.data);
  });

  // =========================================================================
  // JOURNEY 2: Discover -> Reciprocal Match -> Swap Request
  // =========================================================================
  test('Journey 2: Alice discovers Bob, verifies high reciprocal match score & sends swap request', async () => {
    // 1. Discover Bob via search
    const resDisc = await fetch(`${baseUrl}/api/users?search=${userB.username}`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(resDisc.status, 200);
    const discBody = await resDisc.json();
    const foundBob = discBody.data.users.find((u: any) => u.id === userB_Id);
    assert.ok(foundBob, 'Bob should appear in discovery');

    // 2. Fetch Reciprocal Matches
    const resMatches = await fetch(`${baseUrl}/api/matches`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(resMatches.status, 200);
    const matchesBody = await resMatches.json();
    const matchWithBob = matchesBody.data.matches.find((m: any) => m.user.id === userB_Id);
    assert.ok(matchWithBob, 'Bob must be a reciprocal match for Alice');
    assert.equal(matchWithBob.isReciprocal, true);
    assert.ok(
      matchWithBob.compatibilityScore >= 80,
      `Compatibility score should be high (>80) for reciprocal match, got ${matchWithBob.compatibilityScore}`
    );

    // 3. Send Reciprocal Swap Request (Alice teaches React, wants Python from Bob)
    const resSwap = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        receiverId: userB_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: pythonSkillId,
        message: 'Hi Bob! Let us swap React for Python.',
      }),
    });
    assert.equal(resSwap.status, 201);
    const swapBody = await resSwap.json();
    assert.equal(swapBody.success, true);
    assert.equal(swapBody.data.swapRequest.status, 'PENDING');
    swapRequestId = swapBody.data.swapRequest.id;
  });

  // =========================================================================
  // JOURNEY 3: Accept Swap -> Conversation -> Messaging
  // =========================================================================
  test('Journey 3: Bob accepts Swap Request, Conversation is initialized & messages exchanged', async () => {
    // 1. Bob views incoming requests
    const resReceived = await fetch(`${baseUrl}/api/swap-requests/incoming`, {
      headers: { Cookie: cookieB },
    });
    assert.equal(resReceived.status, 200);
    const receivedBody = await resReceived.json();
    const targetReq = receivedBody.data.requests.find((r: any) => r.id === swapRequestId);
    assert.ok(targetReq, 'Bob must see Alice’s incoming swap request');

    // 2. Bob accepts request
    const resAccept = await fetch(`${baseUrl}/api/swap-requests/${swapRequestId}/accept`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
    });
    assert.equal(resAccept.status, 200);
    const acceptBody = await resAccept.json();
    assert.equal(acceptBody.data.swapRequest.status, 'ACCEPTED');
    conversationId = acceptBody.data.conversationId;

    // 3. Verify conversation is accessible
    const resConv = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      headers: { Cookie: cookieB },
    });
    assert.equal(resConv.status, 200);

    // 4. Alice sends message
    const resMsgA = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        content: 'Hey Bob, excited to swap skills with you!',
      }),
    });
    assert.equal(resMsgA.status, 201);

    // 5. Bob reads messages and marks read
    const resRead = await fetch(`${baseUrl}/api/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: {
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
    });
    assert.equal(resRead.status, 200);
  });

  // =========================================================================
  // JOURNEY 4: Schedule Session -> Complete -> Review
  // =========================================================================
  test('Journey 4: Schedule Direction 1 session, mutually complete & submit verified review', async () => {
    // 1. Alice schedules Direction 1 (Alice teaches Bob React)
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const resSched = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        swapRequestId,
        teacherId: userA_Id,
        learnerId: userB_Id,
        skillId: reactSkillId,
        scheduledStart: startTime.toISOString(),
        duration: 60,
      }),
    });
    assert.equal(resSched.status, 201);
    const schedBody = await resSched.json();
    sessionId = schedBody.data.session.id;
    assert.ok(schedBody.data.session.meetingUrl, 'Jitsi meeting URL must be generated');

    // 2. Fast-forward session start time so it has occurred
    await db.orm.public.Session.where({ id: sessionId }).update({
      scheduledStart: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    });

    // 3. Alice completes session
    const resComplete = await fetch(`${baseUrl}/api/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
    });
    assert.equal(resComplete.status, 200);

    // 3. Bob confirms completion
    const resConfirm = await fetch(`${baseUrl}/api/sessions/${sessionId}/complete/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
      body: JSON.stringify({
        action: 'CONFIRM',
      }),
    });
    assert.equal(resConfirm.status, 200);
    const confirmBody = await resConfirm.json();
    assert.equal(confirmBody.data.session.status, 'COMPLETED');

    // 4. Bob reviews Alice (5 stars)
    const resReview = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
      body: JSON.stringify({
        sessionId,
        rating: 5,
        comment: 'Alice is an outstanding React tutor! Highly recommended.',
      }),
    });
    assert.equal(resReview.status, 201);

    // 5. Check Alice’s reputation recalculation
    const resRep = await fetch(`${baseUrl}/api/users/${userA_Id}/reputation`);
    assert.equal(resRep.status, 200);
    const repBody = await resRep.json();
    assert.equal(repBody.data.reputation.averageRating, 5.0);
    assert.equal(repBody.data.reputation.totalReviews, 1);
  });

  // =========================================================================
  // JOURNEY 5: Create Community Post -> Comment
  // =========================================================================
  test('Journey 5: Alice creates a discussion post; Bob adds a comment and votes', async () => {
    // 1. Alice creates discussion post
    const resPost = await fetch(`${baseUrl}/api/community/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        title: 'Architecting Scalable React 19 Client Components',
        content: 'Sharing learnings from modern state management patterns.',
        postType: 'DISCUSSION',
        tags: 'react,architecture,web',
      }),
    });
    assert.equal(resPost.status, 201);
    const postBody = await resPost.json();
    communityPostId = postBody.data.post.id;
    assert.equal(postBody.data.post.authorId, userA_Id);

    // 2. Bob adds a comment
    const resComment = await fetch(`${baseUrl}/api/community/posts/${communityPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
      body: JSON.stringify({
        content: 'Great write-up! I especially appreciate the separation of concerns.',
      }),
    });
    assert.equal(resComment.status, 201);
    const commentBody = await resComment.json();
    assert.equal(commentBody.data.comment.authorId, userB_Id);

    // 3. Bob upvotes the post
    const resVote = await fetch(`${baseUrl}/api/community/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
      body: JSON.stringify({
        targetType: 'POST',
        targetId: communityPostId,
      }),
    });
    assert.equal(resVote.status, 200);
    const voteBody = await resVote.json();
    assert.equal(voteBody.data.upvoted, true);
  });

  // =========================================================================
  // JOURNEY 6: Join Study Group -> Register for Session
  // =========================================================================
  test('Journey 6: Alice creates a study group, schedules group session & Bob registers', async () => {
    // 1. Alice creates public study group
    const resGroup = await fetch(`${baseUrl}/api/community/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        name: `Full-Stack Masterclass ${timestamp}`,
        description: 'Collaborative group for full-stack engineering practices.',
        visibility: 'PUBLIC',
      }),
    });
    assert.equal(resGroup.status, 201);
    const groupBody = await resGroup.json();
    studyGroupId = groupBody.data.group.id;

    // 2. Bob joins the group
    const resJoin = await fetch(`${baseUrl}/api/community/groups/${studyGroupId}/join`, {
      method: 'POST',
      headers: {
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
    });
    assert.equal(resJoin.status, 200);

    // 3. Alice schedules group session
    const startTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();

    const resGrpSession = await fetch(`${baseUrl}/api/community/groups/${studyGroupId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        title: 'High-Concurrency Systems Workshop',
        description: 'Hands-on practice with database indexing and load balancing.',
        topic: 'Backend Architecture',
        startTime,
        endTime,
        maxParticipants: 15,
      }),
    });
    assert.equal(resGrpSession.status, 201);
    const grpSessionBody = await resGrpSession.json();
    groupSessionId = grpSessionBody.data.id;

    // 4. Bob registers for group session
    const resRegSession = await fetch(
      `${baseUrl}/api/community/groups/${studyGroupId}/sessions/${groupSessionId}/register`,
      {
        method: 'POST',
        headers: {
          Cookie: cookieB,
          'x-csrf-token': csrfB,
        },
      }
    );
    assert.equal(resRegSession.status, 201);
    const regSessionBody = await resRegSession.json();
    assert.equal(regSessionBody.data.status, 'REGISTERED');
  });

  // =========================================================================
  // JOURNEY 7: Update Profile -> Save Settings
  // =========================================================================
  test('Journey 7: Alice updates profile bio, location and notification preferences', async () => {
    // 1. Update profile bio
    const resProfile = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        bio: 'Senior Full-Stack Engineer and dedicated peer mentor.',
        location: 'San Francisco Bay Area, CA',
      }),
    });
    assert.equal(resProfile.status, 200);
    const profileBody = await resProfile.json();
    assert.equal(profileBody.data.user.bio, 'Senior Full-Stack Engineer and dedicated peer mentor.');

    // 2. Update notification preferences
    const resNotif = await fetch(`${baseUrl}/api/users/me/notification-preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        emailAlerts: true,
        pushEnabled: true,
        swapRequests: true,
        sessions: true,
      }),
    });
    assert.equal(resNotif.status, 200);
    const notifBody = await resNotif.json();
    assert.equal(notifBody.data.preferences.emailAlerts, true);
    assert.equal(notifBody.data.preferences.swapRequests, true);
  });

  // =========================================================================
  // JOURNEY 8: Admin Login -> Authorized Moderation
  // =========================================================================
  test('Journey 8: Standard user blocked (403), Admin logs in and performs authorized moderation audit', async () => {
    // 1. Standard user Alice attempts admin endpoint -> 403 Forbidden
    const resForbidden = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(resForbidden.status, 403);

    // 2. Register Admin User and promote to ADMIN in DB
    const resRegAdmin = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(admin),
    });
    assert.equal(resRegAdmin.status, 201);
    const adminData = await resRegAdmin.json();
    adminId = adminData.data.user.id;
    await userRepository.updateRole(adminId, 'ADMIN');

    // 3. Admin logs in
    const resLoginAdmin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: admin.email,
        password: admin.password,
      }),
    });
    assert.equal(resLoginAdmin.status, 200);
    const credAdmin = extractCookieAndCsrf(resLoginAdmin);
    cookieAdmin = credAdmin.cookie;
    csrfAdmin = credAdmin.csrf;

    // 4. Admin accesses platform overview
    const resOverview = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Cookie: cookieAdmin },
    });
    assert.equal(resOverview.status, 200);
    const overviewBody = await resOverview.json();
    assert.equal(overviewBody.success, true);
    assert.ok(overviewBody.data.users);

    // 5. Admin queries audit logs
    const resAudit = await fetch(`${baseUrl}/api/admin/audit?limit=10`, {
      headers: { Cookie: cookieAdmin },
    });
    assert.equal(resAudit.status, 200);
    const auditBody = await resAudit.json();
    assert.equal(auditBody.success, true);
    assert.ok(Array.isArray(auditBody.data.logs));
  });
});
