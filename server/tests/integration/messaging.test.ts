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
import { userAvailabilityRepository } from '../../src/repositories/userAvailability.repository.js';
import { conversationRepository } from '../../src/repositories/conversation.repository.js';
import { messageRepository } from '../../src/repositories/message.repository.js';
import { swapRequestRepository } from '../../src/repositories/swapRequest.repository.js';
import { swapRequestService } from '../../src/services/swapRequest.service.js';

describe('Phase 6 — Real-Time Messaging & Socket.IO Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  const timestamp = Date.now();

  let userA_Id = 0; // Alice (teaches TypeScript, wants Python)
  let userB_Id = 0; // Bob (teaches Python, wants TypeScript)
  let userC_Id = 0; // Charlie (third party)

  let userA_Cookie = '';
  let userA_Csrf = '';
  let userA_CsrfToken = '';

  let userB_Cookie = '';
  let userB_Csrf = '';
  let userB_CsrfToken = '';

  let userC_Cookie = '';
  let userC_Csrf = '';
  let userC_CsrfToken = '';

  let conversationId = 0;
  let swapRequestId = 0;

  let socketA: ClientSocket | null = null;
  let socketB: ClientSocket | null = null;
  let socketC: ClientSocket | null = null;

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

  before(async () => {
    const app = createApp();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 5066;
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
      assert.equal(res.status, 201);
      const json = await res.json();
      const rawCookies = typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : (res.headers.get('set-cookie') || '').split(',');
      let cookie = '';
      let csrfCookie = '';
      let csrfToken = json.data.csrfToken || '';

      for (const raw of rawCookies) {
        const c = raw.trim().split(';')[0];
        if (c.startsWith(`${AUTH_COOKIE_NAME}=`)) cookie = c;
        if (c.startsWith(`${CSRF_COOKIE_NAME}=`)) {
          csrfCookie = c;
          if (!csrfToken) csrfToken = c.split('=')[1];
        }
      }

      return {
        userId: json.data.user.id,
        cookie,
        csrfCookie,
        csrfToken,
      };
    }

    const regA = await registerUser('Alice Walker', `msg_alice_${timestamp}`, `msg_alice_${timestamp}@example.com`);
    userA_Id = regA.userId;
    userA_Cookie = regA.cookie;
    userA_Csrf = regA.csrfCookie;
    userA_CsrfToken = regA.csrfToken;

    const regB = await registerUser('Bob Builder', `msg_bob_${timestamp}`, `msg_bob_${timestamp}@example.com`);
    userB_Id = regB.userId;
    userB_Cookie = regB.cookie;
    userB_Csrf = regB.csrfCookie;
    userB_CsrfToken = regB.csrfToken;

    const regC = await registerUser('Charlie Brown', `msg_charlie_${timestamp}`, `msg_charlie_${timestamp}@example.com`);
    userC_Id = regC.userId;
    userC_Cookie = regC.cookie;
    userC_Csrf = regC.csrfCookie;
    userC_CsrfToken = regC.csrfToken;

    // Seed Skills
    const tsSkill = await skillRepository.findOrCreate('TypeScript', 'Development');
    const pySkill = await skillRepository.findOrCreate('Python', 'Development');
    const designSkill = await skillRepository.findOrCreate('UI Design', 'Design');

    // Onboard Alice
    await userSkillRepository.addTeachingSkill(userA_Id, tsSkill.id, 'EXPERT');
    await userSkillRepository.addLearningSkill(userA_Id, pySkill.id, 'INTERMEDIATE');
    await userAvailabilityRepository.saveSchedule(userA_Id, [
      { day: 'Monday', slots: ['Evening'] },
    ]);
    await userRepository.setOnboarded(userA_Id, true);

    // Onboard Bob
    await userSkillRepository.addTeachingSkill(userB_Id, pySkill.id, 'ADVANCED');
    await userSkillRepository.addLearningSkill(userB_Id, tsSkill.id, 'ADVANCED');
    await userAvailabilityRepository.saveSchedule(userB_Id, [
      { day: 'Monday', slots: ['Evening'] },
    ]);
    await userRepository.setOnboarded(userB_Id, true);

    // Onboard Charlie
    await userSkillRepository.addTeachingSkill(userC_Id, designSkill.id, 'INTERMEDIATE');
    await userSkillRepository.addLearningSkill(userC_Id, pySkill.id, 'BEGINNER');
    await userRepository.setOnboarded(userC_Id, true);

    // Alice creates swap request to Bob
    const sr = await swapRequestService.createSwapRequest(userA_Id, {
      receiverId: userB_Id,
      senderSkillId: tsSkill.id,
      receiverSkillId: pySkill.id,
      message: 'Hey Bob, would love to swap TypeScript for Python!',
    });
    swapRequestId = sr.id;

    // Bob accepts the swap request -> creates conversation
    const acceptRes = await swapRequestService.acceptSwapRequest(userB_Id, swapRequestId);
    conversationId = acceptRes.conversationId;

    assert.ok(conversationId > 0, 'Conversation should be created upon swap request acceptance');
  });

  after(async () => {
    socketA?.disconnect();
    socketB?.disconnect();
    socketC?.disconnect();

    if (server) {
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // Helper to connect socket
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

  test('1. Authenticated user connects to Socket.IO with cookie', async () => {
    socketA = await connectUserSocket(userA_Cookie);
    assert.ok(socketA.connected, 'Socket for Alice should be connected');
  });

  test('2. Unauthenticated Socket.IO connection is rejected', async () => {
    let connectError: Error | null = null;
    try {
      await connectUserSocket('');
    } catch (err: any) {
      connectError = err;
    }
    assert.ok(connectError, 'Unauthenticated socket connection should fail');
    assert.match(connectError.message, /Authentication/i);
  });

  test('3. GET /api/conversations returns conversation list with peer summary and unreadCount=0', async () => {
    const res = await fetch(`${baseUrl}/api/conversations`, {
      headers: { cookie: userA_Cookie },
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.conversations));
    assert.equal(json.data.conversations.length, 1);

    const conv = json.data.conversations[0];
    assert.equal(conv.id, conversationId);
    assert.equal(conv.peer.id, userB_Id);
    assert.equal(conv.peer.name, 'Bob Builder');
    assert.equal(conv.unreadCount, 0);
    assert.equal(conv.status, 'ACTIVE');
    assert.ok(conv.swapRequest);
    assert.equal(conv.swapRequest.senderSkillName, 'TypeScript');
    assert.equal(conv.swapRequest.receiverSkillName, 'Python');
  });

  test('4. GET /api/conversations/unread-count returns 0 initial unread count', async () => {
    const res = await fetch(`${baseUrl}/api/conversations/unread-count`, {
      headers: { cookie: userA_Cookie },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.unreadCount, 0);
  });

  test('5. Conversation room join: Alice joins conversation room successfully', async () => {
    assert.ok(socketA?.connected);

    const joinRes = await new Promise<any>((resolve) => {
      socketA!.emit('conversation:join', { conversationId }, (ack: any) => {
        resolve(ack);
      });
    });

    assert.equal(joinRes?.success, true);
    assert.equal(joinRes?.conversationId, conversationId);
  });

  test('6. Conversation room security: Charlie (third party) cannot join conversation room', async () => {
    socketC = await connectUserSocket(userC_Cookie);
    assert.ok(socketC.connected);

    const joinRes = await new Promise<any>((resolve) => {
      socketC!.emit('conversation:join', { conversationId }, (ack: any) => {
        resolve(ack);
      });
    });

    assert.equal(joinRes?.success, false);
    assert.match(joinRes?.error, /not authorized/i);
  });

  test('7. REST endpoint security: Charlie cannot access messages of unauthorized conversation', async () => {
    const res = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      headers: { cookie: userC_Cookie },
    });
    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error?.message || json.message, /not authorized/i);
  });

  test('8. Real-time message exchange via Socket.IO: Alice sends message, Bob receives in real time', async () => {
    socketB = await connectUserSocket(userB_Cookie);
    assert.ok(socketB.connected);

    // Bob joins conversation room
    await new Promise<void>((resolve) => {
      socketB!.emit('conversation:join', { conversationId }, () => resolve());
    });

    const clientMsgId = `client_test_${Date.now()}`;
    const testContent = 'Hey Bob, ready for our first skill exchange session?';

    // Bob sets up listener for real-time incoming message
    const messagePromise = waitForEvent(
      socketB!,
      'message:new',
      (msg: any) => msg.conversationId === conversationId && msg.content === testContent
    );

    // Alice sends message with ack callback
    const ackPromise = new Promise<any>((resolve) => {
      socketA!.emit(
        'message:send',
        {
          conversationId,
          content: testContent,
          clientMessageId: clientMsgId,
        },
        (ack: any) => resolve(ack)
      );
    });

    const [ack, receivedMsg] = await Promise.all([ackPromise, messagePromise]);

    assert.equal(ack?.success, true);
    assert.equal(ack?.message?.content, testContent);
    assert.equal(ack?.message?.senderId, userA_Id);

    assert.equal(receivedMsg?.content, testContent);
    assert.equal(receivedMsg?.senderId, userA_Id);
    assert.equal(receivedMsg?.conversationId, conversationId);

    // Verify PostgreSQL persistence
    const dbMsg = await messageRepository.findById(receivedMsg.id);
    assert.ok(dbMsg, 'Message must be permanently stored in PostgreSQL');
    assert.equal(dbMsg.content, testContent);
    assert.equal(dbMsg.senderId, userA_Id);
    assert.equal(dbMsg.conversationId, conversationId);
  });

  test('9. REST fallback: Bob sends message via HTTP POST, Alice receives via Socket.IO', async () => {
    const restContent = 'Yes Alice! I have the Python environment setup ready.';

    // Alice listens for real-time socket event
    const aliceReceivedPromise = waitForEvent(
      socketA!,
      'message:new',
      (msg: any) => msg.conversationId === conversationId && msg.content === restContent
    );

    // Bob sends via REST POST
    const res = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${userB_Cookie}; ${userB_Csrf}`,
        'x-csrf-token': userB_CsrfToken,
      },
      body: JSON.stringify({
        content: restContent,
      }),
    });

    assert.equal(res.status, 201);
    const postJson = await res.json();
    assert.equal(postJson.success, true);
    assert.equal(postJson.data.message.content, restContent);
    assert.equal(postJson.data.message.senderId, userB_Id);

    // Alice should receive it in real-time
    const aliceReceived = await aliceReceivedPromise;
    assert.equal(aliceReceived.content, restContent);
    assert.equal(aliceReceived.senderId, userB_Id);
  });

  test('10. Validation constraints: Empty message and message > 2000 chars are rejected', async () => {
    // Empty message
    const emptyRes = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({ content: '   ' }),
    });
    assert.equal(emptyRes.status, 400);

    // Message > 2000 characters
    const longContent = 'A'.repeat(2001);
    const longRes = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({ content: longContent }),
    });
    assert.equal(longRes.status, 400);
  });

  test('11. Real-time typing indicators: Alice typing broadcasts to Bob only', async () => {
    // Bob listens for typing:update
    const bobTypingPromise = waitForEvent(
      socketB!,
      'typing:update',
      (data: any) => data.conversationId === conversationId && data.isTyping === true
    );

    let charlieGotTyping = false;
    socketC!.once('typing:update', () => {
      charlieGotTyping = true;
    });

    // Alice starts typing
    socketA!.emit('typing:start', { conversationId });

    const bobTyping = await bobTypingPromise;
    assert.equal(bobTyping.conversationId, conversationId);
    assert.equal(bobTyping.userId, userA_Id);
    assert.equal(bobTyping.isTyping, true);
    assert.equal(charlieGotTyping, false, 'Charlie must not receive typing events');

    // Alice stops typing
    const bobStopPromise = waitForEvent(
      socketB!,
      'typing:update',
      (data: any) => data.conversationId === conversationId && data.isTyping === false
    );

    socketA!.emit('typing:stop', { conversationId });
    const bobStop = await bobStopPromise;
    assert.equal(bobStop.conversationId, conversationId);
    assert.equal(bobStop.isTyping, false);
  });

  test('12. Read receipts & unread counters: Bob marks messages as read', async () => {
    // Alice sends a new unread message to Bob
    await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({ content: 'Unread test message for Bob' }),
    });

    // Check Bob unread count is >= 1
    const unreadBefore = await fetch(`${baseUrl}/api/conversations/unread-count`, {
      headers: { cookie: userB_Cookie },
    });
    const beforeJson = await unreadBefore.json();
    assert.ok(beforeJson.data.unreadCount >= 1);

    // Alice listens for read ack
    const readAckPromise = waitForEvent(
      socketA!,
      'message:read_ack',
      (data: any) => data.conversationId === conversationId && data.readerId === userB_Id
    );

    // Bob marks conversation as read via PATCH
    const readRes = await fetch(`${baseUrl}/api/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: {
        cookie: `${userB_Cookie}; ${userB_Csrf}`,
        'x-csrf-token': userB_CsrfToken,
      },
    });
    assert.equal(readRes.status, 200);

    const readAck = await readAckPromise;
    assert.equal(readAck.conversationId, conversationId);
    assert.equal(readAck.readerId, userB_Id);
    assert.ok(readAck.lastReadAt);

    // Check Bob unread count is now 0
    const unreadAfter = await fetch(`${baseUrl}/api/conversations/unread-count`, {
      headers: { cookie: userB_Cookie },
    });
    const afterJson = await unreadAfter.json();
    assert.equal(afterJson.data.unreadCount, 0);
  });

  test('13. Online presence tracking: connect and disconnect broadcast presence:update', async () => {
    // Listen on socketB for presence:update when Alice disconnects
    const presenceOfflinePromise = waitForEvent(
      socketB!,
      'presence:update',
      (data: any) => data.userId === userA_Id && data.isOnline === false
    );

    socketA!.disconnect();
    const offlineEvent = await presenceOfflinePromise;
    assert.equal(offlineEvent.userId, userA_Id);
    assert.equal(offlineEvent.isOnline, false);

    // Reconnect Alice
    const presenceOnlinePromise = waitForEvent(
      socketB!,
      'presence:update',
      (data: any) => data.userId === userA_Id && data.isOnline === true
    );

    socketA = await connectUserSocket(userA_Cookie);
    const onlineEvent = await presenceOnlinePromise;
    assert.equal(onlineEvent.userId, userA_Id);
    assert.equal(onlineEvent.isOnline, true);
  });

  test('14. Read-only conversation restriction: Archived conversation rejects new messages', async () => {
    // Set conversation to READ_ONLY
    await conversationRepository.updateStatus(conversationId, 'READ_ONLY');

    const res = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${userA_Cookie}; ${userA_Csrf}`,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({ content: 'Trying to speak in archived chat' }),
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.match(json.error?.message || json.message, /read-only/i);

    // Restore to ACTIVE for clean state
    await conversationRepository.updateStatus(conversationId, 'ACTIVE');
  });

  test('15. Message history pagination with limit and beforeId cursor', async () => {
    // Ensure multiple messages exist for deterministic pagination testing
    await messageRepository.create({ conversationId, senderId: userA_Id, content: 'Pagination msg 1' });
    await messageRepository.create({ conversationId, senderId: userB_Id, content: 'Pagination msg 2' });
    await messageRepository.create({ conversationId, senderId: userA_Id, content: 'Pagination msg 3' });

    // Fetch with limit 2
    const res = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages?limit=2`, {
      headers: { cookie: userA_Cookie },
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.messages.length, 2);

    const firstMsg = json.data.messages[0];

    // Fetch before the first returned message
    const cursorRes = await fetch(
      `${baseUrl}/api/conversations/${conversationId}/messages?limit=2&beforeId=${firstMsg.id}`,
      {
        headers: { cookie: userA_Cookie },
      }
    );
    assert.equal(cursorRes.status, 200);
    const cursorJson = await cursorRes.json();
    assert.ok(Array.isArray(cursorJson.data.messages));
    for (const m of cursorJson.data.messages) {
      assert.ok(m.id < firstMsg.id, 'Cursor pagination must return messages before cursor');
    }
  });
});
