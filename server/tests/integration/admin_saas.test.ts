import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { emailService } from '../../src/services/email.service.js';
import { emailJobRepository } from '../../src/repositories/emailJob.repository.js';
import { runReminderWorkerOnce } from '../../src/jobs/reminder.worker.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';

describe('Phase 16 — SaaS-Ready Platform Administration Integration Tests', { concurrency: 1 }, () => {
  let server: Server;
  let baseUrl: string;
  const timestamp = Date.now();

  const standardUser = {
    name: 'Standard User',
    username: `user_std_${timestamp}`,
    email: `user_std_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const moderatorUser = {
    name: 'Platform Moderator',
    username: `mod_${timestamp}`,
    email: `mod_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const adminUser = {
    name: 'Super Admin',
    username: `admin_${timestamp}`,
    email: `admin_${timestamp}@example.com`,
    password: 'Password123!',
  };

  let standardId: number;
  let moderatorId: number;
  let adminId: number;

  let standardCookie = '';
  let standardCsrf = '';

  let modCookie = '';
  let modCsrf = '';

  let adminCookie = '';
  let adminCsrf = '';

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
    const app = createApp();
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // 1. Register Standard User
    const resStd = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(standardUser),
    });
    const stdData = await resStd.json();
    assert.equal(resStd.status, 201, `Failed to register standard user: ${JSON.stringify(stdData)}`);
    standardId = stdData.data.user.id;
    const stdCreds = extractCookieAndCsrf(resStd);
    standardCookie = stdCreds.auth;
    standardCsrf = stdCreds.csrf;

    // 2. Register Moderator User and promote
    const resMod = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moderatorUser),
    });
    const modData = await resMod.json();
    assert.equal(resMod.status, 201, `Failed to register mod: ${JSON.stringify(modData)}`);
    moderatorId = modData.data.user.id;
    await userRepository.updateRole(moderatorId, 'MODERATOR');
    const modCreds = extractCookieAndCsrf(resMod);
    modCookie = modCreds.auth;
    modCsrf = modCreds.csrf;

    // 3. Register Admin User and promote
    const resAdm = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminUser),
    });
    const admData = await resAdm.json();
    assert.equal(resAdm.status, 201, `Failed to register admin: ${JSON.stringify(admData)}`);
    adminId = admData.data.user.id;
    await userRepository.updateRole(adminId, 'ADMIN');
    const admCreds = extractCookieAndCsrf(resAdm);
    adminCookie = admCreds.auth;
    adminCsrf = admCreds.csrf;
  });

  after(async () => {
    if (server) {
      server.closeAllConnections?.();
      server.close();
    }
  });

  // --- 1. RBAC Tests ---
  test('RBAC: Standard user is denied access to admin overview (403)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: {
        Cookie: standardCookie,
      },
    });
    assert.equal(res.status, 403);
  });

  test('RBAC: Moderator user can access admin overview', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: {
        Cookie: modCookie,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.users.total >= 3);
  });

  test('RBAC: Moderator cannot perform admin-only actions (suspend user -> 403)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${standardId}/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: modCookie,
        'x-csrf-token': modCsrf,
      },
      body: JSON.stringify({ reason: 'Mod attempt' }),
    });
    assert.equal(res.status, 403);
  });

  test('RBAC: Super admin can access admin overview and stats', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: {
        Cookie: adminCookie,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.users.active === 'number');
    assert.ok(typeof body.data.swaps.total === 'number');
  });

  // --- 2. User Reporting & Moderation Tests ---
  let reportId: number;

  test('User Reporting: Standard user can submit a report against another user', async () => {
    const res = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: standardCookie,
        'x-csrf-token': standardCsrf,
      },
      body: JSON.stringify({
        reportedId: moderatorId,
        targetType: 'USER',
        category: 'HARASSMENT',
        reason: 'Inappropriate language in chat messages during learning session',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'OPEN');
    reportId = body.data.id;
  });

  test('User Reporting: Reject self-reporting (400)', async () => {
    const res = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: standardCookie,
        'x-csrf-token': standardCsrf,
      },
      body: JSON.stringify({
        reportedId: standardId,
        targetType: 'USER',
        category: 'SPAM',
        reason: 'Trying to report myself',
      }),
    });
    assert.equal(res.status, 400);
  });

  test('User Reporting: Reject duplicate report within 24 hours (400)', async () => {
    const res = await fetch(`${baseUrl}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: standardCookie,
        'x-csrf-token': standardCsrf,
      },
      body: JSON.stringify({
        reportedId: moderatorId,
        targetType: 'USER',
        category: 'HARASSMENT',
        reason: 'Duplicate harassment report submission',
      }),
    });
    assert.equal(res.status, 400);
  });

  test('Moderation: Moderator can view reports and dismiss or resolve a report', async () => {
    const listRes = await fetch(`${baseUrl}/api/admin/reports?status=OPEN`, {
      headers: { Cookie: modCookie },
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(listBody.data.reports.length > 0);

    // Dismiss report
    const dismissRes = await fetch(`${baseUrl}/api/admin/reports/${reportId}/dismiss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: modCookie,
        'x-csrf-token': modCsrf,
      },
      body: JSON.stringify({ resolutionNotes: 'Reviewed conversation logs; no infraction detected.' }),
    });
    assert.equal(dismissRes.status, 200);
    const dismissBody = await dismissRes.json();
    assert.equal(dismissBody.success, true);
  });

  // --- 3. User Suspension & Account Lockout ---
  test('User Management: Admin cannot suspend self (400)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${adminId}/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({ reason: 'Self suspension attempt' }),
    });
    assert.equal(res.status, 400);
  });

  test('User Management: Admin suspends standard user', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${standardId}/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({ reason: 'Repeated violation of platform guidelines' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.isSuspended, true);
  });

  test('User Management: Suspended user is rejected on subsequent authenticated requests (403)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: standardCookie },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    const errMsg = body.error?.message || body.message || '';
    assert.ok(errMsg.includes('suspended'));
  });

  test('User Management: Admin reactivates suspended user', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${standardId}/reactivate`, {
      method: 'POST',
      headers: {
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.isSuspended, false);

    // Verify user can now authenticate normally
    const authRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: standardCookie },
    });
    assert.equal(authRes.status, 200);
  });

  // --- 4. Skill Catalog Management ---
  let testSkillId: number;
  test('Skill Management: Admin can create and soft-disable skills', async () => {
    const skillName = `Skill_${timestamp}`;
    const createRes = await fetch(`${baseUrl}/api/admin/skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        name: skillName,
        category: 'Programming',
        description: 'Test skill description',
      }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    testSkillId = created.data.id;

    // Soft disable skill
    const patchRes = await fetch(`${baseUrl}/api/admin/skills/${testSkillId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({ isDisabled: true }),
    });
    assert.equal(patchRes.status, 200);

    // Verify public skills endpoint excludes disabled skills
    const publicRes = await fetch(`${baseUrl}/api/skills`);
    const publicBody = await publicRes.json();
    const skillsList = publicBody.data?.skills || publicBody.data || [];
    assert.ok(!skillsList.some((s: any) => s.id === testSkillId));
  });

  // --- 5. Platform Settings & Registration Toggle ---
  test('Platform Settings: Toggle registration off and verify registration is blocked (403)', async () => {
    // Disable registration
    const updateRes = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        settings: {
          registration_enabled: 'false',
        },
      }),
    });
    assert.equal(updateRes.status, 200);

    // Attempt registration
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Blocked User',
        username: `blocked_${timestamp}`,
        email: `blocked_${timestamp}@example.com`,
        password: 'Password123!',
      }),
    });
    assert.equal(regRes.status, 403);

    // Restore registration
    await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
        'x-csrf-token': adminCsrf,
      },
      body: JSON.stringify({
        settings: {
          registration_enabled: 'true',
        },
      }),
    });
  });

  // --- 6. Transactional Email Queue & Reminder Worker ---
  test('Transactional Email: Enqueue, process pending jobs, and reminder worker execution', async () => {
    // Enqueue a job
    const job = await emailService.enqueue({
      to: 'test_student@example.com',
      toName: 'Student Alpha',
      template: 'WELCOME',
      subject: 'Welcome to SkillSwap Test',
      payload: { name: 'Student Alpha' },
    });
    assert.ok(job);
    assert.equal(job.status, 'PENDING');

    // Process pending jobs
    const batchResult = await emailService.processPendingJobs(10);
    assert.ok(batchResult.processed >= 1);
    assert.ok(batchResult.succeeded >= 1);

    // Run reminder worker once
    const reminderResult = await runReminderWorkerOnce();
    assert.ok(typeof reminderResult.scanned === 'number');
    assert.ok(typeof reminderResult.remindersQueued === 'number');
  });

  // --- 7. Audit Logging Verification ---
  test('Audit Logs: Sensitive admin operations are recorded with actor and action', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audit?limit=100`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.logs.length >= 2);

    const actions = body.data.logs.map((l: any) => l.action);
    assert.ok(actions.includes('USER_SUSPEND'), 'USER_SUSPEND action should be recorded');
    assert.ok(actions.includes('USER_REACTIVATE'), 'USER_REACTIVATE action should be recorded');
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

