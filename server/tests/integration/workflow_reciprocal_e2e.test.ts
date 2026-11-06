import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../../src/app.js';
import { initSocketServer } from '../../src/socket/index.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { skillRepository } from '../../src/repositories/skill.repository.js';
import { userSkillRepository } from '../../src/repositories/userSkill.repository.js';
import { userAvailabilityRepository } from '../../src/repositories/userAvailability.repository.js';
import { conversationRepository } from '../../src/repositories/conversation.repository.js';
import { swapRequestRepository } from '../../src/repositories/swapRequest.repository.js';

describe('SkillSwap — Complete Reciprocal Workflow Verification', () => {
  let server: Server;
  let baseUrl: string;
  const timestamp = Date.now();

  let userA_Id: number;
  let userB_Id: number;
  let userC_Id: number;

  const userA_Username = `usera_flow_${timestamp}`;
  const userB_Username = `userb_flow_${timestamp}`;
  const userC_Username = `userc_flow_${timestamp}`;

  let userA_Cookie = '';
  let userA_CsrfToken = '';
  let userB_Cookie = '';
  let userB_CsrfToken = '';
  let userC_Cookie = '';
  let userC_CsrfToken = '';

  let reactSkillId: number;
  let uiuxSkillId: number;

  let swapRequestId: number;
  let conversationId: number;

  let socketA: ClientSocket | null = null;
  let socketB: ClientSocket | null = null;
  let socketC: ClientSocket | null = null;

  function waitForEvent<T = any>(
    emitter: any,
    event: string,
    filter?: (data: T) => boolean,
    timeoutMs = 6000
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

  function extractCookies(res: Response) {
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

    // 1. Resolve or create "React Dev" and "UI/UX Design" skills
    const reactDev = await skillRepository.findOrCreate('React Dev', 'Development');
    const uiuxDesign = await skillRepository.findOrCreate('UI/UX Design', 'Design');
    reactSkillId = reactDev.id;
    uiuxSkillId = uiuxDesign.id;

    assert.ok(reactSkillId > 0, 'React Dev skill must exist with a positive ID');
    assert.ok(uiuxSkillId > 0, 'UI/UX Design skill must exist with a positive ID');

    // 2. Register User A
    const regResA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User A Reciprocal',
        username: userA_Username,
        email: `usera_${timestamp}@example.com`,
        password: 'Password123!',
      }),
    });
    assert.equal(regResA.status, 201);
    const regDataA = await regResA.json();
    userA_Id = regDataA.data.user.id;
    const cookiesA = extractCookies(regResA);
    userA_Cookie = cookiesA.cookie;
    userA_CsrfToken = regDataA.data.csrfToken || cookiesA.csrf;

    // 3. Register User B
    const regResB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User B Reciprocal',
        username: userB_Username,
        email: `userb_${timestamp}@example.com`,
        password: 'Password123!',
      }),
    });
    assert.equal(regResB.status, 201);
    const regDataB = await regResB.json();
    userB_Id = regDataB.data.user.id;
    const cookiesB = extractCookies(regResB);
    userB_Cookie = cookiesB.cookie;
    userB_CsrfToken = regDataB.data.csrfToken || cookiesB.csrf;

    // 4. Register User C (Third-party for access control check)
    const regResC = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User C ThirdParty',
        username: userC_Username,
        email: `userc_${timestamp}@example.com`,
        password: 'Password123!',
      }),
    });
    assert.equal(regResC.status, 201);
    const regDataC = await regResC.json();
    userC_Id = regDataC.data.user.id;
    const cookiesC = extractCookies(regResC);
    userC_Cookie = cookiesC.cookie;
    userC_CsrfToken = regDataC.data.csrfToken || cookiesC.csrf;

    // 5. Setup User A Skills: Teaches React Dev, Learns UI/UX Design
    await userSkillRepository.addTeachingSkill(userA_Id, reactSkillId, 'EXPERT');
    await userSkillRepository.addLearningSkill(userA_Id, uiuxSkillId, 'INTERMEDIATE');
    await userAvailabilityRepository.saveSchedule(userA_Id, [
      { day: 'Monday', slots: ['Evening'] },
      { day: 'Wednesday', slots: ['Evening'] },
    ]);
    await userRepository.setOnboarded(userA_Id, true);

    // 6. Setup User B Skills: Teaches UI/UX Design, Learns React Dev
    await userSkillRepository.addTeachingSkill(userB_Id, uiuxSkillId, 'ADVANCED');
    await userSkillRepository.addLearningSkill(userB_Id, reactSkillId, 'BEGINNER');
    await userAvailabilityRepository.saveSchedule(userB_Id, [
      { day: 'Tuesday', slots: ['Evening'] },
      { day: 'Thursday', slots: ['Evening'] },
    ]);
    await userRepository.setOnboarded(userB_Id, true);

    // 7. Onboard User C
    await userRepository.setOnboarded(userC_Id, true);
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

  // =========================================================================
  // Step 2 — Verify Reciprocal Skills in DB & Public Profile API
  // =========================================================================
  test('Step 2: Database and Profile API correctly reflect reciprocal skills', async () => {
    // 1. Verify User A teaching & learning skills in DB
    const aTeaching = await userSkillRepository.findTeachingSkillsByUser(userA_Id);
    const aLearning = await userSkillRepository.findLearningSkillsByUser(userA_Id);
    assert.ok(aTeaching.some((s) => s.skillId === reactSkillId));
    assert.ok(aLearning.some((s) => s.skillId === uiuxSkillId));

    // 2. Verify User B teaching & learning skills in DB
    const bTeaching = await userSkillRepository.findTeachingSkillsByUser(userB_Id);
    const bLearning = await userSkillRepository.findLearningSkillsByUser(userB_Id);
    assert.ok(bTeaching.some((s) => s.skillId === uiuxSkillId));
    assert.ok(bLearning.some((s) => s.skillId === reactSkillId));

    // 3. Verify Public Profile for User B as fetched by User A
    const resProfileB = await fetch(`${baseUrl}/api/users/${userB_Username}`, {
      headers: { Cookie: userA_Cookie },
    });
    assert.equal(resProfileB.status, 200);
    const profileB = await resProfileB.json();
    assert.equal(profileB.data.username, userB_Username);

    // Check that User B's teaching skills array includes UI/UX Design with proper skillId
    const bTeachingSkills = profileB.data.teachingSkills;
    assert.ok(Array.isArray(bTeachingSkills));
    const foundUiux = bTeachingSkills.find(
      (s: any) => s.skillId === uiuxSkillId || s.skill?.id === uiuxSkillId || s.id === uiuxSkillId
    );
    assert.ok(foundUiux, 'User B public profile must contain UI/UX Design in teachingSkills');

    // Check that User B's learning skills array includes React Dev
    const bLearningSkills = profileB.data.learningSkills;
    assert.ok(Array.isArray(bLearningSkills));
    const foundReact = bLearningSkills.find(
      (s: any) => s.skillId === reactSkillId || s.skill?.id === reactSkillId || s.id === reactSkillId
    );
    assert.ok(foundReact, 'User B public profile must contain React Dev in learningSkills');

    // 4. Verify My Profile for User A
    const resMeA = await fetch(`${baseUrl}/api/users/me`, {
      headers: { Cookie: userA_Cookie },
    });
    assert.equal(resMeA.status, 200);
    const meA = await resMeA.json();
    assert.ok(meA.data.teachingSkills.some((s: any) => (s.skillId || s.skill?.id || s.id) === reactSkillId));
    assert.ok(meA.data.learningSkills.some((s: any) => (s.skillId || s.skill?.id || s.id) === uiuxSkillId));
  });

  // =========================================================================
  // Step 3 — Swap Request Submission & Validation
  // =========================================================================
  test('Step 3a: Rejects swap request with incompatible offered or requested skills', async () => {
    // User A attempts to offer a skill they do not teach (e.g. 99999)
    const badRes1 = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userB_Id,
        senderSkillId: 99999,
        receiverSkillId: uiuxSkillId,
      }),
    });
    assert.equal(badRes1.status, 400);
    const badData1 = await badRes1.json();
    assert.equal(badData1.success, false);

    // User A attempts to offer React Dev, but requests a skill User B does not teach (e.g. 99999)
    const badRes2 = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userB_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: 99999,
      }),
    });
    assert.equal(badRes2.status, 400);
    const badData2 = await badRes2.json();
    assert.equal(badData2.success, false);
  });

  test('Step 3b: User A successfully sends reciprocal swap request (React Dev for UI/UX Design)', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userB_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: uiuxSkillId,
        message: 'Hi User B! I would love to teach you React in exchange for UI/UX Design.',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.swapRequest.id > 0);
    assert.equal(body.data.swapRequest.senderId, userA_Id);
    assert.equal(body.data.swapRequest.receiverId, userB_Id);
    assert.equal(body.data.swapRequest.senderSkillId, reactSkillId);
    assert.equal(body.data.swapRequest.receiverSkillId, uiuxSkillId);
    assert.equal(body.data.swapRequest.status, 'PENDING');

    swapRequestId = body.data.swapRequest.id;
  });

  test('Step 3c: Prevents duplicate active swap requests between User A and User B', async () => {
    // Attempt duplicate from User A -> User B
    const dupRes1 = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userA_Cookie,
        'x-csrf-token': userA_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userB_Id,
        senderSkillId: reactSkillId,
        receiverSkillId: uiuxSkillId,
        message: 'Second duplicate request attempt',
      }),
    });
    assert.equal(dupRes1.status, 409, 'Must reject duplicate request with 409 Conflict');
    const dupData1 = await dupRes1.json();
    assert.equal(dupData1.success, false);
    assert.match(dupData1.error.message, /already exists/i);

    // Attempt reverse duplicate from User B -> User A while pending
    const dupRes2 = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userB_Cookie,
        'x-csrf-token': userB_CsrfToken,
      },
      body: JSON.stringify({
        receiverId: userA_Id,
        senderSkillId: uiuxSkillId,
        receiverSkillId: reactSkillId,
        message: 'Reverse duplicate attempt',
      }),
    });
    assert.equal(dupRes2.status, 409, 'Must reject reverse duplicate request with 409 Conflict');
  });

  // =========================================================================
  // Step 4 — Request Acceptance & Conversation Generation
  // =========================================================================
  test('Step 4a: User B sees the incoming swap request with populated skill details', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/incoming`, {
      headers: { Cookie: userB_Cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data.requests));

    const incoming = body.data.requests.find((r: any) => r.id === swapRequestId);
    assert.ok(incoming, 'Incoming request must be present in User B incoming list');
    assert.equal(incoming.sender.id, userA_Id);
    assert.equal(incoming.senderSkill.name, 'React Dev');
    assert.equal(incoming.receiverSkill.name, 'UI/UX Design');
    assert.equal(incoming.status, 'PENDING');
  });

  test('Step 4b: User B accepts request; creates exactly 1 conversation linking both users', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/${swapRequestId}/accept`, {
      method: 'PATCH',
      headers: {
        Cookie: userB_Cookie,
        'x-csrf-token': userB_CsrfToken,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.swapRequest.status, 'ACCEPTED');
    assert.ok(body.data.conversationId > 0);

    conversationId = body.data.conversationId;

    // Direct database assertions:
    // 1. Verify swap request status in DB
    const dbReq = await swapRequestRepository.findById(swapRequestId);
    assert.equal(dbReq?.status, 'ACCEPTED');

    // 2. Verify Conversation in DB
    const dbConv = await conversationRepository.findBySwapRequestId(swapRequestId);
    assert.ok(dbConv);
    assert.equal(dbConv.id, conversationId);
    assert.equal(dbConv.status, 'ACTIVE');

    // 3. Verify exactly 2 participants exist for this conversation
    const participants = await conversationRepository.getParticipants(conversationId);
    assert.equal(participants.length, 2, 'Conversation must have exactly 2 participants');
    const participantIds = participants.map((p) => p.userId).sort();
    assert.deepEqual(participantIds, [userA_Id, userB_Id].sort());
  });

  test('Step 4c: Duplicate acceptance is rejected with 409 Conflict (idempotency)', async () => {
    const res = await fetch(`${baseUrl}/api/swap-requests/${swapRequestId}/accept`, {
      method: 'PATCH',
      headers: {
        Cookie: userB_Cookie,
        'x-csrf-token': userB_CsrfToken,
      },
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error.message, /already been accepted/i);
  });

  // =========================================================================
  // Step 5 — Real-Time Messaging & Chat Persistence
  // =========================================================================
  test('Step 5a: Both users can access the conversation (initially empty)', async () => {
    // User A fetches messages
    const resA = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      headers: { Cookie: userA_Cookie },
    });
    assert.equal(resA.status, 200);
    const bodyA = await resA.json();
    assert.deepEqual(bodyA.data.messages, [], 'Initial message history must be empty');

    // User B fetches messages
    const resB = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      headers: { Cookie: userB_Cookie },
    });
    assert.equal(resB.status, 200);
    const bodyB = await resB.json();
    assert.deepEqual(bodyB.data.messages, [], 'Initial message history must be empty');
  });

  test('Step 5b: Real-time message exchange via Socket.IO and instant delivery', async () => {
    // Connect User A and User B sockets
    socketA = await connectUserSocket(userA_Cookie);
    socketB = await connectUserSocket(userB_Cookie);

    assert.ok(socketA.connected, 'Socket A should be connected');
    assert.ok(socketB.connected, 'Socket B should be connected');

    // Both users join conversation room and wait for ack
    await Promise.all([
      new Promise<void>((resolve) => socketA!.emit('conversation:join', { conversationId }, () => resolve())),
      new Promise<void>((resolve) => socketB!.emit('conversation:join', { conversationId }, () => resolve())),
    ]);

    // User B sets up listener for new message
    const msgPromiseForB = waitForEvent(socketB, 'message:new', (msg: any) => {
      return msg.conversationId === conversationId && msg.senderId === userA_Id;
    });

    // User A sends message via socket
    socketA.emit('message:send', {
      conversationId,
      content: 'Hello User B! Super excited for our React and UI/UX skill swap.',
    });

    // User B receives message instantly
    const receivedByB = await msgPromiseForB;
    assert.equal(receivedByB.content, 'Hello User B! Super excited for our React and UI/UX skill swap.');
    assert.equal(receivedByB.senderId, userA_Id);

    // Now User A sets up listener for User B's reply
    const replyPromiseForA = waitForEvent(socketA, 'message:new', (msg: any) => {
      return msg.conversationId === conversationId && msg.senderId === userB_Id;
    });

    // User B replies via socket
    socketB.emit('message:send', {
      conversationId,
      content: 'Hi User A! Thanks for connecting, I am ready to schedule our first session.',
    });

    // User A receives User B's reply instantly
    const receivedByA = await replyPromiseForA;
    assert.equal(receivedByA.content, 'Hi User A! Thanks for connecting, I am ready to schedule our first session.');
    assert.equal(receivedByA.senderId, userB_Id);
  });

  test('Step 5c: All messages persist in PostgreSQL and full history is preserved', async () => {
    // User A fetches complete history via HTTP
    const res = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      headers: { Cookie: userA_Cookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.messages.length, 2, 'Both messages must persist in database');

    assert.equal(body.data.messages[0].senderId, userA_Id);
    assert.equal(body.data.messages[0].content, 'Hello User B! Super excited for our React and UI/UX skill swap.');

    assert.equal(body.data.messages[1].senderId, userB_Id);
    assert.equal(body.data.messages[1].content, 'Hi User A! Thanks for connecting, I am ready to schedule our first session.');
  });

  test('Step 5d: Unread counts update and marking as read works', async () => {
    // User A marks conversation as read
    const readRes = await fetch(`${baseUrl}/api/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: {
        Cookie: userA_Cookie,
        'x-csrf-token': userA_CsrfToken,
      },
    });
    assert.equal(readRes.status, 200);

    // User A fetches conversation summaries
    const convListRes = await fetch(`${baseUrl}/api/conversations`, {
      headers: { Cookie: userA_Cookie },
    });
    assert.equal(convListRes.status, 200);
    const convListData = await convListRes.json();
    const myConv = convListData.data.conversations.find((c: any) => c.id === conversationId);
    assert.ok(myConv);
    assert.equal(myConv.unreadCount, 0, 'Unread count should be 0 after marking read');
    assert.equal(myConv.peer.id, userB_Id);
    assert.equal(myConv.peer.username, userB_Username);
  });

  test('Step 5e: Unauthorized user (User C) cannot access or send messages in the conversation', async () => {
    // User C attempts to read messages -> 403 Forbidden
    const resRead = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      headers: { Cookie: userC_Cookie },
    });
    assert.equal(resRead.status, 403, 'User C must be forbidden from reading conversation messages');
    const readData = await resRead.json();
    assert.equal(readData.success, false);

    // User C attempts to send message -> 403 Forbidden
    const resSend = await fetch(`${baseUrl}/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userC_Cookie,
        'x-csrf-token': userC_CsrfToken,
      },
      body: JSON.stringify({ content: 'I am an intruder' }),
    });
    assert.equal(resSend.status, 403, 'User C must be forbidden from sending messages');
  });
});
