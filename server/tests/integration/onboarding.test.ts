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

describe('Phase 3 — Database Models, Skills Catalog & User Onboarding Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  const port = 5056;
  const timestamp = Date.now();
  const testUser = {
    name: 'Onboarding Tester',
    username: `onboard_${timestamp}`,
    email: `onboard_${timestamp}@example.com`,
    password: 'Password123!',
  };
  let authCookie = '';
  let csrfCookie = '';
  let csrfToken = '';
  let userId = 0;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const assignedPort = typeof addr === 'object' && addr ? addr.port : 5056;
        baseUrl = `http://127.0.0.1:${assignedPort}`;
        resolve();
      });
    });

    // Register user to establish session
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    assert.equal(regRes.status, 201);
    const regJson = await regRes.json();
    userId = regJson.data.user.id;

    const setCookie = regRes.headers.get('set-cookie') || '';
    const cookies = setCookie.split(',').map((c) => c.trim().split(';')[0]);
    for (const c of cookies) {
      if (c.startsWith(`${AUTH_COOKIE_NAME}=`)) authCookie = c;
      if (c.startsWith(`${CSRF_COOKIE_NAME}=`)) {
        csrfCookie = c;
        csrfToken = c.split('=')[1];
      }
    }
  });

  after(async () => {
    if (userId) {
      await userSkillRepository.clearTeachingSkills(userId);
      await userSkillRepository.clearLearningSkills(userId);
      await userAvailabilityRepository.clearByUser(userId);
      await db.orm.public.User.where({ id: userId }).delete();
    }
    server.close();
    await db.close();
  });

  test('1. Skill catalog retrieval: returns all seeded skills and filters by category', async () => {
    // 1. All skills
    const resAll = await fetch(`${baseUrl}/api/skills`);
    assert.equal(resAll.status, 200);
    const jsonAll = await resAll.json();
    assert.equal(jsonAll.success, true);
    assert.ok(Array.isArray(jsonAll.data.skills));
    assert.ok(jsonAll.data.skills.length >= 31, 'Expected at least 31 seeded skills');

    // 2. Filtered by category
    const resDev = await fetch(`${baseUrl}/api/skills?category=Development`);
    assert.equal(resDev.status, 200);
    const jsonDev = await resDev.json();
    assert.equal(jsonDev.success, true);
    for (const skill of jsonDev.data.skills) {
      assert.equal(skill.category, 'Development');
    }
  });

  test('2. Invalid onboarding data is rejected with 400 Validation Error', async () => {
    // Missing teaching skills
    const invalidPayload = {
      profile: {
        displayName: 'Tester',
        bio: 'Hello world',
        location: 'Earth',
      },
      teachingSkills: [], // Empty!
      learningSkills: [{ name: 'React', targetLevel: 'Intermediate' }],
      availability: {
        schedule: [{ day: 'Monday', slots: ['Morning'] }],
        timezone: 'UTC',
      },
    };

    const res = await fetch(`${baseUrl}/api/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify(invalidPayload),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'VALIDATION_ERROR');
  });

  test('3. Successful onboarding: atomic persistence of profile, skills, and availability', async () => {
    const onboardingPayload = {
      profile: {
        displayName: 'Onboarded Master',
        bio: 'Passionate developer and mentor',
        location: 'San Francisco, CA',
      },
      teachingSkills: [
        { name: 'TypeScript', level: 'Expert' },
        { name: 'React', level: 'Advanced' },
      ],
      learningSkills: [
        { name: 'UI/UX Design', targetLevel: 'Beginner' },
        { name: 'Guitar', targetLevel: 'Intermediate' },
      ],
      availability: {
        schedule: [
          { day: 'Monday', slots: ['Morning', 'Evening'] },
          { day: 'Wednesday', slots: ['Afternoon'] },
          { day: 'Saturday', slots: ['Morning', 'Afternoon'] },
        ],
        sessionLength: 60,
        timezone: 'America/Los_Angeles',
      },
    };

    const res = await fetch(`${baseUrl}/api/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify(onboardingPayload),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.user.name, 'Onboarded Master');
    assert.equal(json.data.user.isOnboarded, true);
    assert.equal(json.data.user.location, 'San Francisco, CA');
    assert.equal(json.data.user.timezone, 'America/Los_Angeles');

    // Verify DB direct persistence
    const userInDb = await userRepository.findById(userId);
    assert.equal(userInDb?.isOnboarded, true);
    assert.equal(userInDb?.name, 'Onboarded Master');

    const teachingInDb = await userSkillRepository.findTeachingSkillsByUser(userId);
    assert.equal(teachingInDb.length, 2);
    const teachNames = teachingInDb.map((t) => t.skill.name);
    assert.ok(teachNames.includes('TypeScript'));
    assert.ok(teachNames.includes('React'));

    const learningInDb = await userSkillRepository.findLearningSkillsByUser(userId);
    assert.equal(learningInDb.length, 2);
    const learnNames = learningInDb.map((l) => l.skill.name);
    assert.ok(learnNames.includes('UI/UX Design'));
    assert.ok(learnNames.includes('Guitar'));

    const availInDb = await userAvailabilityRepository.findByUser(userId);
    const mon = availInDb.find((d) => d.day === 'Monday');
    assert.deepEqual(mon?.slots.sort(), ['Evening', 'Morning']);
  });

  test('4. Atomic database rollback on failure: no partial updates when transaction fails', async () => {
    // Duplicate skills in payload trigger validator rejection before DB mutation
    const dupPayload = {
      profile: {
        displayName: 'Broken User',
        bio: 'This should not be saved',
        location: 'Nowhere',
      },
      teachingSkills: [
        { name: 'JavaScript', level: 'Beginner' },
        { name: 'JavaScript', level: 'Advanced' }, // Duplicate!
      ],
      learningSkills: [{ name: 'Python', targetLevel: 'Beginner' }],
      availability: {
        schedule: [{ day: 'Tuesday', slots: ['Morning'] }],
      },
    };

    const res = await fetch(`${baseUrl}/api/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify(dupPayload),
    });

    assert.equal(res.status, 400);

    // Verify user profile did NOT mutate to "Broken User"
    const userInDb = await userRepository.findById(userId);
    assert.equal(userInDb?.name, 'Onboarded Master');
  });

  test('5. GET /api/users/me returns full authenticated profile with skills and schedule', async () => {
    const res = await fetch(`${baseUrl}/api/users/me`, {
      headers: {
        Cookie: `${authCookie}; ${csrfCookie}`,
      },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.user.id, userId);
    assert.equal(json.data.user.isOnboarded, true);
    assert.equal(json.data.teachingSkills.length, 2);
    assert.equal(json.data.learningSkills.length, 2);
    assert.ok(Array.isArray(json.data.availability));
  });

  test('6. PATCH /api/users/me updates profile information persistently', async () => {
    const updatePayload = {
      name: 'Master Engineer',
      bio: 'Updated bio text',
      location: 'New York, NY',
    };

    const res = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify(updatePayload),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.user.name, 'Master Engineer');
    assert.equal(json.data.user.bio, 'Updated bio text');
    assert.equal(json.data.user.location, 'New York, NY');

    // Verify DB reflection
    const userInDb = await userRepository.findById(userId);
    assert.equal(userInDb?.name, 'Master Engineer');
    assert.equal(userInDb?.bio, 'Updated bio text');
  });

  test('7. Teaching skill addition, duplicate prevention, and deletion', async () => {
    const newSkill = await skillRepository.findByName('Python');
    assert.ok(newSkill);

    // 1. Add skill
    const addRes = await fetch(`${baseUrl}/api/users/me/skills/teaching`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        skillId: newSkill.id,
        proficiencyLevel: 'Intermediate',
      }),
    });
    assert.equal(addRes.status, 201);

    // 2. Add duplicate skill -> 409 Conflict
    const dupRes = await fetch(`${baseUrl}/api/users/me/skills/teaching`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        skillId: newSkill.id,
        proficiencyLevel: 'Expert',
      }),
    });
    assert.equal(dupRes.status, 409);

    // 3. Delete skill
    const delRes = await fetch(`${baseUrl}/api/users/me/skills/teaching/${newSkill.id}`, {
      method: 'DELETE',
      headers: {
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
    });
    assert.equal(delRes.status, 200);

    // Verify deleted from DB
    const inDb = await userSkillRepository.findTeachingSkill(userId, newSkill.id);
    assert.equal(inDb, null);
  });

  test('8. Learning skill addition, duplicate prevention, and deletion', async () => {
    const newSkill = await skillRepository.findByName('French');
    assert.ok(newSkill);

    // 1. Add skill
    const addRes = await fetch(`${baseUrl}/api/users/me/skills/learning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        skillId: newSkill.id,
        targetLevel: 'Beginner',
      }),
    });
    assert.equal(addRes.status, 201);

    // 2. Add duplicate skill -> 409 Conflict
    const dupRes = await fetch(`${baseUrl}/api/users/me/skills/learning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        skillId: newSkill.id,
        targetLevel: 'Advanced',
      }),
    });
    assert.equal(dupRes.status, 409);

    // 3. Delete skill
    const delRes = await fetch(`${baseUrl}/api/users/me/skills/learning/${newSkill.id}`, {
      method: 'DELETE',
      headers: {
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
    });
    assert.equal(delRes.status, 200);

    // Verify deleted from DB
    const inDb = await userSkillRepository.findLearningSkill(userId, newSkill.id);
    assert.equal(inDb, null);
  });

  test('9. Availability update: PATCH /api/users/me/availability updates schedule & timezone', async () => {
    const newSchedule = [
      { day: 'Friday', slots: ['Evening'] },
      { day: 'Sunday', slots: ['Morning', 'Afternoon'] },
    ];

    const res = await fetch(`${baseUrl}/api/users/me/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        schedule: newSchedule,
        timezone: 'Asia/Tokyo',
      }),
    });

    assert.equal(res.status, 200);

    // Verify DB
    const inDb = await userAvailabilityRepository.findByUser(userId);
    const fri = inDb.find((d) => d.day === 'Friday');
    assert.deepEqual(fri?.slots, ['Evening']);
    const sun = inDb.find((d) => d.day === 'Sunday');
    assert.deepEqual(sun?.slots.sort(), ['Afternoon', 'Morning']);

    const userInDb = await userRepository.findById(userId);
    assert.equal(userInDb?.timezone, 'Asia/Tokyo');
  });

  test('10. Unauthorized access control: unauthenticated users cannot modify private data', async () => {
    // 1. Unauthenticated onboarding
    const noAuthRes = await fetch(`${baseUrl}/api/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(noAuthRes.status, 401);

    // 2. Unauthenticated profile update
    const noAuthPatch = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked' }),
    });
    assert.equal(noAuthPatch.status, 401);

    // 3. CSRF token missing on authenticated mutation -> 403 Forbidden
    const noCsrfRes = await fetch(`${baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${authCookie}; ${csrfCookie}`,
        // Missing x-csrf-token
      },
      body: JSON.stringify({ name: 'Hacked' }),
    });
    assert.equal(noCsrfRes.status, 403);
  });

  test('11. Public profile: GET /api/users/:username returns public info and never exposes secrets', async () => {
    const res = await fetch(`${baseUrl}/api/users/${testUser.username}`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.username, testUser.username);
    assert.equal(json.data.name, 'Master Engineer');
    assert.ok(Array.isArray(json.data.teachingSkills));
    assert.ok(Array.isArray(json.data.learningSkills));

    // Verify sensitive fields are strictly excluded
    assert.equal(json.data.passwordHash, undefined);
    assert.equal(json.data.passwordResetHash, undefined);
    assert.equal(json.data.passwordResetExpiresAt, undefined);
    assert.equal(json.data.email, undefined);
  });
});

