import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';

describe('Phase 21 — Collaborative Learning, Group Sessions & Shared Resources Tests', { concurrency: 1 }, () => {
  let server: Server;
  let baseUrl: string;
  let userACookie: string;
  let userBCookie: string;
  let userCCookie: string;
  let userAId: number;
  let userBId: number;
  let userCId: number;
  let userACsrf: string;
  let userBCsrf: string;
  let userCCsrf: string;

  let publicGroupId: number;
  let privateGroupId: number;
  let sessionId: number;
  let smallCapSessionId: number;
  let resourceId: number;
  let fileResourceId: number;
  let taskId: number;
  let milestoneId: number;
  let announcementId: number;

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

    // 1. Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `collab_a_${timestamp}@example.com`,
        username: `collab_a_${timestamp}`,
        name: 'Alice Collab Host',
        password: 'Password123!',
      }),
    });
    const jsonA = await resA.json();
    userAId = jsonA.data.user.id;
    const credsA = extractCookieAndCsrf(resA);
    userACookie = credsA.auth;
    userACsrf = credsA.csrf;

    // 2. Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `collab_b_${timestamp}@example.com`,
        username: `collab_b_${timestamp}`,
        name: 'Bob Collab Learner',
        password: 'Password123!',
      }),
    });
    const jsonB = await resB.json();
    userBId = jsonB.data.user.id;
    const credsB = extractCookieAndCsrf(resB);
    userBCookie = credsB.auth;
    userBCsrf = credsB.csrf;

    // Register User C (Non-member / 3rd participant)
    const resC = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `collab_c_${timestamp}@example.com`,
        username: `collab_c_${timestamp}`,
        name: 'Charlie External',
        password: 'Password123!',
      }),
    });
    const jsonC = await resC.json();
    userCId = jsonC.data.user.id;
    const credsC = extractCookieAndCsrf(resC);
    userCCookie = credsC.auth;
    userCCsrf = credsC.csrf;

    // Create PUBLIC Study Group by User A
    const groupRes = await fetch(`${baseUrl}/api/community/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        name: `Collab Public Group ${timestamp}`,
        description: 'Collaborative study group for workshops.',
        visibility: 'PUBLIC',
      }),
    });
    const groupJson = await groupRes.json();
    publicGroupId = groupJson.data.group.id;

    // User B joins PUBLIC group
    await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/join`, {
      method: 'POST',
      headers: {
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
    });

    // Create PRIVATE Study Group by User A
    const privateGroupRes = await fetch(`${baseUrl}/api/community/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        name: `Collab Private Group ${timestamp}`,
        description: 'Exclusive masterclass group.',
        visibility: 'PRIVATE',
      }),
    });
    const privateGroupJson = await privateGroupRes.json();
    privateGroupId = privateGroupJson.data.group.id;
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  // --- Test 1 ---
  it('1. Group owner (User A) schedules a valid GroupSession with Jitsi room generation', async () => {
    const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    const res = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Weekly React 19 Workshop',
        description: 'Deep dive into server components and actions.',
        topic: 'React 19',
        startTime,
        endTime,
        maxParticipants: 10,
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.title, 'Weekly React 19 Workshop');
    assert.equal(json.data.status, 'SCHEDULED');
    assert.ok(json.data.meetingRoomId.startsWith('skillswap-group-'));
    assert.ok(json.data.meetingUrl.includes(json.data.meetingRoomId));
    sessionId = json.data.id;
  });

  // --- Test 2 ---
  it('2. Scheduling validation rejects invalid times (past start, end <= start, duration < 15m)', async () => {
    const pastStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const pastRes = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Invalid Past Session',
        startTime: pastStart,
        endTime: futureEnd,
      }),
    });
    assert.equal(pastRes.status, 400);

    // End before start
    const invalidOrder = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Invalid Order',
        startTime: futureEnd,
        endTime: pastStart,
      }),
    });
    assert.equal(invalidOrder.status, 400);
  });

  // --- Test 3 ---
  it('3. Standard member (User B) without moderator role cannot schedule session (returns 403 Forbidden)', async () => {
    const startTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();

    const res = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        title: 'Unauthorized Member Session',
        startTime,
        endTime,
      }),
    });

    assert.equal(res.status, 403);
  });

  // --- Test 4 ---
  it('4. User B registers for User A group session (status REGISTERED)', async () => {
    const res = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/sessions/${sessionId}/register`,
      {
        method: 'POST',
        headers: {
          Cookie: userBCookie,
          'x-csrf-token': userBCsrf,
        },
      }
    );

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.status, 'REGISTERED');
  });

  // --- Test 5 ---
  it('5. Duplicate registration rejected with 409 Conflict', async () => {
    const res = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/sessions/${sessionId}/register`,
      {
        method: 'POST',
        headers: {
          Cookie: userBCookie,
          'x-csrf-token': userBCsrf,
        },
      }
    );

    assert.equal(res.status, 409);
  });

  // --- Test 6 ---
  it('6. Capacity enforcement: session with maxParticipants=1 places subsequent user on WAITLIST', async () => {
    const startTime = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();

    // User A creates session with maxParticipants = 2
    const sessRes = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Exclusive 1-on-1 Cohort',
        startTime,
        endTime,
        maxParticipants: 2, // Host is participant 1, so 1 spot left
      }),
    });
    const sessJson = await sessRes.json();
    smallCapSessionId = sessJson.data.id;

    // User B takes the 2nd and final spot
    const resB = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/sessions/${smallCapSessionId}/register`,
      {
        method: 'POST',
        headers: { Cookie: userBCookie, 'x-csrf-token': userBCsrf },
      }
    );
    assert.equal(resB.status, 201);
    const jsonB = await resB.json();
    assert.equal(jsonB.data.status, 'REGISTERED');

    // User C joins the public group first
    await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/join`, {
      method: 'POST',
      headers: { Cookie: userCCookie, 'x-csrf-token': userCCsrf },
    });

    // User C attempts to register -> Should be placed on WAITLIST
    const resC = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/sessions/${smallCapSessionId}/register`,
      {
        method: 'POST',
        headers: { Cookie: userCCookie, 'x-csrf-token': userCCsrf },
      }
    );
    assert.equal(resC.status, 201);
    const jsonC = await resC.json();
    assert.equal(jsonC.data.status, 'WAITLIST');
  });

  // --- Test 7 ---
  it('7. Unregister from session promotes waitlisted user (User C) to REGISTERED', async () => {
    // User B unregisters
    const unregRes = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/sessions/${smallCapSessionId}/unregister`,
      {
        method: 'POST',
        headers: { Cookie: userBCookie, 'x-csrf-token': userBCsrf },
      }
    );
    assert.equal(unregRes.status, 200);

    // Verify participants list: User C should now be REGISTERED
    const listRes = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/sessions/${smallCapSessionId}/participants`,
      {
        headers: { Cookie: userACookie },
      }
    );
    const listJson = await listRes.json();
    const participantC = listJson.data.find((p: any) => p.userId === userCId);
    assert.ok(participantC);
    assert.equal(participantC.status, 'REGISTERED');
  });

  // --- Test 8 ---
  it('8. Session host (User A) marks verified attendance for participant (isVerifiedAttendance = true)', async () => {
    const res = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/sessions/${sessionId}/participants/${userBId}/attendance`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
          'x-csrf-token': userACsrf,
        },
        body: JSON.stringify({
          isVerifiedAttendance: true,
          status: 'ATTENDED',
          notes: 'Full active participation throughout session.',
        }),
      }
    );

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.isVerifiedAttendance, true);
    assert.equal(json.data.status, 'ATTENDED');
    assert.equal(json.data.notes, 'Full active participation throughout session.');
  });

  // --- Test 9 ---
  it('9. Non-host non-moderator (User B) cannot verify attendance (returns 403 Forbidden)', async () => {
    const res = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/sessions/${sessionId}/participants/${userAId}/attendance`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userBCookie,
          'x-csrf-token': userBCsrf,
        },
        body: JSON.stringify({
          isVerifiedAttendance: true,
        }),
      }
    );

    assert.equal(res.status, 403);
  });

  // --- Test 10 ---
  it('10. Shared resource: User A uploads NOTE resource', async () => {
    const res = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'React 19 Setup Notes',
        description: 'Key compiler flags and migration guide.',
        resourceType: 'NOTE',
        content: 'Use react-compiler for auto-memoization.',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.title, 'React 19 Setup Notes');
    assert.equal(json.data.resourceType, 'NOTE');
    resourceId = json.data.id;
  });

  // --- Test 11 ---
  it('11. Shared resource: User B uploads valid FILE resource (PDF base64)', async () => {
    // Valid PDF signature buffer in base64: %PDF-1.5 ...
    const pdfBase64 = Buffer.from('%PDF-1.5 test document content for skillswap').toString('base64');

    const res = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        title: 'React Design Patterns PDF',
        description: 'Comprehensive cheatsheet.',
        resourceType: 'FILE',
        fileName: 'patterns.pdf',
        fileData: pdfBase64,
        mimeType: 'application/pdf',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.title, 'React Design Patterns PDF');
    assert.ok(json.data.filePath);
    assert.equal(json.data.mimeType, 'application/pdf');
    fileResourceId = json.data.id;
  });

  // --- Test 12 ---
  it('12. Shared resource validation: Invalid MIME type (.exe) rejected with 400 Bad Request', async () => {
    const exeBase64 = Buffer.from('malicious executable simulation').toString('base64');

    const res = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        title: 'Insecure Binary',
        resourceType: 'FILE',
        fileName: 'virus.exe',
        fileData: exeBase64,
        mimeType: 'application/x-msdownload',
      }),
    });

    assert.equal(res.status, 400);
  });

  // --- Test 13 ---
  it('13. Download authorization: Active group member downloads file; non-member gets 403 Forbidden', async () => {
    // 1. User A in private group uploads a resource
    const privateRes = await fetch(`${baseUrl}/api/community/groups/${privateGroupId}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Confidential Masterclass Material',
        resourceType: 'FILE',
        fileName: 'private.pdf',
        fileData: Buffer.from('%PDF-1.4 private content').toString('base64'),
        mimeType: 'application/pdf',
      }),
    });
    const privateJson = await privateRes.json();
    const privateResId = privateJson.data.id;

    // 2. User B (not member of private group) attempts download -> 403 Forbidden
    const unauthRes = await fetch(
      `${baseUrl}/api/community/groups/${privateGroupId}/resources/${privateResId}/download`,
      {
        headers: { Cookie: userBCookie },
      }
    );
    assert.equal(unauthRes.status, 403);

    // 3. User A (owner/member) downloads successfully
    const authRes = await fetch(
      `${baseUrl}/api/community/groups/${privateGroupId}/resources/${privateResId}/download`,
      {
        headers: { Cookie: userACookie },
      }
    );
    assert.equal(authRes.status, 200);
  });

  // --- Test 14 ---
  it('14. Resource deletion: Uploader can delete; non-owner non-uploader receives 403 Forbidden', async () => {
    // User A attempts to delete User B's resource from test 11 (User A is group OWNER, so A CAN delete)
    // User C attempts to delete User B's resource -> C is standard member -> 403
    const unauthDelete = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/resources/${fileResourceId}`,
      {
        method: 'DELETE',
        headers: { Cookie: userCCookie, 'x-csrf-token': userCCsrf },
      }
    );
    assert.equal(unauthDelete.status, 403);

    // User B (the uploader) deletes their own resource
    const authDelete = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/resources/${fileResourceId}`,
      {
        method: 'DELETE',
        headers: { Cookie: userBCookie, 'x-csrf-token': userBCsrf },
      }
    );
    assert.equal(authDelete.status, 200);
  });

  // --- Test 15 ---
  it('15. Collaborative Tasks: Active member creates a task with priority and due date', async () => {
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        title: 'Build Interactive Kanban Component',
        description: 'Implement drag and drop or status select.',
        priority: 'HIGH',
        dueDate,
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.title, 'Build Interactive Kanban Component');
    assert.equal(json.data.status, 'TODO');
    assert.equal(json.data.priority, 'HIGH');
    taskId = json.data.id;
  });

  // --- Test 16 ---
  it('16. Task assignment: Assigning to non-group member fails; assigning to active member succeeds', async () => {
    // Non-member ID 99999 fails with 400
    const failRes = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Task for Ghost User',
        assigneeId: 99999,
      }),
    });
    assert.equal(failRes.status, 400);

    // Assigning task to User B (active member) succeeds
    const updateRes = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
          'x-csrf-token': userACsrf,
        },
        body: JSON.stringify({
          assigneeId: userBId,
        }),
      }
    );
    assert.equal(updateRes.status, 200);
    const updateJson = await updateRes.json();
    assert.equal(updateJson.data.assigneeId, userBId);
  });

  // --- Test 17 ---
  it('17. Task status transition: Member marks task COMPLETED (completedAt timestamp populated)', async () => {
    const res = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userBCookie,
          'x-csrf-token': userBCsrf,
        },
        body: JSON.stringify({
          status: 'COMPLETED',
        }),
      }
    );

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.status, 'COMPLETED');
    assert.ok(json.data.completedAt);
  });

  // --- Test 18 ---
  it('18. Group Milestones: Owner creates milestone and updates status to ACHIEVED', async () => {
    const targetDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const createRes = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/milestones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Conduct 5 Group Practice Workshops',
        description: 'Complete five full collaborative learning sessions.',
        targetDate,
      }),
    });

    assert.equal(createRes.status, 201);
    const createJson = await createRes.json();
    assert.equal(createJson.data.status, 'TODO');
    milestoneId = createJson.data.id;

    // Update to ACHIEVED
    const updateRes = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/milestones/${milestoneId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
          'x-csrf-token': userACsrf,
        },
        body: JSON.stringify({
          status: 'ACHIEVED',
          isVerified: true,
        }),
      }
    );

    assert.equal(updateRes.status, 200);
    const updateJson = await updateRes.json();
    assert.equal(updateJson.data.status, 'ACHIEVED');
    assert.equal(updateJson.data.isVerified, true);
    assert.ok(updateJson.data.completedAt);
  });

  // --- Test 19 ---
  it('19. Group Announcements & Chat: Owner posts pinned announcement; member sends and retrieves chat', async () => {
    // 1. Post Announcement
    const annRes = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/announcements`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userACookie,
          'x-csrf-token': userACsrf,
        },
        body: JSON.stringify({
          title: 'Welcome to Sprint 1 Workshops!',
          content: 'Please review shared resources and confirm session times.',
          isPinned: true,
        }),
      }
    );

    assert.equal(annRes.status, 201);
    const annJson = await annRes.json();
    assert.equal(annJson.data.isPinned, true);
    announcementId = annJson.data.id;

    // 2. User B sends chat message
    const chatSendRes = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userBCookie,
          'x-csrf-token': userBCsrf,
        },
        body: JSON.stringify({
          content: 'Excited for the upcoming React 19 workshop!',
        }),
      }
    );
    assert.equal(chatSendRes.status, 201);

    // 3. User A retrieves messages
    const chatListRes = await fetch(
      `${baseUrl}/api/community/groups/${publicGroupId}/messages`,
      {
        headers: { Cookie: userACookie },
      }
    );
    assert.equal(chatListRes.status, 200);
    const chatListJson = await chatListRes.json();
    assert.ok(chatListJson.data.length >= 1);
    const lastMsg = chatListJson.data[chatListJson.data.length - 1];
    assert.equal(lastMsg.content, 'Excited for the upcoming React 19 workshop!');
    assert.equal(lastMsg.sender.id, userBId);
  });

  // --- Test 20 ---
  it('20. Group Analytics: GET /:id/analytics returns live aggregated PostgreSQL statistics', async () => {
    const res = await fetch(`${baseUrl}/api/community/groups/${publicGroupId}/analytics`, {
      headers: { Cookie: userACookie },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.totalMembers >= 3); // User A, B, C
    assert.ok(json.data.totalSessions >= 2);
    assert.ok(json.data.verifiedAttendanceCount >= 1);
    assert.ok(json.data.totalTasks >= 1);
    assert.ok(json.data.completedTasks >= 1);
    assert.equal(json.data.taskCompletionRate, 100);
    assert.ok(json.data.totalMilestones >= 1);
    assert.equal(json.data.milestoneProgressRate, 100);
  });
});
