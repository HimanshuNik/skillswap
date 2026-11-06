import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { skillRepository } from '../../src/repositories/skill.repository.js';
import { userSkillRepository } from '../../src/repositories/userSkill.repository.js';
import { swapRequestRepository } from '../../src/repositories/swapRequest.repository.js';
import { sessionRepository } from '../../src/repositories/session.repository.js';

describe('Phase 7 — Session Scheduling & Video Meetings Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  const port = 5059;
  const timestamp = Date.now();

  let userA_Id = 0; // Alice (teaches React, learns UI/UX)
  let userB_Id = 0; // Bob (teaches UI/UX, learns React)
  let userC_Id = 0; // Charlie (unauthorized third-party)

  let userA_Cookie = '';
  let userA_Csrf = '';

  let userB_Cookie = '';
  let userB_Csrf = '';

  let userC_Cookie = '';
  let userC_Csrf = '';

  let reactSkillId = 0;
  let uiuxSkillId = 0;
  let guitarSkillId = 0;

  let acceptedSwapId = 0;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const assignedPort = typeof addr === 'object' && addr ? addr.port : 5059;
        baseUrl = `http://127.0.0.1:${assignedPort}`;
        resolve();
      });
    });

    // Ensure skills exist
    const react = await skillRepository.findOrCreate('React', 'Development');
    const uiux = await skillRepository.findOrCreate('UI/UX Design', 'Design');
    const guitar = await skillRepository.findOrCreate('Guitar', 'Creative');
    reactSkillId = react.id;
    uiuxSkillId = uiux.id;
    guitarSkillId = guitar.id;

    // Helper to register users
    async function registerUser(name: string, username: string, email: string) {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          username,
          email,
          password: 'Password123!',
        }),
      });
      assert.equal(res.status, 201);
      const json = await res.json();
      const userId = json.data.user.id;
      const setCookie = res.headers.get('set-cookie') || '';
      let authCookie = '';
      let csrfToken = '';

      const matchAuth = setCookie.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
      if (matchAuth) authCookie = `${AUTH_COOKIE_NAME}=${matchAuth[1]}`;

      const matchCsrf = setCookie.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
      if (matchCsrf) {
        authCookie += `; ${CSRF_COOKIE_NAME}=${matchCsrf[1]}`;
        csrfToken = matchCsrf[1];
      }

      return { userId, authCookie, csrfToken };
    }

    const alice = await registerUser(
      `Alice Seven ${timestamp}`,
      `alice_s7_${timestamp}`,
      `alice_s7_${timestamp}@test.com`
    );
    userA_Id = alice.userId;
    userA_Cookie = alice.authCookie;
    userA_Csrf = alice.csrfToken;

    const bob = await registerUser(
      `Bob Seven ${timestamp}`,
      `bob_s7_${timestamp}`,
      `bob_s7_${timestamp}@test.com`
    );
    userB_Id = bob.userId;
    userB_Cookie = bob.authCookie;
    userB_Csrf = bob.csrfToken;

    const charlie = await registerUser(
      `Charlie Seven ${timestamp}`,
      `charlie_s7_${timestamp}`,
      `charlie_s7_${timestamp}@test.com`
    );
    userC_Id = charlie.userId;
    userC_Cookie = charlie.authCookie;
    userC_Csrf = charlie.csrfToken;

    // Setup skills and onboarding
    await userSkillRepository.addTeachingSkill(userA_Id, reactSkillId, 'Advanced');
    await userSkillRepository.addLearningSkill(userA_Id, uiuxSkillId, 'Beginner');
    await userRepository.setOnboarded(userA_Id, true);

    await userSkillRepository.addTeachingSkill(userB_Id, uiuxSkillId, 'Expert');
    await userSkillRepository.addLearningSkill(userB_Id, reactSkillId, 'Intermediate');
    await userRepository.setOnboarded(userB_Id, true);

    await userSkillRepository.addTeachingSkill(userC_Id, guitarSkillId, 'Beginner');
    await userRepository.setOnboarded(userC_Id, true);

    // Create and accept a swap request between Alice and Bob
    const swap = await swapRequestRepository.create({
      senderId: userA_Id,
      receiverId: userB_Id,
      senderSkillId: reactSkillId,
      receiverSkillId: uiuxSkillId,
      message: 'Let us swap React and UI/UX!',
    });
    await swapRequestRepository.updateStatus(swap.id, 'ACCEPTED');
    acceptedSwapId = swap.id;
  });

  after(async () => {
    const userIds = [userA_Id, userB_Id, userC_Id].filter(Boolean);
    for (const uid of userIds) {
      await userSkillRepository.clearTeachingSkills(uid);
      await userSkillRepository.clearLearningSkills(uid);
      await db.orm.public.User.where({ id: uid }).delete();
    }
    server.closeAllConnections?.();
    server.close();
  });

  let session1_Id = 0;
  let session2_Id = 0;

  // 1. Authorized session creation (Direction 1: Alice teaches Bob React)
  test('1. Authorized session creation: Alice schedules React session for Bob', async () => {
    const futureDate = new Date(Date.now() + 2 * 86400000).toISOString(); // 2 days ahead

    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        swapRequestId: acceptedSwapId,
        teacherId: userA_Id,
        learnerId: userB_Id,
        skillId: reactSkillId,
        scheduledStart: futureDate,
        duration: 60,
        notes: 'First React session on state management',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.session.teacherId, userA_Id);
    assert.equal(body.data.session.learnerId, userB_Id);
    assert.equal(body.data.session.skillId, reactSkillId);
    assert.equal(body.data.session.status, 'SCHEDULED');
    assert.ok(body.data.session.meetingUrl.includes('https://meet.jit.si/skillswap-'));
    assert.ok(body.data.session.meetingRoomId.startsWith('skillswap-'));

    session1_Id = body.data.session.id;

    // Verify swap request status moved to IN_PROGRESS
    const swap = await swapRequestRepository.findById(acceptedSwapId);
    assert.equal(swap?.status, 'IN_PROGRESS');
  });

  // 2. Unauthorized session creation: User C cannot schedule session on Alice-Bob swap
  test('2. Unauthorized user cannot schedule session on other users swap', async () => {
    const futureDate = new Date(Date.now() + 3 * 86400000).toISOString();

    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userC_Cookie,
        'x-csrf-token': userC_Csrf,
      },
      body: JSON.stringify({
        swapRequestId: acceptedSwapId,
        teacherId: userA_Id,
        learnerId: userB_Id,
        skillId: reactSkillId,
        scheduledStart: futureDate,
        duration: 60,
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  // 3. Valid teaching direction 2: Bob teaches Alice UI/UX
  test('3. Authorized session creation: Bob schedules reciprocal UI/UX session for Alice', async () => {
    const futureDate = new Date(Date.now() + 4 * 86400000).toISOString(); // 4 days ahead

    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userB_Cookie,
        'x-csrf-token': userB_Csrf,
      },
      body: JSON.stringify({
        swapRequestId: acceptedSwapId,
        teacherId: userB_Id,
        learnerId: userA_Id,
        skillId: uiuxSkillId,
        scheduledStart: futureDate,
        duration: 60,
        notes: 'Wireframing in Figma',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.session.teacherId, userB_Id);
    assert.equal(body.data.session.learnerId, userA_Id);
    assert.equal(body.data.session.skillId, uiuxSkillId);

    session2_Id = body.data.session.id;
  });

  // 4. Invalid teaching direction rejected: Alice tries to teach UI/UX
  test('4. Invalid teaching direction or mismatched skill is rejected', async () => {
    const futureDate = new Date(Date.now() + 5 * 86400000).toISOString();

    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        swapRequestId: acceptedSwapId,
        teacherId: userA_Id,
        learnerId: userB_Id,
        skillId: uiuxSkillId, // Invalid: Alice doesn't teach UI/UX in this swap!
        scheduledStart: futureDate,
        duration: 60,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'BAD_REQUEST');
  });

  // 5. Start time in past rejected
  test('5. Start time in the past is rejected', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        swapRequestId: acceptedSwapId,
        teacherId: userA_Id,
        learnerId: userB_Id,
        skillId: reactSkillId,
        scheduledStart: pastDate,
        duration: 60,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'BAD_REQUEST');
    assert.ok(body.error.message.includes('future'));
  });

  // 6. Overlapping session conflict rejected for teacher (409 Conflict)
  test('6. Overlapping session conflict is rejected for teacher (409 Conflict)', async () => {
    // Attempt to schedule a new session overlapping exactly with session1
    const s1 = await sessionRepository.findById(session1_Id);
    assert.ok(s1?.scheduledStart);

    // Overlap: 15 minutes after session1 start
    const overlapStart = new Date(new Date(s1.scheduledStart).getTime() + 15 * 60000).toISOString();

    const res = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        swapRequestId: acceptedSwapId,
        teacherId: userA_Id,
        learnerId: userB_Id,
        skillId: reactSkillId,
        scheduledStart: overlapStart,
        duration: 60,
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error.code, 'CONFLICT');
    assert.ok(body.error.message.includes('conflicting session'));
  });

  // 7. Get sessions list for user with filtering
  test('7. User can retrieve their sessions with filter=upcoming and populated details', async () => {
    const res = await fetch(`${baseUrl}/api/sessions?filter=upcoming`, {
      headers: {
        Cookie: userA_Cookie,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.sessions));
    assert.ok(body.data.sessions.length >= 2);

    const foundS1 = body.data.sessions.find((s: any) => s.id === session1_Id);
    assert.ok(foundS1);
    assert.equal(foundS1.teacher.name, `Alice Seven ${timestamp}`);
    assert.equal(foundS1.learner.name, `Bob Seven ${timestamp}`);
    assert.equal(foundS1.skill.name, 'React');
  });

  // 8. Get single session by ID
  test('8. Participant can view single session by ID; third-party is denied', async () => {
    // Alice views session1
    const resA = await fetch(`${baseUrl}/api/sessions/${session1_Id}`, {
      headers: { Cookie: userA_Cookie },
    });
    assert.equal(resA.status, 200);
    const bodyA = await resA.json();
    assert.equal(bodyA.data.session.id, session1_Id);

    // Charlie views session1 -> 403 Forbidden
    const resC = await fetch(`${baseUrl}/api/sessions/${session1_Id}`, {
      headers: { Cookie: userC_Cookie },
    });
    assert.equal(resC.status, 403);
  });

  // 9. Reschedule proposal creation (RESCHEDULE_PROPOSED)
  test('9. User can propose a reschedule for an active session', async () => {
    const proposedDate = new Date(Date.now() + 6 * 86400000).toISOString(); // 6 days ahead

    const res = await fetch(`${baseUrl}/api/sessions/${session1_Id}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userB_Cookie, // Bob proposes reschedule
        'x-csrf-token': userB_Csrf,
      },
      body: JSON.stringify({
        proposedStart: proposedDate,
        duration: 90,
        reason: 'Have a doctor appointment, can we push to weekend?',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.session.status, 'RESCHEDULE_PROPOSED');
    assert.equal(body.data.session.rescheduledBy, userB_Id);
    assert.equal(body.data.session.duration, 90);
    assert.equal(body.data.session.rescheduleReason, 'Have a doctor appointment, can we push to weekend?');
  });

  // 10. Proposer cannot respond to their own reschedule proposal
  test('10. Proposer cannot respond to their own reschedule proposal (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/sessions/${session1_Id}/reschedule/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userB_Cookie, // Bob tries to accept his own proposal
        'x-csrf-token': userB_Csrf,
      },
      body: JSON.stringify({
        action: 'ACCEPT',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  // 11. Counterparty rejects reschedule -> reverts to SCHEDULED with original times
  test('11. Counterparty rejects reschedule proposal -> reverts status to SCHEDULED', async () => {
    const sBefore = await sessionRepository.findById(session1_Id);
    const origStart = sBefore?.scheduledStart;

    const res = await fetch(`${baseUrl}/api/sessions/${session1_Id}/reschedule/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie, // Alice declines Bob's proposal
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        action: 'REJECT',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.session.status, 'SCHEDULED');
    assert.equal(
      new Date(body.data.session.scheduledStart).getTime(),
      new Date(origStart!).getTime()
    );
    assert.equal(body.data.session.rescheduledBy, null);
    assert.equal(body.data.session.proposedStart, null);
  });

  // 12. Counterparty accepts reschedule -> updates scheduled times and reverts to SCHEDULED
  test('12. Counterparty accepts reschedule proposal -> updates scheduled times to proposed times', async () => {
    const newProposedDate = new Date(Date.now() + 7 * 86400000).toISOString();

    // Alice proposes reschedule this time
    await fetch(`${baseUrl}/api/sessions/${session1_Id}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        proposedStart: newProposedDate,
        duration: 45,
        reason: 'Better time for both',
      }),
    });

    // Bob accepts
    const res = await fetch(`${baseUrl}/api/sessions/${session1_Id}/reschedule/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userB_Cookie,
        'x-csrf-token': userB_Csrf,
      },
      body: JSON.stringify({
        action: 'ACCEPT',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.session.status, 'SCHEDULED');
    assert.equal(
      new Date(body.data.session.scheduledStart).getTime(),
      new Date(newProposedDate).getTime()
    );
    assert.equal(body.data.session.duration, 45);
    assert.equal(body.data.session.rescheduledBy, null);
  });

  // 13. Cancellation of a session with mandatory reason
  test('13. Session cancellation records cancelledBy and cancellationReason', async () => {
    // Create a temporary session to cancel
    const cancelTarget = await sessionRepository.create({
      swapRequestId: acceptedSwapId,
      teacherId: userA_Id,
      learnerId: userB_Id,
      skillId: reactSkillId,
      scheduledStart: new Date(Date.now() + 10 * 86400000).toISOString(),
      scheduledEnd: new Date(Date.now() + 10 * 86400000 + 3600000).toISOString(),
      duration: 60,
    });

    const res = await fetch(`${baseUrl}/api/sessions/${cancelTarget.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        reason: 'Personal emergency came up',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.session.status, 'CANCELLED');
    assert.equal(body.data.session.cancelledBy, userA_Id);
    assert.equal(body.data.session.cancellationReason, 'Personal emergency came up');
  });

  // 14. Meeting info and permitted join window
  test('14. Meeting access validates join window and non-participant receives 403 Forbidden', async () => {
    // Charlie receives 403
    const resC = await fetch(`${baseUrl}/api/sessions/${session1_Id}/meeting`, {
      headers: { Cookie: userC_Cookie },
    });
    assert.equal(resC.status, 403);

    // Alice checks meeting info (scheduled 7 days ahead, joinAllowed should be false)
    const resA = await fetch(`${baseUrl}/api/sessions/${session1_Id}/meeting`, {
      headers: { Cookie: userA_Cookie },
    });
    assert.equal(resA.status, 200);
    const bodyA = await resA.json();
    assert.equal(bodyA.data.provider, 'Jitsi');
    assert.equal(bodyA.data.joinAllowed, false);
    assert.ok(bodyA.data.minutesUntilOpen > 0);

    // Attempting to start/join too early fails with 403 Forbidden
    const resEarly = await fetch(`${baseUrl}/api/sessions/${session1_Id}/start`, {
      method: 'POST',
      headers: {
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
    });
    assert.equal(resEarly.status, 403);
    const bodyEarly = await resEarly.json();
    assert.ok(bodyEarly.error.message.includes('15 minutes before'));
  });

  // 15. Joining meeting when within permitted join window
  test('15. Participant can start/join meeting within the permitted join window', async () => {
    // Create an active session scheduled starting 5 minutes in the future (within 15m window)
    const activeStart = new Date(Date.now() + 5 * 60000).toISOString();
    const activeEnd = new Date(Date.now() + 65 * 60000).toISOString();

    const activeSession = await sessionRepository.create({
      swapRequestId: acceptedSwapId,
      teacherId: userA_Id,
      learnerId: userB_Id,
      skillId: reactSkillId,
      scheduledStart: activeStart,
      scheduledEnd: activeEnd,
      duration: 60,
      meetingProvider: 'Jitsi',
      meetingRoomId: 'skillswap-active-window-test',
      meetingUrl: 'https://meet.jit.si/skillswap-active-window-test',
    });

    const res = await fetch(`${baseUrl}/api/sessions/${activeSession.id}/start`, {
      method: 'POST',
      headers: {
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.joinAllowed, true);
    assert.equal(body.data.status, 'IN_PROGRESS');
  });

  // 16. Two-part session completion: Mark complete -> COMPLETION_PENDING
  let activeForCompletion_Id = 0;
  test('16. Participant marks session complete -> enters COMPLETION_PENDING', async () => {
    // Create a session scheduled 2 minutes ago (now in progress)
    const pastStart = new Date(Date.now() - 2 * 60000).toISOString();
    const pastEnd = new Date(Date.now() + 58 * 60000).toISOString();

    const readySession = await sessionRepository.create({
      swapRequestId: acceptedSwapId,
      teacherId: userA_Id,
      learnerId: userB_Id,
      skillId: reactSkillId,
      scheduledStart: pastStart,
      scheduledEnd: pastEnd,
      duration: 60,
      status: 'IN_PROGRESS',
    });
    activeForCompletion_Id = readySession.id;

    // Alice marks as complete
    const res = await fetch(`${baseUrl}/api/sessions/${readySession.id}/complete`, {
      method: 'POST',
      headers: {
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.session.status, 'COMPLETION_PENDING');
    assert.equal(body.data.session.completedBy, userA_Id);
  });

  // 17. Proposer cannot confirm their own completion (403 Forbidden)
  test('17. User who marked session complete cannot confirm their own completion', async () => {
    const res = await fetch(`${baseUrl}/api/sessions/${activeForCompletion_Id}/complete/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie, // Alice tries to confirm her own completion
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        action: 'CONFIRM',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'FORBIDDEN');
  });

  // 18. Peer confirms completion -> COMPLETED & completedSessions incremented
  test('18. Peer confirms completion -> status COMPLETED and completedSessions incremented', async () => {
    const userABefore = await userRepository.findById(userA_Id);
    const userBBefore = await userRepository.findById(userB_Id);
    const countABefore = userABefore?.completedSessions || 0;
    const countBBefore = userBBefore?.completedSessions || 0;

    // Bob confirms completion
    const res = await fetch(`${baseUrl}/api/sessions/${activeForCompletion_Id}/complete/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userB_Cookie,
        'x-csrf-token': userB_Csrf,
      },
      body: JSON.stringify({
        action: 'CONFIRM',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.session.status, 'COMPLETED');
    assert.ok(body.data.session.completionConfirmedAt);

    // Verify user table stats incremented
    const userAAfter = await userRepository.findById(userA_Id);
    const userBAfter = await userRepository.findById(userB_Id);
    assert.equal(userAAfter?.completedSessions, countABefore + 1);
    assert.equal(userBAfter?.completedSessions, countBBefore + 1);
  });

  // 19. Single direction completion leaves SwapRequest in IN_PROGRESS
  test('19. Completed Direction 1 session leaves parent SwapRequest in IN_PROGRESS', async () => {
    const swap = await swapRequestRepository.findById(acceptedSwapId);
    assert.equal(swap?.status, 'IN_PROGRESS');
  });

  // 20. Both reciprocal directions completed transitions parent SwapRequest to COMPLETED
  test('20. Completion of reciprocal Direction 2 session transitions parent SwapRequest to COMPLETED', async () => {
    // Schedule a past Direction 2 session (Bob teaches Alice UI/UX)
    const pastStart = new Date(Date.now() - 10 * 60000).toISOString();
    const pastEnd = new Date(Date.now() + 50 * 60000).toISOString();

    const dir2Session = await sessionRepository.create({
      swapRequestId: acceptedSwapId,
      teacherId: userB_Id,
      learnerId: userA_Id,
      skillId: uiuxSkillId,
      scheduledStart: pastStart,
      scheduledEnd: pastEnd,
      duration: 60,
      status: 'IN_PROGRESS',
    });

    // Bob marks complete
    await fetch(`${baseUrl}/api/sessions/${dir2Session.id}/complete`, {
      method: 'POST',
      headers: {
        Cookie: userB_Cookie,
        'x-csrf-token': userB_Csrf,
      },
    });

    // Alice confirms completion
    const res = await fetch(`${baseUrl}/api/sessions/${dir2Session.id}/complete/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        action: 'CONFIRM',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.session.status, 'COMPLETED');

    // Both directions completed: parent SwapRequest MUST now be COMPLETED
    const swap = await swapRequestRepository.findById(acceptedSwapId);
    assert.equal(swap?.status, 'COMPLETED');
  });
});
