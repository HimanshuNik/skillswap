import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../../src/app.js';
import { initSocketServer } from '../../src/socket/index.js';
import { db } from '../../src/prisma/db.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { skillRepository } from '../../src/repositories/skill.repository.js';
import { userSkillRepository } from '../../src/repositories/userSkill.repository.js';
import { swapRequestRepository } from '../../src/repositories/swapRequest.repository.js';
import { sessionRepository } from '../../src/repositories/session.repository.js';
import { reviewRepository } from '../../src/repositories/review.repository.js';
import { notificationRepository } from '../../src/repositories/notification.repository.js';
import { calculateMatchScore } from '../../src/services/matching.service.js';

describe('Phase 8 — Reviews, Ratings & Real-Time Notifications Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  const timestamp = Date.now();

  let userA_Id = 0; // Alice (Learner in Session 1, Teacher in Session 4)
  let userB_Id = 0; // Bob (Teacher in Session 1, 2, 3)
  let userC_Id = 0; // Charlie (Learner in Session 3)
  let userD_Id = 0; // Dave (Fresh user with 0 reviews / third party)

  let userA_Cookie = '';
  let userA_Csrf = '';

  let userB_Cookie = '';
  let userB_Csrf = '';

  let userC_Cookie = '';
  let userC_Csrf = '';

  let userD_Cookie = '';
  let userD_Csrf = '';

  let reactSkillId = 0;
  let uiuxSkillId = 0;

  let swapAB_Id = 0;
  let swapBC_Id = 0;

  let completedSession1_Id = 0; // Bob teaches Alice UI/UX (COMPLETED)
  let scheduledSession2_Id = 0; // Bob teaches Alice UI/UX (SCHEDULED)
  let completedSession3_Id = 0; // Bob teaches Charlie UI/UX (COMPLETED)

  let socketA1: ClientSocket | null = null;
  let socketA2: ClientSocket | null = null; // Second tab for Alice
  let socketB: ClientSocket | null = null;

  const createdSwapIds: number[] = [];

  function waitForEvent<T = any>(
    emitter: any,
    event: string,
    filter?: (data: T) => boolean,
    timeoutMs = 5000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        emitter.off(event, handler);
        reject(new Error(`Timeout waiting for event "${event}" after ${timeoutMs}ms`));
      }, timeoutMs);

      const handler = (data: T) => {
        if (!filter || filter(data)) {
          clearTimeout(timer);
          emitter.off(event, handler);
          resolve(data);
        }
      };

      emitter.on(event, handler);
    });
  }

  function connectUserSocket(cookieStr: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const client = Client(baseUrl, {
        extraHeaders: {
          cookie: cookieStr,
        },
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: false,
      });

      const timer = setTimeout(() => {
        client.disconnect();
        reject(new Error('Socket connection timed out'));
      }, 5000);

      client.on('connect', () => {
        clearTimeout(timer);
        resolve(client);
      });

      client.on('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 5077;
        baseUrl = `http://localhost:${port}`;
        initSocketServer(server);
        resolve();
      });
    });

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
      assert.equal(res.status, 201, `Failed to register ${username}`);
      const json = await res.json();
      const rawCookies =
        typeof res.headers.getSetCookie === 'function'
          ? res.headers.getSetCookie()
          : (res.headers.get('set-cookie') || '').split(',');
      let cookie = '';
      let csrfToken = json.data?.csrfToken || '';

      for (const raw of rawCookies) {
        const c = raw.trim().split(';')[0];
        if (c.startsWith(`${AUTH_COOKIE_NAME}=`)) cookie = c;
        if (c.startsWith(`${CSRF_COOKIE_NAME}=`)) {
          if (!cookie) cookie = c;
          else cookie += `; ${c}`;
          if (!csrfToken) csrfToken = c.split('=')[1];
        }
      }

      return {
        userId: json.data.user.id,
        cookie,
        csrfToken,
      };
    }

    const regA = await registerUser(
      `Alice Eight ${timestamp}`,
      `alice_e8_${timestamp}`,
      `alice_e8_${timestamp}@test.com`
    );
    userA_Id = regA.userId;
    userA_Cookie = regA.cookie;
    userA_Csrf = regA.csrfToken;

    const regB = await registerUser(
      `Bob Eight ${timestamp}`,
      `bob_e8_${timestamp}`,
      `bob_e8_${timestamp}@test.com`
    );
    userB_Id = regB.userId;
    userB_Cookie = regB.cookie;
    userB_Csrf = regB.csrfToken;

    const regC = await registerUser(
      `Charlie Eight ${timestamp}`,
      `charlie_e8_${timestamp}`,
      `charlie_e8_${timestamp}@test.com`
    );
    userC_Id = regC.userId;
    userC_Cookie = regC.cookie;
    userC_Csrf = regC.csrfToken;

    const regD = await registerUser(
      `Dave Eight ${timestamp}`,
      `dave_e8_${timestamp}`,
      `dave_e8_${timestamp}@test.com`
    );
    userD_Id = regD.userId;
    userD_Cookie = regD.cookie;
    userD_Csrf = regD.csrfToken;

    // Seed Skills
    const react = await skillRepository.findOrCreate('React Dev', 'Development');
    const uiux = await skillRepository.findOrCreate('UI/UX Design', 'Design');
    reactSkillId = react.id;
    uiuxSkillId = uiux.id;

    // Onboard Users
    await userSkillRepository.addTeachingSkill(userA_Id, reactSkillId, 'Advanced');
    await userSkillRepository.addLearningSkill(userA_Id, uiuxSkillId, 'Beginner');
    await userRepository.setOnboarded(userA_Id, true);

    await userSkillRepository.addTeachingSkill(userB_Id, uiuxSkillId, 'Expert');
    await userSkillRepository.addLearningSkill(userB_Id, reactSkillId, 'Intermediate');
    await userRepository.setOnboarded(userB_Id, true);

    await userSkillRepository.addTeachingSkill(userC_Id, reactSkillId, 'Intermediate');
    await userSkillRepository.addLearningSkill(userC_Id, uiuxSkillId, 'Beginner');
    await userRepository.setOnboarded(userC_Id, true);

    await userSkillRepository.addTeachingSkill(userD_Id, uiuxSkillId, 'Intermediate');
    await userSkillRepository.addLearningSkill(userD_Id, reactSkillId, 'Beginner');
    await userRepository.setOnboarded(userD_Id, true);

    // Create swap request between Alice and Bob (Accepted)
    const swapAB = await swapRequestRepository.create({
      senderId: userA_Id,
      receiverId: userB_Id,
      senderSkillId: reactSkillId,
      receiverSkillId: uiuxSkillId,
      message: 'Let us swap React and UI/UX!',
    });
    await swapRequestRepository.updateStatus(swapAB.id, 'ACCEPTED');
    swapAB_Id = swapAB.id;
    createdSwapIds.push(swapAB.id);

    // Create swap request between Charlie and Bob (Accepted)
    const swapBC = await swapRequestRepository.create({
      senderId: userC_Id,
      receiverId: userB_Id,
      senderSkillId: reactSkillId,
      receiverSkillId: uiuxSkillId,
      message: 'Charlie wants to swap with Bob',
    });
    await swapRequestRepository.updateStatus(swapBC.id, 'ACCEPTED');
    swapBC_Id = swapBC.id;
    createdSwapIds.push(swapBC.id);

    // Create Session 1: Bob teaches Alice UI/UX (COMPLETED)
    const now = Date.now();
    const sess1 = await sessionRepository.create({
      swapRequestId: swapAB_Id,
      teacherId: userB_Id,
      learnerId: userA_Id,
      skillId: uiuxSkillId,
      scheduledStart: new Date(now - 3600000).toISOString(),
      scheduledEnd: new Date(now - 1800000).toISOString(),
      duration: 60,
      status: 'COMPLETED',
      meetingUrl: 'https://meet.skillswap.internal/p8-sess-1',
    });
    completedSession1_Id = sess1.id;

    // Create Session 2: Bob teaches Alice UI/UX (SCHEDULED - not completed)
    const sess2 = await sessionRepository.create({
      swapRequestId: swapAB_Id,
      teacherId: userB_Id,
      learnerId: userA_Id,
      skillId: uiuxSkillId,
      scheduledStart: new Date(now + 86400000).toISOString(),
      scheduledEnd: new Date(now + 90000000).toISOString(),
      duration: 60,
      status: 'SCHEDULED',
      meetingUrl: 'https://meet.skillswap.internal/p8-sess-2',
    });
    scheduledSession2_Id = sess2.id;

    // Create Session 3: Bob teaches Charlie UI/UX (COMPLETED)
    const sess3 = await sessionRepository.create({
      swapRequestId: swapBC_Id,
      teacherId: userB_Id,
      learnerId: userC_Id,
      skillId: uiuxSkillId,
      scheduledStart: new Date(now - 7200000).toISOString(),
      scheduledEnd: new Date(now - 5400000).toISOString(),
      duration: 45,
      status: 'COMPLETED',
      meetingUrl: 'https://meet.skillswap.internal/p8-sess-3',
    });
    completedSession3_Id = sess3.id;

    // Connect socket clients
    socketA1 = await connectUserSocket(userA_Cookie);
    socketA2 = await connectUserSocket(userA_Cookie);
    socketB = await connectUserSocket(userB_Cookie);
  });

  after(async () => {
    socketA1?.disconnect();
    socketA2?.disconnect();
    socketB?.disconnect();

    const userIds = [userA_Id, userB_Id, userC_Id, userD_Id].filter(Boolean);

    try {
      // Clean notifications
      await db.notification.deleteMany({
        where: { userId: { in: userIds } },
      });

      // Clean reviews
      await db.review.deleteMany({
        where: {
          OR: [{ reviewerId: { in: userIds } }, { revieweeId: { in: userIds } }],
        },
      });

      // Clean sessions
      if (createdSwapIds.length > 0) {
        await db.session.deleteMany({
          where: { swapRequestId: { in: createdSwapIds } },
        });
        await db.swapRequest.deleteMany({
          where: { id: { in: createdSwapIds } },
        });
      }

      for (const uid of userIds) {
        await userSkillRepository.clearTeachingSkills(uid);
        await userSkillRepository.clearLearningSkills(uid);
        await db.userAvailability.deleteMany({ where: { userId: uid } });
        await db.user.deleteMany({ where: { id: uid } });
      }
    } catch {
      // Ignore teardown errors
    }

    if (server) {
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // Scenario 1: Review submission for completed session (201)
  test('Scenario 1: Review submission for completed session returns 201', async () => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        sessionId: completedSession1_Id,
        rating: 5,
        comment: 'Bob is a fantastic UI/UX teacher! Clear explanations and great pacing.',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.review.rating, 5);
    assert.equal(json.data.review.reviewerId, userA_Id);
    assert.equal(json.data.review.revieweeId, userB_Id);
    assert.equal(json.data.review.sessionId, completedSession1_Id);
  });

  // Scenario 2: Rejection of review for non-completed session (400)
  test('Scenario 2: Rejection of review for non-completed session returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        sessionId: scheduledSession2_Id,
        rating: 4,
        comment: 'Premature review should fail',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.match(json.error?.message || json.message, /completed/i);
  });

  // Scenario 3: Unauthorized review submission (non-learner receiving 403)
  test('Scenario 3: Non-learner or third-party review submission returns 403', async () => {
    // 3a: Third party Dave attempts to review Session 1
    const resDave = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userD_Cookie,
        'x-csrf-token': userD_Csrf,
      },
      body: JSON.stringify({
        sessionId: completedSession1_Id,
        rating: 5,
        comment: 'Dave was not part of this session',
      }),
    });
    assert.equal(resDave.status, 403);

    // 3b: Teacher Bob attempts to review learner Alice on Session 1
    const resTeacher = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userB_Cookie,
        'x-csrf-token': userB_Csrf,
      },
      body: JSON.stringify({
        sessionId: completedSession1_Id,
        rating: 5,
        comment: 'Teacher cannot review learner on completed session',
      }),
    });
    assert.equal(resTeacher.status, 403);
  });

  // Scenario 4: Duplicate review prevention (409 Conflict)
  test('Scenario 4: Duplicate review submission for same session returns 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        sessionId: completedSession1_Id,
        rating: 4,
        comment: 'Second review attempt should be rejected',
      }),
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.match(json.error?.message || json.message, /already (reviewed|submitted a review)/i);
  });

  // Scenario 5: Rating validation (must be 1–5 stars; 0 or 6 rejected with 400)
  test('Scenario 5: Rating validation rejects 0, 6, and non-integer ratings with 400', async () => {
    // Rating = 0
    const resZero = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userC_Cookie,
        'x-csrf-token': userC_Csrf,
      },
      body: JSON.stringify({
        sessionId: completedSession3_Id,
        rating: 0,
      }),
    });
    assert.equal(resZero.status, 400);

    // Rating = 6
    const resSix = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userC_Cookie,
        'x-csrf-token': userC_Csrf,
      },
      body: JSON.stringify({
        sessionId: completedSession3_Id,
        rating: 6,
      }),
    });
    assert.equal(resSix.status, 400);

    // Rating = 3.5 non-integer
    const resFloat = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userC_Cookie,
        'x-csrf-token': userC_Csrf,
      },
      body: JSON.stringify({
        sessionId: completedSession3_Id,
        rating: 3.5,
      }),
    });
    assert.equal(resFloat.status, 400);
  });

  // Scenario 6: Server-enforced reviewee identification (ignoring spoofed revieweeId)
  test('Scenario 6: Server enforces revieweeId strictly from session.teacherId, ignoring spoofed values', async () => {
    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userC_Cookie,
        'x-csrf-token': userC_Csrf,
      },
      body: JSON.stringify({
        sessionId: completedSession3_Id,
        rating: 3,
        revieweeId: 99999, // Attempted spoof
        comment: 'Good session, verified server-side teacher binding.',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.review.revieweeId, userB_Id, 'Reviewee must strictly be Bob');
    assert.notEqual(json.data.review.revieweeId, 99999);
  });

  // Scenario 7: Average rating and total review recalculation in User table
  test('Scenario 7: Average rating and total review count are updated in User table', async () => {
    // Bob received 5 stars from Alice, 3 stars from Charlie -> average = (5+3)/2 = 4.0, total = 2
    const userInDb = await userRepository.findById(userB_Id);
    assert.ok(userInDb);
    assert.equal(userInDb.totalReviews, 2);
    assert.equal(Math.round(userInDb.averageRating * 10) / 10, 4.0);

    // Also check through GET /api/users/:userId/reputation
    const resRep = await fetch(`${baseUrl}/api/users/${userB_Id}/reputation`);
    assert.equal(resRep.status, 200);
    const jsonRep = await resRep.json();
    assert.equal(jsonRep.data.reputation.averageRating, 4.0);
    assert.equal(jsonRep.data.reputation.totalReviews, 2);
    assert.equal(jsonRep.data.reputation.hasReviews, true);
    assert.equal(jsonRep.data.reputation.completedTeachingSessions, 2);
  });

  // Scenario 8: Zero-review reputation behavior ("New Member", no fake 5.0)
  test('Scenario 8: Zero-review reputation correctly displays New Member without fake rating', async () => {
    const res = await fetch(`${baseUrl}/api/users/${userD_Id}/reputation`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.reputation.averageRating, 0);
    assert.equal(json.data.reputation.totalReviews, 0);
    assert.equal(json.data.reputation.hasReviews, false);
    assert.equal(json.data.reputation.ratingLabel, 'New Member');
  });

  // Scenario 9: Review retrieval with pagination and sorting
  test('Scenario 9: Review retrieval supports pagination and sorting (highest, lowest, newest)', async () => {
    // Sort highest: review with 5 stars first
    const resHighest = await fetch(`${baseUrl}/api/reviews/user/${userB_Id}?sort=highest`);
    assert.equal(resHighest.status, 200);
    const jsonHighest = await resHighest.json();
    assert.equal(jsonHighest.data.reviews.length, 2);
    assert.equal(jsonHighest.data.reviews[0].rating, 5);
    assert.equal(jsonHighest.data.reviews[1].rating, 3);

    // Sort lowest: review with 3 stars first
    const resLowest = await fetch(`${baseUrl}/api/reviews/user/${userB_Id}?sort=lowest`);
    assert.equal(resLowest.status, 200);
    const jsonLowest = await resLowest.json();
    assert.equal(jsonLowest.data.reviews[0].rating, 3);
    assert.equal(jsonLowest.data.reviews[1].rating, 5);

    // Pagination: limit=1, page=1
    const resPage1 = await fetch(`${baseUrl}/api/reviews/user/${userB_Id}?page=1&limit=1`);
    assert.equal(resPage1.status, 200);
    const jsonPage1 = await resPage1.json();
    assert.equal(jsonPage1.data.reviews.length, 1);
    assert.equal(jsonPage1.data.total, 2);
    assert.equal(jsonPage1.data.totalPages, 2);
  });

  // Scenario 10: Notification creation across swap request events
  test('Scenario 10: Notification creation across swap request events (request, reject, cancel)', async () => {
    // Dave sends swap request to Alice -> Alice receives SWAP_REQUEST notification
    const swapPromise = waitForEvent(socketA1, 'notification:new', (n) => n.type === 'SWAP_REQUEST');

    const resReq = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userD_Cookie,
        'x-csrf-token': userD_Csrf,
      },
      body: JSON.stringify({
        receiverId: userA_Id,
        senderSkillId: uiuxSkillId,
        receiverSkillId: reactSkillId,
        message: 'Dave proposing swap with Alice',
      }),
    });
    assert.equal(resReq.status, 201);
    const newSwapJson = await resReq.json();
    const testSwapId = newSwapJson.data.swapRequest.id;
    createdSwapIds.push(testSwapId);

    const swapEvent = await swapPromise;
    assert.equal(swapEvent.type, 'SWAP_REQUEST');
    assert.equal(swapEvent.userId, userA_Id);

    // Alice rejects swap request -> Dave receives SWAP_REJECTED notification
    const resReject = await fetch(`${baseUrl}/api/swap-requests/${testSwapId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({ rejectionReason: 'Not available currently' }),
    });
    assert.equal(resReject.status, 200);

    const daveNotifs = await notificationRepository.findByUser(userD_Id, { limit: 5 });
    const rejectNotif = daveNotifs.notifications.find((n) => n.type === 'SWAP_REJECTED');
    assert.ok(rejectNotif, 'Dave should have received SWAP_REJECTED notification');

    // Charlie sends swap request to Dave then cancels it -> Dave receives SWAP_CANCELLED
    const resReq2 = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userC_Cookie,
        'x-csrf-token': userC_Csrf,
      },
      body: JSON.stringify({
        receiverId: userD_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: uiuxSkillId,
        message: 'Charlie proposing swap to Dave',
      }),
    });
    assert.equal(resReq2.status, 201);
    const swap2Json = await resReq2.json();
    const testSwap2Id = swap2Json.data.swapRequest.id;
    createdSwapIds.push(testSwap2Id);

    const resCancel = await fetch(`${baseUrl}/api/swap-requests/${testSwap2Id}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userC_Cookie,
        'x-csrf-token': userC_Csrf,
      },
    });
    assert.equal(resCancel.status, 200);

    const daveNotifsAfterCancel = await notificationRepository.findByUser(userD_Id, { limit: 5 });
    const cancelNotif = daveNotifsAfterCancel.notifications.find((n) => n.type === 'SWAP_CANCELLED');
    assert.ok(cancelNotif, 'Dave should have received SWAP_CANCELLED notification');
  });

  // Scenario 11: Notification creation across session scheduling and completion events
  test('Scenario 11: Notification creation across session scheduling and completion', async () => {
    // Alice schedules a session with Bob -> Bob receives SESSION_SCHEDULED notification
    const resSched = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({
        swapRequestId: swapAB_Id,
        teacherId: userA_Id,
        learnerId: userB_Id,
        skillId: reactSkillId,
        scheduledStart: new Date(Date.now() + 172800000).toISOString(),
        duration: 45,
      }),
    });
    assert.equal(resSched.status, 201);
    const schedJson = await resSched.json();
    const newSessId = schedJson.data.session.id;

    const bobNotifs = await notificationRepository.findByUser(userB_Id, { limit: 10 });
    const schedNotif = bobNotifs.notifications.find((n) => n.type === 'SESSION_SCHEDULED');
    assert.ok(schedNotif, 'Bob should receive SESSION_SCHEDULED notification');

    // Bob proposes reschedule -> Alice receives SESSION_RESCHEDULE_PROPOSED
    const resProp = await fetch(`${baseUrl}/api/sessions/${newSessId}/reschedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userB_Cookie,
        'x-csrf-token': userB_Csrf,
      },
      body: JSON.stringify({
        proposedStart: new Date(Date.now() + 259200000).toISOString(),
        duration: 45,
        reason: 'Need to shift by one day',
      }),
    });
    assert.equal(resProp.status, 200);

    const aliceNotifs = await notificationRepository.findByUser(userA_Id, { limit: 10 });
    const reschedPropNotif = aliceNotifs.notifications.find(
      (n) => n.type === 'SESSION_RESCHEDULE_PROPOSED'
    );
    assert.ok(reschedPropNotif, 'Alice should receive SESSION_RESCHEDULE_PROPOSED notification');

    // Alice accepts reschedule -> Bob receives SESSION_RESCHEDULE_ACCEPTED
    const resAcceptResched = await fetch(`${baseUrl}/api/sessions/${newSessId}/reschedule/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
      body: JSON.stringify({ action: 'ACCEPT' }),
    });
    assert.equal(resAcceptResched.status, 200);

    const bobNotifs2 = await notificationRepository.findByUser(userB_Id, { limit: 10 });
    const acceptNotif = bobNotifs2.notifications.find(
      (n) => n.type === 'SESSION_RESCHEDULE_ACCEPTED'
    );
    assert.ok(acceptNotif, 'Bob should receive SESSION_RESCHEDULE_ACCEPTED notification');
  });

  // Scenario 12: Notification creation on new review receipt
  test('Scenario 12: Teacher receives REVIEW_RECEIVED notification when learner submits review', async () => {
    // Check Bob's notifications for REVIEW_RECEIVED created during Scenario 1 or 6
    const bobNotifs = await notificationRepository.findByUser(userB_Id, { limit: 20 });
    const reviewNotifs = bobNotifs.notifications.filter((n) => n.type === 'REVIEW_RECEIVED');
    assert.ok(reviewNotifs.length >= 1, 'Bob should have at least 1 REVIEW_RECEIVED notification');
    assert.match(reviewNotifs[0].message, /rating|review/i);
    assert.equal(reviewNotifs[0].relatedEntityType, 'REVIEW');
  });

  // Scenario 13: Notification ownership isolation (User B cannot read User A's notifications -> 403)
  test('Scenario 13: Notification ownership isolation returns 403 on foreign notification access', async () => {
    const aliceNotifs = await notificationRepository.findByUser(userA_Id, { limit: 5 });
    assert.ok(aliceNotifs.notifications.length > 0);
    const aliceNotifId = aliceNotifs.notifications[0].id;

    // Bob tries to mark Alice's notification as read
    const res = await fetch(`${baseUrl}/api/notifications/${aliceNotifId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userB_Cookie,
        'x-csrf-token': userB_Csrf,
      },
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.match(json.error?.message || json.message, /forbidden|access|authorized/i);
  });

  // Scenario 14: Marking single notification as read (idempotent, records readAt)
  test('Scenario 14: Marking notification as read is idempotent and sets readAt', async () => {
    const aliceNotifs = await notificationRepository.findByUser(userA_Id, { unreadOnly: true, limit: 5 });
    assert.ok(aliceNotifs.notifications.length > 0);
    const notifId = aliceNotifs.notifications[0].id;

    // First mark
    const res1 = await fetch(`${baseUrl}/api/notifications/${notifId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
    });
    assert.equal(res1.status, 200);
    const json1 = await res1.json();
    assert.equal(json1.data.notification.isRead, true);
    assert.ok(json1.data.notification.readAt, 'readAt timestamp must be recorded');

    // Second mark (idempotent)
    const res2 = await fetch(`${baseUrl}/api/notifications/${notifId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
    });
    assert.equal(res2.status, 200);
    const json2 = await res2.json();
    assert.equal(json2.data.notification.isRead, true);
  });

  // Scenario 15: Marking all notifications as read (PATCH /api/notifications/read-all)
  test('Scenario 15: Marking all notifications as read updates all unread to read', async () => {
    const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
    });
    assert.equal(res.status, 200);

    const countRes = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Cookie: userA_Cookie },
    });
    assert.equal(countRes.status, 200);
    const countJson = await countRes.json();
    assert.equal(countJson.data.unreadCount, 0);
  });

  // Scenario 16: Accurate unread count tracking (GET /api/notifications/unread-count)
  test('Scenario 16: Accurate unread count reflects unread notifications', async () => {
    // Generate an unread notification for Dave
    await notificationRepository.create({
      userId: userD_Id,
      type: 'SESSION_REMINDER',
      title: 'Upcoming Session Reminder',
      message: 'You have a session in 1 hour.',
      link: '/sessions',
    });

    const res = await fetch(`${baseUrl}/api/notifications/unread-count`, {
      headers: { Cookie: userD_Cookie },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.unreadCount >= 1);
  });

  // Scenario 17: Real-time Socket.IO notification delivery to user:${userId} room
  test('Scenario 17: Real-time notification delivered over Socket.IO to user room', async () => {
    const notifPromise = waitForEvent(socketB, 'notification:new', (n) => n.userId === userB_Id);

    // Trigger notification creation for Bob
    await notificationRepository.create({
      userId: userB_Id,
      type: 'TEST_EVENT',
      title: 'Real-time Test',
      message: 'Testing socket delivery to user room',
      link: '/dashboard',
    });

    // In service layer, createNotification sends to socket
    const { notificationService } = await import('../../src/services/notification.service.js');
    const directNotif = await notificationService.createNotification({
      userId: userB_Id,
      type: 'REALTIME_TEST',
      title: 'Live Realtime Ping',
      message: 'Checking socket receipt',
      link: '/dashboard',
    });

    const received = await notifPromise;
    assert.equal(received.userId, userB_Id);
    assert.equal(received.id, directNotif.id);
  });

  // Scenario 18: Multi-tab notification synchronization
  test('Scenario 18: Multi-tab notification synchronization emits notification:read on both tabs', async () => {
    // Create notification for Alice
    const { notificationService } = await import('../../src/services/notification.service.js');
    const notif = await notificationService.createNotification({
      userId: userA_Id,
      type: 'MULTI_TAB_TEST',
      title: 'Tab Sync Test',
      message: 'Testing multi-tab read synchronization',
    });

    const readPromiseTab2 = waitForEvent(
      socketA2,
      'notification:read',
      (payload) => payload.id === notif.id || payload.notificationId === notif.id
    );

    // Alice marks notification read via REST API
    const res = await fetch(`${baseUrl}/api/notifications/${notif.id}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_Csrf,
      },
    });
    assert.equal(res.status, 200);

    const tab2Received = await readPromiseTab2;
    assert.equal(tab2Received.id, notif.id);
  });

  // Scenario 19: Session reminder notification structure
  test('Scenario 19: Session reminder notification structure includes entity links', async () => {
    const { notificationService } = await import('../../src/services/notification.service.js');
    const reminder = await notificationService.createNotification({
      userId: userA_Id,
      type: 'SESSION_REMINDER',
      title: 'Session Starts in 15 Minutes',
      message: 'Your UI/UX session with Bob starts soon. Click to join video room.',
      link: `/sessions`,
      relatedEntityType: 'SESSION',
      relatedEntityId: scheduledSession2_Id,
    });

    assert.equal(reminder.relatedEntityType, 'SESSION');
    assert.equal(reminder.relatedEntityId, scheduledSession2_Id);
    assert.equal(reminder.type, 'SESSION_REMINDER');
    assert.equal(reminder.isRead, false);
  });

  // Scenario 20: Reputation integration with matching algorithm
  test('Scenario 20: Reputation score directly integrates with candidate matching formula', () => {
    const currentUserContext = {
      id: userA_Id,
      name: 'Alice',
      username: 'alice',
      location: null,
      bio: null,
      avatarUrl: null,
      timezone: null,
      averageRating: 5.0,
      totalReviews: 1,
      completedSessions: 1,
      teachingSkills: [{ id: reactSkillId, name: 'React Dev', category: 'Development' }],
      learningSkills: [{ id: uiuxSkillId, name: 'UI/UX Design', category: 'Design' }],
      availability: [{ day: 'Monday', slots: ['Evening'] }],
    };

    // Candidate Bob: has 4.0 average rating from 2 reviews -> reputation = (4.0/5.0)*100 = 80
    const candidateBobContext = {
      id: userB_Id,
      name: 'Bob',
      username: 'bob',
      location: null,
      bio: null,
      avatarUrl: null,
      timezone: null,
      averageRating: 4.0,
      totalReviews: 2,
      completedSessions: 2,
      teachingSkills: [{ id: uiuxSkillId, name: 'UI/UX Design', category: 'Design' }],
      learningSkills: [{ id: reactSkillId, name: 'React Dev', category: 'Development' }],
      availability: [{ day: 'Monday', slots: ['Evening'] }],
    };

    // Candidate Fresh Dave: has 0 reviews -> neutral baseline reputation = 70
    const candidateDaveContext = {
      id: userD_Id,
      name: 'Dave',
      username: 'dave',
      location: null,
      bio: null,
      avatarUrl: null,
      timezone: null,
      averageRating: 0,
      totalReviews: 0,
      completedSessions: 0,
      teachingSkills: [{ id: uiuxSkillId, name: 'UI/UX Design', category: 'Design' }],
      learningSkills: [{ id: reactSkillId, name: 'React Dev', category: 'Development' }],
      availability: [{ day: 'Monday', slots: ['Evening'] }],
    };

    const scoreBob = calculateMatchScore(currentUserContext, candidateBobContext);
    const scoreDave = calculateMatchScore(currentUserContext, candidateDaveContext);

    assert.ok(scoreBob);
    assert.ok(scoreDave);
    assert.equal(scoreBob.reputationScore, 80);
    assert.equal(scoreDave.reputationScore, 70);
    assert.ok(
      scoreBob.compatibilityScore >= scoreDave.compatibilityScore,
      'Higher reputation candidate should receive higher or equal score compared to neutral baseline'
    );
  });
});
