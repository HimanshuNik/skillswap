import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';

describe('Phase 20 — Community Features, Discussion Forums & Study Groups Integration Tests', { concurrency: 1 }, () => {
  let server: Server;
  let baseUrl: string;
  let userACookie: string;
  let userBCookie: string;
  let adminCookie: string;
  let userAId: number;
  let userBId: number;
  let adminId: number;
  let userACsrf: string;
  let userBCsrf: string;
  let adminCsrf: string;

  let createdPostId: number;
  let createdQuestionId: number;
  let createdCommentId: number;
  let createdAnswerId: number;
  let publicGroupId: number;
  let privateGroupId: number;

  function extractCookieAndCsrf(res: any) {
    const rawHeaders: string[] = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie') || ''];

    let auth = '';
    let csrf = '';

    for (const h of rawHeaders) {
      const parts = h.split(',').map((c: string) => c.trim().split(';')[0]);
      for (const p of parts) {
        if (p.startsWith(`${AUTH_COOKIE_NAME}=`)) {
          auth = p;
        }
        if (p.startsWith(`${CSRF_COOKIE_NAME}=`)) {
          csrf = p.split('=')[1] || '';
        }
      }
    }
    return {
      auth: csrf ? `${auth}; ${CSRF_COOKIE_NAME}=${csrf}` : auth,
      csrf,
    };
  }

  before(async () => {
    const timestamp = Date.now();
    const app = createApp();

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });

    // Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `comm_a_${timestamp}@example.com`,
        username: `comm_a_${timestamp}`,
        name: 'Community User A',
        password: 'Password123!',
      }),
    });
    const parsedA = extractCookieAndCsrf(resA);
    userACookie = parsedA.auth;
    userACsrf = parsedA.csrf;
    const dataA = await resA.json();
    userAId = dataA.data.user.id;

    // Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `comm_b_${timestamp}@example.com`,
        username: `comm_b_${timestamp}`,
        name: 'Community User B',
        password: 'Password123!',
      }),
    });
    const parsedB = extractCookieAndCsrf(resB);
    userBCookie = parsedB.auth;
    userBCsrf = parsedB.csrf;
    const dataB = await resB.json();
    userBId = dataB.data.user.id;

    // Register Admin
    const resAdmin = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `comm_admin_${timestamp}@example.com`,
        username: `comm_adm_${timestamp}`,
        name: 'Community Admin',
        password: 'Password123!',
      }),
    });
    const parsedAdmin = extractCookieAndCsrf(resAdmin);
    adminCookie = parsedAdmin.auth;
    adminCsrf = parsedAdmin.csrf;
    const dataAdmin = await resAdmin.json();
    adminId = dataAdmin.data.user.id;

    // Promote Admin to ADMIN role in database
    await db.orm.public.User.where({ id: adminId }).update({ role: 'ADMIN' });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // --- DISCUSSION POST TESTS ---

  it('1. User A creates a DISCUSSION post with tags and content', async () => {
    const res = await fetch(`${baseUrl}/api/community/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Best Practices for Full-Stack React 19 State Management',
        content: 'Let us discuss how Zustand and TanStack Query work together seamlessly in production apps.',
        postType: 'DISCUSSION',
        tags: 'react,zustand,typescript',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.post.title, 'Best Practices for Full-Stack React 19 State Management');
    assert.equal(json.data.post.authorId, userAId);
    assert.equal(json.data.post.postType, 'DISCUSSION');
    assert.equal(json.data.post.author.username.includes('comm_a_'), true);
    createdPostId = json.data.post.id;
  });

  it('2. Author (User A) can edit their post; non-author (User B) receives 403 Forbidden', async () => {
    // User B attempts to edit User A post
    const forbiddenRes = await fetch(`${baseUrl}/api/community/posts/${createdPostId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        title: 'Tampered Title by User B',
      }),
    });
    assert.equal(forbiddenRes.status, 403);

    // User A edits their own post
    const editRes = await fetch(`${baseUrl}/api/community/posts/${createdPostId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Best Practices for React 19 State Management (Updated)',
      }),
    });
    assert.equal(editRes.status, 200);
    const editJson = await editRes.json();
    assert.equal(editJson.data.post.title, 'Best Practices for React 19 State Management (Updated)');
  });

  it('3. User A creates a QUESTION post', async () => {
    const res = await fetch(`${baseUrl}/api/community/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'How to handle WebSocket reconnection with Socket.IO in React?',
        content: 'When the network blips, what is the best way to automatically reconnect and resubscribe to rooms?',
        postType: 'QUESTION',
        tags: 'socketio,websocket,react',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.post.postType, 'QUESTION');
    assert.equal(json.data.post.isResolved, false);
    createdQuestionId = json.data.post.id;
  });

  // --- COMMENTS & REPLIES TESTS ---

  it('4. User B posts a comment on User A discussion post', async () => {
    const res = await fetch(`${baseUrl}/api/community/posts/${createdPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        content: 'Great discussion! Zustand handles client UI state, while TanStack Query handles server cache.',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.comment.postId, createdPostId);
    assert.equal(json.data.comment.depth, 0);
    createdCommentId = json.data.comment.id;
  });

  it('5. User A posts a threaded reply to User B comment (depth 1)', async () => {
    const res = await fetch(`${baseUrl}/api/community/posts/${createdPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        content: 'Exactly! Keeping server state out of Zustand prevents synchronization bugs.',
        parentId: createdCommentId,
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.comment.parentId, createdCommentId);
    assert.equal(json.data.comment.depth, 1);

    // Verify comment tree
    const treeRes = await fetch(`${baseUrl}/api/community/posts/${createdPostId}/comments`);
    assert.equal(treeRes.status, 200);
    const treeJson = await treeRes.json();
    assert.equal(treeJson.data.comments.length, 1);
    assert.equal(treeJson.data.comments[0].replies.length, 1);
    assert.equal(treeJson.data.comments[0].replies[0].content.includes('Keeping server state out'), true);
  });

  // --- QUESTION & ACCEPTED ANSWER TESTS ---

  it('6. User B answers User A question', async () => {
    const res = await fetch(`${baseUrl}/api/community/posts/${createdQuestionId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        content: 'Use `socket.on("connect")` in a custom hook to rejoin active conversation rooms immediately upon reconnecting.',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    createdAnswerId = json.data.comment.id;
  });

  it('7. Question author (User A) marks User B answer as accepted solution, awarding 25 XP', async () => {
    // Non-author (User B) cannot mark answer
    const forbiddenRes = await fetch(
      `${baseUrl}/api/community/posts/${createdQuestionId}/comments/${createdAnswerId}/accept`,
      {
        method: 'POST',
        headers: {
          Cookie: userBCookie,
          'x-csrf-token': userBCsrf,
        },
      }
    );
    assert.equal(forbiddenRes.status, 403);

    // Author (User A) accepts answer
    const acceptRes = await fetch(
      `${baseUrl}/api/community/posts/${createdQuestionId}/comments/${createdAnswerId}/accept`,
      {
        method: 'POST',
        headers: {
          Cookie: userACookie,
          'x-csrf-token': userACsrf,
        },
      }
    );
    assert.equal(acceptRes.status, 200);
    const acceptJson = await acceptRes.json();
    assert.equal(acceptJson.data.post.isResolved, true);
    assert.equal(acceptJson.data.post.acceptedAnswerId, createdAnswerId);
    assert.equal(acceptJson.data.comment.isAcceptedAnswer, true);

    // Verify User B XP ledger contains accepted answer reward
    const xpTransactions = (await db.orm.public.XPTransaction.where({
      userId: userBId,
      actionType: 'COMMUNITY_ACCEPTED_ANSWER',
    }).all()) as any[];
    assert.equal(xpTransactions.length, 1);
    assert.equal(xpTransactions[0].amount, 25);
  });

  it('8. Question author unmarks accepted answer, reverting resolved status', async () => {
    const res = await fetch(`${baseUrl}/api/community/posts/${createdQuestionId}/accept`, {
      method: 'DELETE',
      headers: {
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.post.isResolved, false);
    assert.equal(json.data.post.acceptedAnswerId, null);
  });

  // --- UPVOTING TESTS ---

  it('9. User B upvotes User A post; clicking again removes upvote (toggle)', async () => {
    // Upvote
    const voteRes = await fetch(`${baseUrl}/api/community/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        targetType: 'POST',
        targetId: createdPostId,
      }),
    });
    assert.equal(voteRes.status, 200);
    const voteJson = await voteRes.json();
    assert.equal(voteJson.data.upvoted, true);
    assert.equal(voteJson.data.count, 1);

    // Verify post record updated
    const post = (await db.orm.public.CommunityPost.where({ id: createdPostId }).first()) as any;
    assert.equal(post.upvoteCount, 1);

    // Upvote again -> removes vote
    const toggleRes = await fetch(`${baseUrl}/api/community/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        targetType: 'POST',
        targetId: createdPostId,
      }),
    });
    assert.equal(toggleRes.status, 200);
    const toggleJson = await toggleRes.json();
    assert.equal(toggleJson.data.upvoted, false);
    assert.equal(toggleJson.data.count, 0);
  });

  // --- STUDY GROUPS TESTS ---

  it('10. User A creates a PUBLIC study group and becomes OWNER', async () => {
    const res = await fetch(`${baseUrl}/api/community/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        name: 'Full Stack React & Node Learners',
        description: 'Collaborative weekly study group focusing on TypeScript, React 19, and Express.',
        visibility: 'PUBLIC',
        membershipRules: 'Be respectful and contribute to weekly peer reviews.',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.group.name, 'Full Stack React & Node Learners');
    assert.equal(json.data.group.creatorId, userAId);
    assert.equal(json.data.group.memberCount, 1);
    assert.equal(json.data.group.membership.role, 'OWNER');
    publicGroupId = json.data.group.id;
  });

  it('11. User B joins the PUBLIC study group instantly', async () => {
    const res = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/join`, {
      method: 'POST',
      headers: {
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.member.status, 'ACTIVE');
    assert.equal(json.data.member.role, 'MEMBER');

    // Verify member count incremented to 2
    const groupRes = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}`);
    const groupJson = await groupRes.json();
    assert.equal(groupJson.data.group.memberCount, 2);
  });

  it('12. User A creates a PRIVATE study group; User B requests to join (status: PENDING)', async () => {
    const res = await fetch(`${baseUrl}/api/community/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        name: 'Elite Software Architecture Circle',
        description: 'Deep dive into microservices, distributed systems, and database contracts.',
        visibility: 'PRIVATE',
        membershipRules: 'Invitation or verified experience required.',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    privateGroupId = json.data.group.id;

    // User B requests to join
    const reqRes = await fetch(`${baseUrl}/api/community/groups/${privateGroupId}/request`, {
      method: 'POST',
      headers: {
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
    });

    assert.equal(reqRes.status, 200);
    const reqJson = await reqRes.json();
    assert.equal(reqJson.data.member.status, 'PENDING');

    // Group memberCount remains 1 until approved
    const group = (await db.orm.public.StudyGroup.where({ id: privateGroupId }).first()) as any;
    assert.equal(group.memberCount, 1);
  });

  it('13. Group Owner (User A) approves User B membership request', async () => {
    const res = await fetch(`${baseUrl}/api/community/groups/${privateGroupId}/members/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        userId: userBId,
        action: 'APPROVE',
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);

    // Group memberCount now incremented to 2
    const group = (await db.orm.public.StudyGroup.where({ id: privateGroupId }).first()) as any;
    assert.equal(group.memberCount, 2);
  });

  it('14. Group Owner promotes User B to MODERATOR, then demotes back to MEMBER', async () => {
    // Promote
    const promoteRes = await fetch(`${baseUrl}/api/community/groups/${privateGroupId}/members/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        userId: userBId,
        action: 'PROMOTE_MODERATOR',
      }),
    });
    assert.equal(promoteRes.status, 200);

    let member = (await db.orm.public.StudyGroupMember.where({
      groupId: privateGroupId,
      userId: userBId,
    }).first()) as any;
    assert.equal(member.role, 'MODERATOR');

    // Demote
    const demoteRes = await fetch(`${baseUrl}/api/community/groups/${privateGroupId}/members/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        userId: userBId,
        action: 'DEMOTE_MEMBER',
      }),
    });
    assert.equal(demoteRes.status, 200);

    member = (await db.orm.public.StudyGroupMember.where({
      groupId: privateGroupId,
      userId: userBId,
    }).first()) as any;
    assert.equal(member.role, 'MEMBER');
  });

  // --- GROUP PERMISSIONS & ACCESS CONTROL TESTS ---

  it('15. User A creates a post in private group; authorized member can view, stranger receives 403', async () => {
    // User A posts in private group
    const postRes = await fetch(`${baseUrl}/api/community/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Internal Architecture Whitepaper Review',
        content: 'Confidential study group notes regarding scalable distributed consensus.',
        groupId: privateGroupId,
        postType: 'DISCUSSION',
      }),
    });
    assert.equal(postRes.status, 201);
    const postJson = await postRes.json();
    const privatePostId = postJson.data.post.id;

    // User B (approved member) can view
    const viewResB = await fetch(`${baseUrl}/api/community/posts/${privatePostId}`, {
      headers: { Cookie: userBCookie },
    });
    assert.equal(viewResB.status, 200);

    // Unauthenticated stranger receives 403 Forbidden
    const strangerRes = await fetch(`${baseUrl}/api/community/posts/${privatePostId}`);
    assert.equal(strangerRes.status, 403);
  });

  it('16. Non-members cannot post in study groups without joining', async () => {
    // Register temporary stranger
    const timestamp = Date.now();
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `stranger_${timestamp}@example.com`,
        username: `stranger_${timestamp}`,
        name: 'Stranger User',
        password: 'Password123!',
      }),
    });
    const { auth, csrf } = extractCookieAndCsrf(regRes);

    const postRes = await fetch(`${baseUrl}/api/community/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: auth,
        'x-csrf-token': csrf,
      },
      body: JSON.stringify({
        title: 'Unauthorized Post Attempt',
        content: 'I have not joined this group yet.',
        groupId: publicGroupId,
      }),
    });

    assert.equal(postRes.status, 403);
  });

  it('17. User A leaves group and ownership is safely transferred to User B', async () => {
    const leaveRes = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/leave`, {
      method: 'POST',
      headers: {
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
    });
    assert.equal(leaveRes.status, 200);

    // Verify User B is now OWNER
    const memberB = (await db.orm.public.StudyGroupMember.where({
      groupId: publicGroupId,
      userId: userBId,
    }).first()) as any;
    assert.equal(memberB.role, 'OWNER');
  });

  // --- SEARCH & REPORTING TESTS ---

  it('18. Community search filters by keyword, postType, and never leaks private group posts', async () => {
    const searchRes = await fetch(`${baseUrl}/api/community/posts?search=Zustand&postType=DISCUSSION`);
    assert.equal(searchRes.status, 200);
    const searchJson = await searchRes.json();
    assert.equal(searchJson.success, true);
    assert.equal(searchJson.data.posts.length > 0, true);
    assert.equal(searchJson.data.posts[0].title.includes('State Management'), true);

    // Verify private group post is not returned in public search without membership
    const privateSearchRes = await fetch(`${baseUrl}/api/community/posts?search=Whitepaper`);
    const privateSearchJson = await privateSearchRes.json();
    assert.equal(privateSearchJson.data.posts.length, 0);
  });

  it('19. Content reporting: User B reports a post; duplicate reports are rejected with 409 Conflict', async () => {
    const reportRes = await fetch(`${baseUrl}/api/community/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        targetType: 'COMMUNITY_POST',
        targetId: createdPostId,
        category: 'SPAM',
        reason: 'Testing community reporting verification flow.',
      }),
    });
    assert.equal(reportRes.status, 201);
    const reportJson = await reportRes.json();
    assert.equal(reportJson.success, true);

    // Duplicate report
    const dupRes = await fetch(`${baseUrl}/api/community/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        targetType: 'COMMUNITY_POST',
        targetId: createdPostId,
        category: 'SPAM',
        reason: 'Duplicate report attempt.',
      }),
    });
    assert.equal(dupRes.status, 409);
  });

  it('20. Moderator actions: Moderator locks discussion and hides inappropriate post', async () => {
    // Admin locks discussion
    const lockRes = await fetch(`${baseUrl}/api/community/posts/${createdPostId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        isLocked: true,
        isHidden: true,
      }),
    });
    assert.equal(lockRes.status, 200);
    const lockJson = await lockRes.json();
    assert.equal(lockJson.data.post.isLocked, true);
    assert.equal(lockJson.data.post.isHidden, true);

    // Further comments by User B are rejected because post is locked
    const commentRes = await fetch(`${baseUrl}/api/community/posts/${createdPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        content: 'This comment should be rejected because the discussion is locked.',
      }),
    });
    assert.equal(commentRes.status, 400);

    // Post is hidden from public list
    const publicList = await fetch(`${baseUrl}/api/community/posts`);
    const publicJson = await publicList.json();
    const found = publicJson.data.posts.find((p: any) => p.id === createdPostId);
    assert.equal(found, undefined);
  });
});

