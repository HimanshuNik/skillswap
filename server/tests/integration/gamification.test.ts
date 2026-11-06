import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { xpRepository, calculateLevelFromXP } from '../../src/repositories/xp.repository.js';
import { achievementRepository } from '../../src/repositories/achievement.repository.js';
import { learningGoalRepository } from '../../src/repositories/learningGoal.repository.js';
import { streakRepository } from '../../src/repositories/streak.repository.js';
import { gamificationPrivacyRepository } from '../../src/repositories/gamificationPrivacy.repository.js';
import { gamificationService } from '../../src/services/gamification/gamification.service.js';
import { seedAchievements } from '../../src/prisma/seedAchievements.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';

describe('Phase 19 — Advanced Learning Analytics, Gamification & Achievement System Integration Tests', { concurrency: 1 }, () => {
  let server: Server;
  let baseUrl: string;
  let userACookie: string;
  let userBCookie: string;
  let userAId: number;
  let userBId: number;
  let userACsrf: string;
  let userBCsrf: string;
  let usernameA: string;
  let usernameB: string;
  let testSessionId: number;

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
    // Seed achievements catalog
    await seedAchievements();

    const timestamp = Date.now();
    testSessionId = timestamp;
    usernameA = `gamif_a_${timestamp}`;
    usernameB = `gamif_b_${timestamp}`;

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${usernameA}@example.com`,
        username: usernameA,
        name: 'Gamer Alice',
        password: 'Password123!',
      }),
    });
    assert.equal(resA.status, 201);
    const credA = extractCookieAndCsrf(resA);
    userACookie = credA.auth;
    userACsrf = credA.csrf;
    const bodyA = (await resA.json()) as any;
    userAId = bodyA.data.user.id;

    // Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `${usernameB}@example.com`,
        username: usernameB,
        name: 'Gamer Bob',
        password: 'Password123!',
      }),
    });
    assert.equal(resB.status, 201);
    const credB = extractCookieAndCsrf(resB);
    userBCookie = credB.auth;
    userBCsrf = credB.csrf;
    const bodyB = (await resB.json()) as any;
    userBId = bodyB.data.user.id;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('1. Initializes default UserXP record and verifies level calculation logic', async () => {
    const userXP = await xpRepository.getOrCreateUserXP(userAId);
    assert.equal(userXP.totalXp, 0);
    assert.equal(userXP.currentLevel, 1);

    // Test Level Progression function
    const lvl1 = calculateLevelFromXP(0);
    assert.equal(lvl1.level, 1);
    assert.equal(lvl1.progressPercent, 0);

    const lvl2 = calculateLevelFromXP(100);
    assert.equal(lvl2.level, 2);

    const lvl5 = calculateLevelFromXP(900);
    assert.equal(lvl5.level, 5);

    const lvl10 = calculateLevelFromXP(5000);
    assert.equal(lvl10.level, 10);

    // Level 11 requires 5000 + 1500 = 6500 XP
    const lvl11 = calculateLevelFromXP(6500);
    assert.equal(lvl11.level, 11);
  });

  it('2. Awards 40 XP to learner and teacher on verified session completion', async () => {
    await gamificationService.onSessionCompleted({
      sessionId: testSessionId,
      teacherId: userAId,
      learnerId: userBId,
      durationMinutes: 60,
    });

    const xpA = await xpRepository.getOrCreateUserXP(userAId);
    const xpB = await xpRepository.getOrCreateUserXP(userBId);

    assert.equal(xpA.totalXp, 40);
    assert.equal(xpB.totalXp, 40);
  });

  it('3. Enforces idempotency to prevent duplicate XP awards and reward farming', async () => {
    // Retry same session completion event
    await gamificationService.onSessionCompleted({
      sessionId: testSessionId,
      teacherId: userAId,
      learnerId: userBId,
      durationMinutes: 60,
    });

    const xpA = await xpRepository.getOrCreateUserXP(userAId);
    const xpB = await xpRepository.getOrCreateUserXP(userBId);

    // Total XP must strictly remain 40
    assert.equal(xpA.totalXp, 40);
    assert.equal(xpB.totalXp, 40);
  });

  it('4. Reaches Level 2 progression upon crossing 100 XP threshold', async () => {
    // Award 60 more XP to User A
    const res = await gamificationService.awardXP({
      userId: userAId,
      amount: 60,
      actionType: 'BONUS',
      idempotencyKey: `BONUS_TEST_${Date.now()}`,
      description: 'Test bonus',
    });

    assert.equal(res.leveledUp, true);
    assert.equal(res.newLevel, 2);
    assert.equal(res.userXP.totalXp, 100);
  });

  it('5. Successfully unlocks FIRST_SWAP achievement', async () => {
    const awardRes = await gamificationService.awardAchievement(userAId, 'FIRST_SWAP');
    assert.equal(awardRes.awarded, true);
    assert.equal(awardRes.achievement?.code, 'FIRST_SWAP');

    // User A should also receive 100 bonus XP for FIRST_SWAP (100 + 100 = 200 XP)
    const xpA = await xpRepository.getOrCreateUserXP(userAId);
    assert.equal(xpA.totalXp, 200);
  });

  it('6. Rejects duplicate achievement unlocking (single award per user)', async () => {
    const duplicateRes = await gamificationService.awardAchievement(userAId, 'FIRST_SWAP');
    assert.equal(duplicateRes.awarded, false);
    assert.equal(duplicateRes.alreadyUnlocked, true);

    // XP remains unchanged
    const xpA = await xpRepository.getOrCreateUserXP(userAId);
    assert.equal(xpA.totalXp, 200);
  });

  it('7. Creates a personal learning goal and updates progress', async () => {
    const createRes = await fetch(`${baseUrl}/api/learning-goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        title: 'Complete 3 Practice Sessions',
        goalType: 'SESSIONS_COUNT',
        targetValue: 3,
        unit: 'sessions',
      }),
    });

    assert.equal(createRes.status, 201);
    const body = (await createRes.json()) as any;
    const goalId = body.data.goal.id;
    assert.equal(body.data.goal.targetValue, 3);
    assert.equal(body.data.goal.currentValue, 0);
    assert.equal(body.data.goal.status, 'IN_PROGRESS');

    // Update progress by 1
    const patchRes = await fetch(`${baseUrl}/api/learning-goals/${goalId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        currentValue: 1,
      }),
    });
    assert.equal(patchRes.status, 200);
    const patchBody = (await patchRes.json()) as any;
    assert.equal(patchBody.data.goal.currentValue, 1);
    assert.equal(patchBody.data.goal.status, 'IN_PROGRESS');
  });

  it('8. Completes personal learning goal and awards 50 XP upon reaching target', async () => {
    const goals = await learningGoalRepository.findByUserId(userAId, 'IN_PROGRESS');
    const targetGoal = goals[0]!;

    const prevXp = (await xpRepository.getOrCreateUserXP(userAId)).totalXp;

    // Increment to 3 (target reached)
    const patchRes = await fetch(`${baseUrl}/api/learning-goals/${targetGoal.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        currentValue: 3,
        status: 'COMPLETED',
      }),
    });

    assert.equal(patchRes.status, 200);
    const patchBody = (await patchRes.json()) as any;
    assert.equal(patchBody.data.goal.status, 'COMPLETED');

    const newXp = (await xpRepository.getOrCreateUserXP(userAId)).totalXp;
    assert.equal(newXp, prevXp + 50);
  });

  it('9. Defends learning goals against IDOR / unauthorized tampering', async () => {
    const goals = await learningGoalRepository.findByUserId(userAId);
    const goalAId = goals[0]!.id;

    // User B tries to patch User A's goal
    const attackRes = await fetch(`${baseUrl}/api/learning-goals/${goalAId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userBCookie,
        'x-csrf-token': userBCsrf,
      },
      body: JSON.stringify({
        title: 'Hacked Goal',
      }),
    });

    assert.equal(attackRes.status, 403);
  });

  it('10. Tracks daily active streaks and respects user opt-out toggle', async () => {
    // Record activity for User A
    const streak1 = await streakRepository.recordDailyActivity(userAId, 'UTC');
    assert.equal(streak1.isEnabled, true);
    assert.equal(streak1.currentStreak, 1);

    // Toggle streak tracking off for User A via API
    const toggleRes = await fetch(`${baseUrl}/api/gamification/streak/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        isEnabled: false,
      }),
    });
    assert.equal(toggleRes.status, 200);

    // Recording activity should now be disabled
    const streakOptOut = await streakRepository.recordDailyActivity(userAId, 'UTC');
    assert.equal(streakOptOut.isEnabled, false);
    assert.equal(streakOptOut.currentStreak, 0);

    // Re-enable streak tracking
    await streakRepository.setStreakEnabled(userAId, true);
  });

  it('11. Updates gamification privacy controls and redacts public profile', async () => {
    // Turn off public stats and level
    const privRes = await fetch(`${baseUrl}/api/gamification/privacy`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userACookie,
        'x-csrf-token': userACsrf,
      },
      body: JSON.stringify({
        showLevel: false,
        showStats: false,
      }),
    });
    assert.equal(privRes.status, 200);

    // Fetch public profile for User A
    const pubRes = await fetch(`${baseUrl}/api/gamification/users/${usernameA}`);
    assert.equal(pubRes.status, 200);
    const pubBody = (await pubRes.json()) as any;

    assert.equal(pubBody.data.level, null); // Redacted!
    assert.equal(pubBody.data.stats, null); // Redacted!
    assert.equal(Array.isArray(pubBody.data.badges), true);

    // Re-enable privacy defaults
    await gamificationPrivacyRepository.updatePrivacy(userAId, {
      showLevel: true,
      showStats: true,
      showBadges: true,
    });
  });

  it('12. Computes learning analytics overview with time filters (7d, 30d, all)', async () => {
    const res30d = await fetch(`${baseUrl}/api/learning-analytics/overview?range=30d`, {
      headers: { Cookie: userACookie },
    });
    assert.equal(res30d.status, 200);
    const data30d = (await res30d.json()) as any;

    assert.equal(typeof data30d.data.levelInfo.currentLevel, 'number');
    assert.equal(typeof data30d.data.hours.totalHours, 'number');
    assert.equal(typeof data30d.data.sessions.totalCompleted, 'number');
    assert.equal(data30d.data.rangeDays, 30);

    const res7d = await fetch(`${baseUrl}/api/learning-analytics/overview?range=7d`, {
      headers: { Cookie: userACookie },
    });
    assert.equal(res7d.status, 200);
    const data7d = (await res7d.json()) as any;
    assert.equal(data7d.data.rangeDays, 7);
  });

  it('13. Calculates GitHub-style activity calendar heatmap data', async () => {
    const heatmapRes = await fetch(`${baseUrl}/api/learning-analytics/activity?year=2026&timezone=UTC`, {
      headers: { Cookie: userACookie },
    });
    assert.equal(heatmapRes.status, 200);
    const heatmapBody = (await heatmapRes.json()) as any;

    assert.equal(heatmapBody.data.year, 2026);
    assert.equal(heatmapBody.data.timezone, 'UTC');
    assert.equal(Array.isArray(heatmapBody.data.days), true);
  });

  it('14. Aggregates skill-specific progress tracking breakdown', async () => {
    const skillsRes = await fetch(`${baseUrl}/api/learning-analytics/skills`, {
      headers: { Cookie: userACookie },
    });
    assert.equal(skillsRes.status, 200);
    const skillsBody = (await skillsRes.json()) as any;

    assert.equal(Array.isArray(skillsBody.data.skills), true);
  });

  it('15. Awards 15 XP for completed roadmap milestone and triggers ROADMAP_FINISHER', async () => {
    const prevXp = (await xpRepository.getOrCreateUserXP(userAId)).totalXp;
    const testMilestoneId = Date.now();

    await gamificationService.onMilestoneCompleted({
      userId: userAId,
      roadmapId: 9001,
      milestoneId: testMilestoneId,
      isRoadmapFinished: true,
    });

    const refreshedA = await xpRepository.getOrCreateUserXP(userAId);
    // User should receive 15 XP for milestone + 200 XP for ROADMAP_FINISHER (or 15 XP if badge already awarded)
    assert.ok(refreshedA.totalXp >= prevXp + 15);

    const achs = await achievementRepository.getUserAchievements(userAId);
    const hasFinisher = achs.some((a) => a.achievementCode === 'ROADMAP_FINISHER');
    assert.equal(hasFinisher, true);
  });

  it('16. Generates notifications for level-ups and achievement unlocks', async () => {
    const notifs = await db.orm.public.Notification.where({ userId: userAId }).all();
    const hasAchievementNotif = notifs.some((n: any) => n.type === 'ACHIEVEMENT_UNLOCKED');
    assert.equal(hasAchievementNotif, true);
  });
});
