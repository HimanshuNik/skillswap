import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../src/prisma/db.js';

describe('Prisma v8 Database Models CRUD & Integrity', () => {
  const timestamp = Date.now();
  const testEmail = `test_phase1_${timestamp}@example.com`;
  const testUsername = `user_${timestamp}`;
  let createdUserId: number | null = null;
  let createdSkillId: number | null = null;

  after(async () => {
    // Ensure test data cleanup
    if (createdUserId) {
      await db.orm.public.User.where({ id: createdUserId }).delete();
    }
    if (createdSkillId) {
      await db.orm.public.Skill.where({ id: createdSkillId }).delete();
    }
    await db.close();
  });

  test('creates and retrieves a User with Phase 1 fields', async () => {
    const user = await db.orm.public.User.create({
      email: testEmail,
      username: testUsername,
      name: 'Phase 1 Tester',
      passwordHash: 'argon2id_placeholder_hash',
      bio: 'Lead engineer foundation verification',
      location: 'Test City',
      isOnboarded: false,
      averageRating: 0,
      totalReviews: 0,
      completedSessions: 0,
    });

    assert.ok(user.id);
    createdUserId = user.id;

    const fetched = await db.orm.public.User.where({ id: user.id }).first();
    assert.ok(fetched);
    assert.equal(fetched.email, testEmail);
    assert.equal(fetched.isOnboarded, false);
    assert.equal(fetched.averageRating, 0);
  });

  test('creates and retrieves a Skill entity', async () => {
    const skillName = `TestSkill_${timestamp}`;
    const skill = await db.orm.public.Skill.create({
      name: skillName,
      category: 'Development',
    });

    assert.ok(skill.id);
    createdSkillId = skill.id;

    const fetched = await db.orm.public.Skill.where({ id: skill.id }).first();
    assert.ok(fetched);
    assert.equal(fetched.name, skillName);
    assert.equal(fetched.category, 'Development');
  });

  test('links a UserTeachingSkill relation between User and Skill', async () => {
    assert.ok(createdUserId);
    assert.ok(createdSkillId);

    const teachingSkill = await db.orm.public.UserTeachingSkill.create({
      userId: createdUserId,
      skillId: createdSkillId,
      proficiencyLevel: 'Advanced',
    });

    assert.ok(teachingSkill.id);

    const retrieved = await db.orm.public.UserTeachingSkill
      .where({ userId: createdUserId, skillId: createdSkillId })
      .first();

    assert.ok(retrieved);
    assert.equal(retrieved.proficiencyLevel, 'Advanced');

    // Clean up join record
    await db.orm.public.UserTeachingSkill.where({ id: teachingSkill.id }).delete();
  });
});

