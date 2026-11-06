import { db } from './db.js';
import { logger } from '../config/logger.js';

export interface AchievementSeed {
  code: string;
  title: string;
  description: string;
  category: 'LEARNING' | 'TEACHING' | 'COMMUNITY' | 'ROADMAP';
  badgeIcon: string;
  xpReward: number;
  criteriaType: string;
  criteriaThreshold: number;
}

export const INITIAL_ACHIEVEMENTS: AchievementSeed[] = [
  {
    code: 'FIRST_SWAP',
    title: 'First Swap Completed',
    description: 'Completed your very first reciprocal skill exchange session',
    category: 'COMMUNITY',
    badgeIcon: 'Handshake',
    xpReward: 100,
    criteriaType: 'SWAP_COUNT',
    criteriaThreshold: 1,
  },
  {
    code: 'DEDICATED_LEARNER',
    title: 'Dedicated Learner',
    description: 'Completed 10 verified learning sessions with community mentors',
    category: 'LEARNING',
    badgeIcon: 'BookOpen',
    xpReward: 150,
    criteriaType: 'SESSION_LEARN_COUNT',
    criteriaThreshold: 10,
  },
  {
    code: 'HELPFUL_MENTOR',
    title: 'Helpful Mentor',
    description: 'Completed 10 verified teaching sessions sharing your expertise',
    category: 'TEACHING',
    badgeIcon: 'Award',
    xpReward: 150,
    criteriaType: 'SESSION_TEACH_COUNT',
    criteriaThreshold: 10,
  },
  {
    code: 'SKILL_EXPLORER',
    title: 'Skill Explorer',
    description: 'Practiced 3 distinct learning skills across the platform',
    category: 'LEARNING',
    badgeIcon: 'Compass',
    xpReward: 100,
    criteriaType: 'DISTINCT_LEARN_SKILLS',
    criteriaThreshold: 3,
  },
  {
    code: 'KNOWLEDGE_SHARER',
    title: 'Master Mentor',
    description: 'Delivered 25 verified teaching sessions to help peers grow',
    category: 'TEACHING',
    badgeIcon: 'Flame',
    xpReward: 300,
    criteriaType: 'SESSION_TEACH_COUNT',
    criteriaThreshold: 25,
  },
  {
    code: 'LEARNING_CHAMPION',
    title: 'Learning Champion',
    description: 'Completed 50 verified learning sessions on SkillSwap',
    category: 'LEARNING',
    badgeIcon: 'Trophy',
    xpReward: 500,
    criteriaType: 'SESSION_LEARN_COUNT',
    criteriaThreshold: 50,
  },
  {
    code: 'ROADMAP_FINISHER',
    title: 'Roadmap Finisher',
    description: 'Completed all milestones of a personalized learning roadmap',
    category: 'ROADMAP',
    badgeIcon: 'Milestone',
    xpReward: 200,
    criteriaType: 'ROADMAP_COMPLETE',
    criteriaThreshold: 1,
  },
  {
    code: 'COMMUNITY_CONTRIBUTOR',
    title: 'Community Contributor',
    description: 'Submitted 5 ratings and constructive feedback reviews',
    category: 'COMMUNITY',
    badgeIcon: 'Star',
    xpReward: 75,
    criteriaType: 'REVIEW_COUNT',
    criteriaThreshold: 5,
  },
  {
    code: 'STREAK_WARRIOR',
    title: 'Consistency Champion',
    description: 'Maintained an active 7-day learning streak',
    category: 'LEARNING',
    badgeIcon: 'Zap',
    xpReward: 120,
    criteriaType: 'STREAK_DAYS',
    criteriaThreshold: 7,
  },
  {
    code: 'GOAL_CRUSHER',
    title: 'Goal Crusher',
    description: 'Successfully reached 3 personal learning goals',
    category: 'LEARNING',
    badgeIcon: 'Target',
    xpReward: 150,
    criteriaType: 'GOAL_COMPLETE_COUNT',
    criteriaThreshold: 3,
  },
];

export async function seedAchievements(): Promise<void> {
  logger.info('Seeding gamification achievements catalog...');

  for (const ach of INITIAL_ACHIEVEMENTS) {
    const existing = await db.orm.public.Achievement.where({
      code: ach.code,
    }).first();

    if (!existing) {
      await db.orm.public.Achievement.create({
        code: ach.code,
        title: ach.title,
        description: ach.description,
        category: ach.category,
        badgeIcon: ach.badgeIcon,
        xpReward: ach.xpReward,
        criteriaType: ach.criteriaType,
        criteriaThreshold: ach.criteriaThreshold,
      });
      logger.info({ code: ach.code }, 'Created achievement');
    } else {
      await db.orm.public.Achievement.where({ id: existing.id }).update({
        title: ach.title,
        description: ach.description,
        category: ach.category,
        badgeIcon: ach.badgeIcon,
        xpReward: ach.xpReward,
        criteriaType: ach.criteriaType,
        criteriaThreshold: ach.criteriaThreshold,
      });
      logger.info({ code: ach.code }, 'Updated achievement');
    }
  }

  logger.info('Achievements seeding complete.');
}

if (process.argv[1]?.endsWith('seedAchievements.ts')) {
  seedAchievements()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Failed to seed achievements');
      process.exit(1);
    });
}

