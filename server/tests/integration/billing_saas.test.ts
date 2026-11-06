import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import crypto from 'node:crypto';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';
import { seedPlans } from '../../src/prisma/seedPlans.js';

describe('Phase 17 — SaaS Monetization & Subscription Management Integration Tests', { concurrency: 1 }, () => {
  let server: Server;
  let baseUrl: string;
  const timestamp = Date.now();

  const userA = {
    name: 'Alice Learner',
    username: `alice_sub_${timestamp}`,
    email: `alice_sub_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const userB = {
    name: 'Bob Mentor',
    username: `bob_sub_${timestamp}`,
    email: `bob_sub_${timestamp}@example.com`,
    password: 'Password123!',
  };

  const adminUser = {
    name: 'Billing SuperAdmin',
    username: `admin_bill_${timestamp}`,
    email: `admin_bill_${timestamp}@example.com`,
    password: 'Password123!',
  };

  let userAId: number;
  let userBId: number;
  let adminId: number;

  let cookieA = '';
  let csrfA = '';

  let cookieB = '';
  let csrfB = '';

  let adminCookie = '';
  let adminCsrf = '';

  // Skill IDs for swap quota testing
  let skillReactId: number;
  let skillUiUxId: number;

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

  function generateMockSignature(payload: string, secret = 'mock_webhook_secret'): string {
    const t = Math.floor(Date.now() / 1000).toString();
    const hash = crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
    return `t=${t},v1=${hash}`;
  }

  before(async () => {
    // Ensure subscription plans exist in PostgreSQL
    await seedPlans();

    const app = createApp();
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // 1. Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA),
    });
    const dataA = await resA.json();
    assert.equal(resA.status, 201);
    userAId = dataA.data.user.id;
    const credsA = extractCookieAndCsrf(resA);
    cookieA = credsA.auth;
    csrfA = credsA.csrf;

    // 2. Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB),
    });
    const dataB = await resB.json();
    assert.equal(resB.status, 201);
    userBId = dataB.data.user.id;
    const credsB = extractCookieAndCsrf(resB);
    cookieB = credsB.auth;
    csrfB = credsB.csrf;

    // 3. Register Admin User and promote
    const resAdm = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminUser),
    });
    const dataAdm = await resAdm.json();
    assert.equal(resAdm.status, 201);
    adminId = dataAdm.data.user.id;
    const credsAdm = extractCookieAndCsrf(resAdm);
    adminCookie = credsAdm.auth;
    adminCsrf = credsAdm.csrf;
    await userRepository.updateRole(adminId, 'ADMIN');

    // Retrieve skill catalog IDs for tests
    const skillsRes = await fetch(`${baseUrl}/api/skills`);
    const skillsData = await skillsRes.json();
    const skills = skillsData.data?.skills || skillsData.data || [];
    skillReactId = skills.find((s: any) => s.name.toLowerCase().includes('react'))?.id || 1;
    skillUiUxId = skills.find((s: any) => s.name.toLowerCase().includes('design') || s.name.toLowerCase().includes('ui'))?.id || 2;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // --- 1. Plans & Entitlements ---
  test('1. Pricing: Public endpoint returns active plans (FREE, PRO, PREMIUM)', async () => {
    const res = await fetch(`${baseUrl}/api/billing/plans`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.plans));
    assert.ok(body.data.plans.length >= 3);

    const codes = body.data.plans.map((p: any) => p.code);
    assert.ok(codes.includes('FREE'));
    assert.ok(codes.includes('PRO'));
    assert.ok(codes.includes('PREMIUM'));
  });

  test('2. Entitlements: New registered user defaults to FREE tier entitlements', async () => {
    const res = await fetch(`${baseUrl}/api/billing/subscription`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.entitlements.planCode, 'FREE');
    assert.equal(body.data.entitlements.entitlements.maxActiveSwaps, 3);
    assert.equal(body.data.entitlements.entitlements.advancedFilters, false);
  });

  // --- 2. Checkout Creation & Validation ---
  test('3. Checkout: Reject checkout request for FREE plan (400)', async () => {
    const res = await fetch(`${baseUrl}/api/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        planCode: 'FREE',
        billingCycle: 'MONTHLY',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('4. Checkout: Reject invalid billing cycle or plan (400)', async () => {
    const res = await fetch(`${baseUrl}/api/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        planCode: 'INVALID_PLAN',
        billingCycle: 'WEEKLY',
      }),
    });
    assert.equal(res.status, 400);
  });

  test('5. Checkout: Create valid checkout session for PRO plan (201)', async () => {
    const res = await fetch(`${baseUrl}/api/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
      body: JSON.stringify({
        planCode: 'PRO',
        billingCycle: 'MONTHLY',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.sessionId);
    assert.ok(body.data.checkoutUrl);
  });

  // --- 3. Webhook Signature & Idempotency ---
  test('6. Webhook: Reject request with invalid or missing signature (400)', async () => {
    const payload = JSON.stringify({
      id: `evt_invalid_${Date.now()}`,
      type: 'checkout.session.completed',
      data: { object: {} },
    });

    const res = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=123,v1=tampered_signature',
      },
      body: payload,
    });
    assert.equal(res.status, 400);
  });

  test('7. Webhook: Subscription activation (checkout.session.completed)', async () => {
    const eventId = `evt_act_${Date.now()}`;
    const payloadObj = {
      id: eventId,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_${Date.now()}`,
          customer: `cus_${userAId}`,
          subscription: `sub_stripe_${userAId}_${Date.now()}`,
          client_reference_id: userAId.toString(),
          metadata: {
            userId: userAId.toString(),
            planCode: 'PRO',
            billingCycle: 'MONTHLY',
          },
          amount_total: 1500,
        },
      },
    };
    const rawPayload = JSON.stringify(payloadObj);
    const signature = generateMockSignature(rawPayload);

    const res = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: rawPayload,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.processed, true);

    // Verify User A subscription is now ACTIVE PRO
    const subRes = await fetch(`${baseUrl}/api/billing/subscription`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(subRes.status, 200);
    const subBody = await subRes.json();
    assert.equal(subBody.data.subscription.status, 'ACTIVE');
    assert.equal(subBody.data.subscription.planCode, 'PRO');
    assert.equal(subBody.data.entitlements.entitlements.maxActiveSwaps, 10);
    assert.equal(subBody.data.entitlements.entitlements.advancedFilters, true);
  });

  test('8. Webhook: Idempotency suppresses duplicate webhook events', async () => {
    const eventId = `evt_dup_${Date.now()}`;
    const payloadObj = {
      id: eventId,
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: userAId.toString(),
          metadata: { userId: userAId.toString(), planCode: 'PRO', billingCycle: 'MONTHLY' },
          amount_total: 1500,
        },
      },
    };
    const raw = JSON.stringify(payloadObj);
    const sig = generateMockSignature(raw);

    // First attempt
    const res1 = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
      body: raw,
    });
    assert.equal(res1.status, 200);

    // Second attempt with identical eventId
    const res2 = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
      body: raw,
    });
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.data.duplicate, true);
  });

  // --- 4. Quota Enforcement & Reciprocal Swap Validation ---
  test('9. Quota Enforcement: Free plan limit (3) blocks excessive active swap proposals (403)', async () => {
    // Set up skills for User B (User B teaches React, wants to learn UI/UX)
    // User A teaches UI/UX, wants to learn React
    await db.orm.public.UserTeachingSkill.create({
      userId: userBId,
      skillId: skillReactId,
      proficiencyLevel: 'Expert',
    });
    await db.orm.public.UserLearningSkill.create({
      userId: userBId,
      skillId: skillUiUxId,
      targetLevel: 'Intermediate',
    });
    await db.orm.public.User.where({ id: userBId }).update({ isOnboarded: true });

    // Create a third user C to receive proposals from User B
    const userCRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie Recipient',
        username: `charlie_${Date.now()}`,
        email: `charlie_${Date.now()}@example.com`,
        password: 'Password123!',
      }),
    });
    const dataC = await userCRes.json();
    const userCId = dataC.data.user.id;

    await db.orm.public.UserTeachingSkill.create({
      userId: userCId,
      skillId: skillUiUxId,
      proficiencyLevel: 'Expert',
    });
    await db.orm.public.UserLearningSkill.create({
      userId: userCId,
      skillId: skillReactId,
      targetLevel: 'Intermediate',
    });
    await db.orm.public.User.where({ id: userCId }).update({ isOnboarded: true });


    // Directly create 3 real recipient users and seed 3 active proposals for User B (on FREE plan)
    for (let i = 1; i <= 3; i++) {
      const recUser = await userRepository.createUser({
        name: `Recipient ${i}`,
        username: `rec_${Date.now()}_${i}`,
        email: `rec_${Date.now()}_${i}@example.com`,
        passwordHash: 'dummy_hash',
      });

      await db.orm.public.SwapRequest.create({
        senderId: userBId,
        receiverId: recUser.id,
        senderSkillId: skillReactId,
        receiverSkillId: skillUiUxId,
        status: 'PENDING',
        message: `Seed swap proposal ${i}`,
      });
    }

    // Now User B (Free plan) attempts to create 4th swap proposal to User C -> should receive 403 Forbidden
    const res = await fetch(`${baseUrl}/api/swap-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
        'x-csrf-token': csrfB,
      },
      body: JSON.stringify({
        receiverId: userCId,
        senderSkillId: skillReactId,
        receiverSkillId: skillUiUxId,
        message: 'Fourth proposal attempting to exceed Free tier quota',
      }),
    });

    const status = res.status;
    const text = await res.text();
    assert.equal(status, 403, `Should be rejected with 403 Quota Exceeded but got ${status}: ${text}`);
    const body = JSON.parse(text);
    assert.equal(body.success, false);
    assert.ok(body.error.message.includes('limit'));


  });

  // --- 5. Lifecycle: Renewals, Payment Failures, Cancellations ---
  test('10. Lifecycle: Successful subscription renewal (invoice.paid)', async () => {
    // Get User A subscription
    const sub = await db.orm.public.UserSubscription.where({ userId: userAId }).first();
    assert.ok(sub);

    const eventId = `evt_ren_${Date.now()}`;
    const payloadObj = {
      id: eventId,
      type: 'invoice.paid',
      data: {
        object: {
          id: `in_ren_${Date.now()}`,
          subscription: sub.providerSubscriptionId,
          amount_paid: 1500,
          customer: sub.providerCustomerId,
        },
      },
    };
    const raw = JSON.stringify(payloadObj);
    const sig = generateMockSignature(raw);

    const res = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
      body: raw,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.processed, true);
  });

  test('11. Lifecycle: Payment failure transitions subscription to PAST_DUE (invoice.payment_failed)', async () => {
    const sub = await db.orm.public.UserSubscription.where({ userId: userAId }).first();
    assert.ok(sub);

    const eventId = `evt_fail_${Date.now()}`;
    const payloadObj = {
      id: eventId,
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: `in_fail_${Date.now()}`,
          subscription: sub.providerSubscriptionId,
          amount_due: 1500,
          customer: sub.providerCustomerId,
        },
      },
    };
    const raw = JSON.stringify(payloadObj);
    const sig = generateMockSignature(raw);

    const res = await fetch(`${baseUrl}/api/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
      body: raw,
    });
    assert.equal(res.status, 200);

    const subUpdated = await db.orm.public.UserSubscription.where({ userId: userAId }).first();
    assert.equal(subUpdated?.status, 'PAST_DUE');
  });

  test('12. Lifecycle: User can schedule subscription cancellation at period end', async () => {
    // Reactivate to ACTIVE first
    await db.orm.public.UserSubscription.where({ userId: userAId }).update({
      status: 'ACTIVE',
      currentPeriodEnd: new Date(Date.now() + 86400000).toISOString() as any,
    });

    const res = await fetch(`${baseUrl}/api/billing/cancel`, {
      method: 'POST',
      headers: {
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const sub = await db.orm.public.UserSubscription.where({ userId: userAId }).first();
    assert.equal(sub?.cancelAtPeriodEnd, true);
  });

  test('13. Lifecycle: User can reactivate scheduled cancellation', async () => {
    const res = await fetch(`${baseUrl}/api/billing/reactivate`, {
      method: 'POST',
      headers: {
        Cookie: cookieA,
        'x-csrf-token': csrfA,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const sub = await db.orm.public.UserSubscription.where({ userId: userAId }).first();
    assert.equal(sub?.cancelAtPeriodEnd, false);
  });

  // --- 6. Invoices & Billing History ---
  test('14. Invoices: User can view their own billing history and invoices', async () => {
    const res = await fetch(`${baseUrl}/api/billing/invoices`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 1);
    assert.equal(body.data[0].userId, userAId);
  });

  test('15. IDOR Defense: User B sees only their own empty/distinct invoices', async () => {
    const res = await fetch(`${baseUrl}/api/billing/invoices`, {
      headers: { Cookie: cookieB },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    // User B has not purchased anything, so their invoices array is empty
    assert.equal(body.data.length, 0);
  });

  // --- 7. Admin Billing Overview & Analytics ---
  test('16. Admin Analytics: Standard user receives 403 on admin billing overview', async () => {
    const res = await fetch(`${baseUrl}/api/admin/billing/overview`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(res.status, 403);
  });

  test('17. Admin Analytics: Administrator retrieves MRR, ARR, and subscriber metrics', async () => {
    const res = await fetch(`${baseUrl}/api/admin/billing/overview`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(typeof body.data.mrrCents === 'number');
    assert.ok(typeof body.data.arrCents === 'number');
    assert.ok(typeof body.data.activeSubscribers === 'number');
    assert.ok(typeof body.data.conversionRate === 'number');
    assert.ok(body.data.tiers !== undefined);
  });
});
