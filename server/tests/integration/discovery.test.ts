import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { skillRepository } from '../../src/repositories/skill.repository.js';
import { userSkillRepository } from '../../src/repositories/userSkill.repository.js';
import { userAvailabilityRepository } from '../../src/repositories/userAvailability.repository.js';

describe('Phase 4 — User Discovery & Two-Way Matching Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  const port = 5057;
  const timestamp = Date.now();

  let userA_Id = 0;
  let userB_Id = 0;
  let userC_Id = 0;
  let userD_Id = 0; // Incomplete onboarding

  let userA_Cookie = '';
  let userA_Csrf = '';

  let reactSkillId = 0;
  let uiuxSkillId = 0;
  let guitarSkillId = 0;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const assignedPort = typeof addr === 'object' && addr ? addr.port : 5057;
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

    // Register User A (Account A)
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Developer',
        username: `disc_alice_${timestamp}`,
        email: `disc_alice_${timestamp}@example.com`,
        password: 'Password123!',
      }),
    });
    assert.equal(resA.status, 201);
    const jsonA = await resA.json();
    userA_Id = jsonA.data.user.id;

    const setCookie = resA.headers.get('set-cookie') || '';
    for (const c of setCookie.split(',').map((s) => s.trim().split(';')[0])) {
      if (c.startsWith(`${AUTH_COOKIE_NAME}=`)) userA_Cookie = c;
      if (c.startsWith(`${CSRF_COOKIE_NAME}=`)) userA_Csrf = c;
    }

    // Set User A skills and availability (Teaches React, Wants UI/UX)
    await userSkillRepository.addTeachingSkill(userA_Id, reactSkillId, 'Advanced');
    await userSkillRepository.addLearningSkill(userA_Id, uiuxSkillId, 'Beginner');
    await userAvailabilityRepository.saveSchedule(userA_Id, [
      { day: 'Monday', slots: ['Morning'] },
    ]);
    await userRepository.setOnboarded(userA_Id, true);

    // Register User B (Account B - Reciprocal match for A)
    const userB = await userRepository.createUser({
      name: 'Bob Designer',
      username: `bob_${timestamp}`,
      email: `bob_${timestamp}@example.com`,
      passwordHash: 'placeholder',
    });
    userB_Id = userB.id;
    await userSkillRepository.addTeachingSkill(userB_Id, uiuxSkillId, 'Expert');
    await userSkillRepository.addLearningSkill(userB_Id, reactSkillId, 'Intermediate');
    await userAvailabilityRepository.saveSchedule(userB_Id, [
      { day: 'Monday', slots: ['Morning'] },
      { day: 'Tuesday', slots: ['Afternoon'] },
    ]);
    await userRepository.setOnboarded(userB_Id, true);

    // Register User C (Guitar player, no matching skills with Alice)
    const userC = await userRepository.createUser({
      name: 'Charlie Musician',
      username: `charlie_${timestamp}`,
      email: `charlie_${timestamp}@example.com`,
      passwordHash: 'placeholder',
    });
    userC_Id = userC.id;
    await userSkillRepository.addTeachingSkill(userC_Id, guitarSkillId, 'Intermediate');
    await userRepository.setOnboarded(userC_Id, true);

    // Register User D (Not onboarded yet)
    const userD = await userRepository.createUser({
      name: 'Dennis Newbie',
      username: `dennis_${timestamp}`,
      email: `dennis_${timestamp}@example.com`,
      passwordHash: 'placeholder',
    });
    userD_Id = userD.id;
    // isOnboarded remains false
  });

  after(async () => {
    for (const uid of [userA_Id, userB_Id, userC_Id, userD_Id]) {
      if (uid) {
        await userSkillRepository.clearTeachingSkills(uid);
        await userSkillRepository.clearLearningSkills(uid);
        await userAvailabilityRepository.clearByUser(uid);
        await db.orm.public.User.where({ id: uid }).delete();
      }
    }
    server.closeAllConnections?.();
    server.close();
  });

  test('1. User Discovery (GET /api/users) excludes current user and un-onboarded users', async () => {
    const res = await fetch(`${baseUrl}/api/users?limit=500`, {
      headers: { Cookie: `${userA_Cookie}; ${userA_Csrf}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);

    const userIds = json.data.users.map((u: any) => u.id);
    assert.ok(!userIds.includes(userA_Id), 'Current user A must be excluded from discovery');
    assert.ok(!userIds.includes(userD_Id), 'Un-onboarded user D must be excluded from discovery');
    assert.ok(userIds.includes(userB_Id), 'User B must be visible in discovery');
    assert.ok(userIds.includes(userC_Id), 'User C must be visible in discovery');
  });

  test('2. Discovery search matches name, location, and teaching skills', async () => {
    // Search by teaching skill "Guitar"
    const resSkill = await fetch(`${baseUrl}/api/users?search=Guitar`, {
      headers: { Cookie: `${userA_Cookie}; ${userA_Csrf}` },
    });
    assert.equal(resSkill.status, 200);
    const jsonSkill = await resSkill.json();
    assert.ok(jsonSkill.data.users.length >= 1);
    assert.ok(jsonSkill.data.users.some((u: any) => u.id === userC_Id));

    // Search by name "Bob"
    const resName = await fetch(`${baseUrl}/api/users?search=Bob&limit=500`, {
      headers: { Cookie: `${userA_Cookie}; ${userA_Csrf}` },
    });
    assert.equal(resName.status, 200);
    const jsonName = await resName.json();
    assert.ok(jsonName.data.users.length >= 1);
    assert.ok(jsonName.data.users.some((u: any) => u.id === userB_Id));
  });

  test('3. Discovery category filter returns only users teaching skills in that category', async () => {
    const resDesign = await fetch(`${baseUrl}/api/users?category=Design&limit=500`, {
      headers: { Cookie: `${userA_Cookie}; ${userA_Csrf}` },
    });
    assert.equal(resDesign.status, 200);
    const jsonDesign = await resDesign.json();
    const ids = jsonDesign.data.users.map((u: any) => u.id);
    assert.ok(ids.includes(userB_Id));
    assert.ok(!ids.includes(userC_Id));
  });

  test('4. Discovery pagination limits results and provides pagination metadata', async () => {
    const res = await fetch(`${baseUrl}/api/users?limit=1&page=1`, {
      headers: { Cookie: `${userA_Cookie}; ${userA_Csrf}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.users.length, 1);
    assert.equal(json.data.pagination.page, 1);
    assert.equal(json.data.pagination.limit, 1);
    assert.ok(json.data.pagination.total >= 2);
    assert.ok(json.data.pagination.totalPages >= 2);
  });

  test('5. Two-Way Matching (GET /api/matches): Alice sees Bob with high reciprocal match and explanation', async () => {
    const res = await fetch(`${baseUrl}/api/matches`, {
      headers: { Cookie: `${userA_Cookie}; ${userA_Csrf}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.matches.length >= 1);

    const matchBob = json.data.matches.find((m: any) => m.userId === userB_Id);
    assert.ok(matchBob, 'Bob must be recommended in matches');
    assert.equal(matchBob.isReciprocal, true);
    assert.ok(matchBob.compatibilityScore >= 80, `Expected score >= 80, got ${matchBob.compatibilityScore}`);
    assert.deepEqual(matchBob.theyCanTeachYou, ['UI/UX Design']);
    assert.deepEqual(matchBob.youCanTeachThem, ['React']);
    assert.ok(matchBob.matchingDays.includes('Monday'));
    assert.ok(matchBob.explanation.includes('Bob Designer'));
    assert.ok(matchBob.explanation.includes('Monday'));
  });

  test('6. Matching excludes current user and un-onboarded users', async () => {
    const res = await fetch(`${baseUrl}/api/matches`, {
      headers: { Cookie: `${userA_Cookie}; ${userA_Csrf}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    const matchedUserIds = json.data.matches.map((m: any) => m.userId);
    assert.ok(!matchedUserIds.includes(userA_Id), 'Current user Alice cannot match with herself');
    assert.ok(!matchedUserIds.includes(userD_Id), 'Un-onboarded Dennis cannot be in matches');
  });

  test('7. GET /api/matches requires authentication (401 without cookie)', async () => {
    const res = await fetch(`${baseUrl}/api/matches`);
    assert.equal(res.status, 401);
  });
});

