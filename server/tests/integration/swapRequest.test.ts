import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { skillRepository } from '../../src/repositories/skill.repository.js';
import { userSkillRepository } from '../../src/repositories/userSkill.repository.js';
import { conversationRepository } from '../../src/repositories/conversation.repository.js';

describe('Phase 5 — Skill Swap Requests & Connections Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  const port = 5058;
  const timestamp = Date.now();

  let userA_Id = 0; // Alice (teaches React, wants UI/UX)
  let userB_Id = 0; // Bob (teaches UI/UX, wants React)
  let userC_Id = 0; // Charlie (teaches Guitar, wants React)
  let userD_Id = 0; // Incomplete onboarding

  let userA_Cookie = '';
  let userA_Csrf = '';
  let userA_CsrfToken = '';

  let userB_Cookie = '';
  let userB_Csrf = '';
  let userB_CsrfToken = '';

  let userC_Cookie = '';
  let userC_Csrf = '';
  let userC_CsrfToken = '';

  let reactSkillId = 0;
  let uiuxSkillId = 0;
  let guitarSkillId = 0;

  let activeRequestId = 0;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const assignedPort = typeof addr === 'object' && addr ? addr.port : 5058;
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

    // Helper to register and get cookies
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
      let csrfCookie = '';
      let csrfToken = json.data.csrfToken || '';

      for (const c of setCookie.split(',').map((s) => s.trim().split(';')[0])) {
        if (c.startsWith(`${AUTH_COOKIE_NAME}=`)) authCookie = c;
        if (c.startsWith(`${CSRF_COOKIE_NAME}=`)) {
          csrfCookie = c;
          if (!csrfToken) csrfToken = c.split('=')[1];
        }
      }
      return { userId, authCookie, csrfCookie, csrfToken };
    }

    // Register User A (Alice)
    const a = await registerUser('Alice Developer', `alice_swap_${timestamp}`, `alice_swap_${timestamp}@example.com`);
    userA_Id = a.userId;
    userA_Cookie = a.authCookie;
    userA_Csrf = a.csrfCookie;
    userA_CsrfToken = a.csrfToken;

    // Register User B (Bob)
    const b = await registerUser('Bob Designer', `bob_swap_${timestamp}`, `bob_swap_${timestamp}@example.com`);
    userB_Id = b.userId;
    userB_Cookie = b.authCookie;
    userB_Csrf = b.csrfCookie;
    userB_CsrfToken = b.csrfToken;

    // Register User C (Charlie)
    const c = await registerUser('Charlie Musician', `charlie_swap_${timestamp}`, `charlie_swap_${timestamp}@example.com`);
    userC_Id = c.userId;
    userC_Cookie = c.authCookie;
    userC_Csrf = c.csrfCookie;
    userC_CsrfToken = c.csrfToken;

    // Register User D (Incomplete onboarding)
    const d = await registerUser('Dan Incomplete', `dan_swap_${timestamp}`, `dan_swap_${timestamp}@example.com`);
    userD_Id = d.userId;

    // Setup skills:
    // Alice: teaches React, wants UI/UX, Guitar
    await userSkillRepository.addTeachingSkill(userA_Id, reactSkillId, 'Advanced');
    await userSkillRepository.addLearningSkill(userA_Id, uiuxSkillId, 'Beginner');
    await userSkillRepository.addLearningSkill(userA_Id, guitarSkillId, 'Beginner');
    await db.orm.public.User.where({ id: userA_Id }).update({ isOnboarded: true });

    // Bob: teaches UI/UX, wants React
    await userSkillRepository.addTeachingSkill(userB_Id, uiuxSkillId, 'Expert');
    await userSkillRepository.addLearningSkill(userB_Id, reactSkillId, 'Intermediate');
    await db.orm.public.User.where({ id: userB_Id }).update({ isOnboarded: true });

    // Charlie: teaches Guitar, wants React
    await userSkillRepository.addTeachingSkill(userC_Id, guitarSkillId, 'Intermediate');
    await userSkillRepository.addLearningSkill(userC_Id, reactSkillId, 'Beginner');
    await db.orm.public.User.where({ id: userC_Id }).update({ isOnboarded: true });

    // Dan remains isOnboarded = false
  });

  after(async () => {
    // Clean up test data
    const userIds = [userA_Id, userB_Id, userC_Id, userD_Id].filter(Boolean);
    for (const uid of userIds) {
      await db.orm.public.User.where({ id: uid }).delete();
    }
    server.closeAllConnections?.();
    server.close();
  });

  test('1. Self-request prevention: cannot send swap request to oneself', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userA_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: uiuxSkillId,
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error?.message || json.message, /cannot send a skill swap request to yourself/i);
  });

  test('2. Un-onboarded recipient prevention: cannot send request to user who has not onboarded', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userD_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: uiuxSkillId,
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error?.message || json.message, /not completed onboarding/i);
  });

  test('3. Invalid offered skill: fails if sender does not teach the offered skill', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userB_Id,
        senderSkillId: guitarSkillId, // Alice does not teach Guitar
        receiverSkillId: uiuxSkillId,
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error?.message || json.message, /must have the offered skill in your teaching skills/i);
  });

  test('4. Invalid requested skill: fails if recipient does not teach the requested skill', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userB_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: guitarSkillId, // Bob does not teach Guitar
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error?.message || json.message, /recipient does not have the requested skill in their teaching skills/i);
  });

  test('5. Successful request creation: Alice requests Bob (React for UI/UX)', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userB_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: uiuxSkillId,
        message: 'Hi Bob, I would love to learn UI/UX design in exchange for React tutoring!',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.swapRequest.senderId, userA_Id);
    assert.equal(json.data.swapRequest.receiverId, userB_Id);
    assert.equal(json.data.swapRequest.status, 'PENDING');
    assert.ok(json.data.swapRequest.id);

    activeRequestId = json.data.swapRequest.id;
  });

  test('6. Duplicate active request prevention: Alice cannot send second request to Bob', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userB_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: uiuxSkillId,
      }),
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error?.message || json.message, /active swap request or agreement already exists/i);
  });

  test('7. Reverse-direction duplicate prevention: Bob cannot send request to Alice while request is active', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${userB_Cookie}; ${userB_Csrf}`,
        'x-csrf-token': userB_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userA_Id,
        senderSkillId: uiuxSkillId,
        receiverSkillId: reactSkillId,
      }),
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error?.message || json.message, /active swap request or agreement already exists/i);
  });

  test('8. Unauthorized access: unauthenticated requests return 401', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/incoming`);
    assert.equal(res.status, 401);
  });

  test('9. Incoming and Outgoing request retrieval and pending counts', async () => {
    // Bob checks incoming requests
    const incRes = await fetch(`${baseUrl}/api/swap-requests/incoming`, {
      headers: { Cookie: `${userB_Cookie}; ${userB_Csrf}` },
    });
    assert.equal(incRes.status, 200);
    const incJson = await incRes.json();
    assert.equal(incJson.success, true);
    assert.ok(incJson.data.requests.length >= 1);
    const bobIncoming = incJson.data.requests.find((r: any) => r.id === activeRequestId);
    assert.ok(bobIncoming);
    assert.equal(bobIncoming.sender.name, 'Alice Developer');
    assert.equal(bobIncoming.senderSkill.name, 'React');
    assert.equal(bobIncoming.receiverSkill.name, 'UI/UX Design');

    // Bob checks pending count
    const countRes = await fetch(`${baseUrl}/api/swap-requests/pending-count`, {
      headers: { Cookie: `${userB_Cookie}; ${userB_Csrf}` },
    });
    assert.equal(countRes.status, 200);
    const countJson = await countRes.json();
    assert.ok(countJson.data.pendingCount >= 1);

    // Alice checks outgoing requests
    const outRes = await fetch(`${baseUrl}/api/swap-requests/outgoing`, {
      headers: { Cookie: `${userA_Cookie}; ${userA_Csrf}` },
    });
    assert.equal(outRes.status, 200);
    const outJson = await outRes.json();
    assert.equal(outJson.success, true);
    const aliceOutgoing = outJson.data.requests.find((r: any) => r.id === activeRequestId);
    assert.ok(aliceOutgoing);
    assert.equal(aliceOutgoing.receiver.name, 'Bob Designer');

    // Alice checks active with Bob
    const withUserRes = await fetch(`${baseUrl}/api/swap-requests/with-user/${userB_Id}`, {
      headers: { Cookie: `${userA_Cookie}; ${userA_Csrf}` },
    });
    assert.equal(withUserRes.status, 200);
    const withUserJson = await withUserRes.json();
    assert.equal(withUserJson.data.activeRequest?.id, activeRequestId);
  });

  test('10. Unauthorized acceptance: sender (Alice) cannot accept her own request', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/${activeRequestId}/accept`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.match(json.error?.message || json.message, /only the recipient can accept/i);
  });

  test('11. Third party acceptance prevention: Charlie cannot accept request sent to Bob', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/${activeRequestId}/accept`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userC_Cookie}; ${userC_Csrf}`,
        'x-csrf-token': userC_CsrfToken,
      },
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.match(json.error?.message || json.message, /only the recipient can accept/i);
  });

  test('12. Successful acceptance: Bob accepts Alice request (status ACCEPTED & conversation created)', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/${activeRequestId}/accept`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userB_Cookie}; ${userB_Csrf}`,
        'x-csrf-token': userB_CsrfToken,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.swapRequest.status, 'ACCEPTED');
    assert.ok(json.data.conversationId);

    // Verify in database: exactly one conversation exists for this swap request
    const conversation = await conversationRepository.findBySwapRequestId(activeRequestId);
    assert.ok(conversation);
    assert.equal(conversation.id, json.data.conversationId);

    // Verify participants: both Alice and Bob are participants
    const participants = await conversationRepository.getParticipants(conversation.id);
    assert.equal(participants.length, 2);
    const participantUserIds = participants.map((p) => p.userId);
    assert.ok(participantUserIds.includes(userA_Id));
    assert.ok(participantUserIds.includes(userB_Id));
  });

  test('13. Idempotent acceptance / transition enforcement: accepting already accepted request returns 409', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/${activeRequestId}/accept`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userB_Cookie}; ${userB_Csrf}`,
        'x-csrf-token': userB_CsrfToken,
      },
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.match(json.error?.message || json.message, /already been accepted/i);
  });

  test('14. Cannot cancel an already accepted swap request', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/${activeRequestId}/cancel`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.match(json.error?.message || json.message, /cannot cancel an already accepted/i);
  });

  test('15. Cannot reject an already accepted swap request', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/${activeRequestId}/reject`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userB_Cookie}; ${userB_Csrf}`,
        'x-csrf-token': userB_CsrfToken,
      },
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.match(json.error?.message || json.message, /cannot reject an already accepted/i);
  });

  test('16. Request cancellation: Alice sends request to Charlie, then cancels it', async () => {
    // Alice sends to Charlie (React for Guitar)
    const createRes = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userC_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: guitarSkillId,
        message: 'Let us swap React for Guitar lessons!',
      }),
    });
    assert.equal(createRes.status, 201);
    const createJson = await createRes.json();
    const reqId = createJson.data.swapRequest.id;

    // Charlie cannot cancel it (sender only)
    const badCancel = await fetch(`${baseUrl}/api/swap-requests/${reqId}/cancel`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userC_Cookie}; ${userC_Csrf}`,
        'x-csrf-token': userC_CsrfToken,
      },
    });
    assert.equal(badCancel.status, 403);

    // Alice cancels it
    const cancelRes = await fetch(`${baseUrl}/api/swap-requests/${reqId}/cancel`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
    });
    assert.equal(cancelRes.status, 200);
    const cancelJson = await cancelRes.json();
    assert.equal(cancelJson.data.swapRequest.status, 'CANCELLED');

    // Cannot accept a cancelled request
    const badAccept = await fetch(`${baseUrl}/api/swap-requests/${reqId}/accept`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userC_Cookie}; ${userC_Csrf}`,
        'x-csrf-token': userC_CsrfToken,
      },
    });
    assert.equal(badAccept.status, 400);
    const badAcceptJson = await badAccept.json();
    assert.match(badAcceptJson.error?.message || badAcceptJson.message, /cannot accept a cancelled/i);
  });

  test('17. Request rejection: Alice sends another request to Charlie, who rejects it', async () => {
    // Since previous was cancelled, Alice can send a new request
    const createRes = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userC_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: guitarSkillId,
      }),
    });
    assert.equal(createRes.status, 201);
    const reqId = (await createRes.json()).data.swapRequest.id;

    // Alice cannot reject it (recipient only)
    const badReject = await fetch(`${baseUrl}/api/swap-requests/${reqId}/reject`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
    });
    assert.equal(badReject.status, 403);

    // Charlie rejects it
    const rejectRes = await fetch(`${baseUrl}/api/swap-requests/${reqId}/reject`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userC_Cookie}; ${userC_Csrf}`,
        'x-csrf-token': userC_CsrfToken,
      },
    });
    assert.equal(rejectRes.status, 200);
    const rejectJson = await rejectRes.json();
    assert.equal(rejectJson.data.swapRequest.status, 'REJECTED');

    // Cannot accept a rejected request
    const badAccept = await fetch(`${baseUrl}/api/swap-requests/${reqId}/accept`, {
      method: 'PATCH',
      headers: {
        Cookie: `${userC_Cookie}; ${userC_Csrf}`,
        'x-csrf-token': userC_CsrfToken,
      },
    });
    assert.equal(badAccept.status, 400);
    const badAcceptJson = await badAccept.json();
    assert.match(badAcceptJson.error?.message || badAcceptJson.message, /cannot accept a rejected/i);
  });
});
