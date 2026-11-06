import { db } from './db.js';
import { logger } from '../config/logger.js';

interface SkillAliasSeed {
  canonicalName: string;
  alias: string;
  similarityScore: number;
  relationshipType: 'ALIAS' | 'RELATED' | 'PARENT_CHILD';
}

export const SKILL_ALIASES_SEED: SkillAliasSeed[] = [
  // React
  { canonicalName: 'React', alias: 'React.js', similarityScore: 1.0, relationshipType: 'ALIAS' },
  { canonicalName: 'React', alias: 'ReactJS', similarityScore: 1.0, relationshipType: 'ALIAS' },
  { canonicalName: 'React', alias: 'React Dev', similarityScore: 0.95, relationshipType: 'ALIAS' },
  { canonicalName: 'React', alias: 'React Development', similarityScore: 0.95, relationshipType: 'ALIAS' },
  { canonicalName: 'React', alias: 'React Native', similarityScore: 0.75, relationshipType: 'RELATED' },

  // JavaScript
  { canonicalName: 'JavaScript', alias: 'JS', similarityScore: 1.0, relationshipType: 'ALIAS' },
  { canonicalName: 'JavaScript', alias: 'ECMAScript', similarityScore: 0.95, relationshipType: 'ALIAS' },
  { canonicalName: 'JavaScript', alias: 'JavaScript ES6+', similarityScore: 0.95, relationshipType: 'ALIAS' },
  { canonicalName: 'JavaScript', alias: 'Modern JavaScript', similarityScore: 0.95, relationshipType: 'ALIAS' },

  // TypeScript
  { canonicalName: 'TypeScript', alias: 'TS', similarityScore: 1.0, relationshipType: 'ALIAS' },

  // Node.js
  { canonicalName: 'Node.js', alias: 'NodeJS', similarityScore: 1.0, relationshipType: 'ALIAS' },
  { canonicalName: 'Node.js', alias: 'Node', similarityScore: 0.95, relationshipType: 'ALIAS' },

  // UI/UX Design
  { canonicalName: 'UI/UX Design', alias: 'User Interface Design', similarityScore: 0.95, relationshipType: 'ALIAS' },
  { canonicalName: 'UI/UX Design', alias: 'User Experience Design', similarityScore: 0.95, relationshipType: 'ALIAS' },
  { canonicalName: 'UI/UX Design', alias: 'UI Design', similarityScore: 0.9, relationshipType: 'ALIAS' },
  { canonicalName: 'UI/UX Design', alias: 'UX Design', similarityScore: 0.9, relationshipType: 'ALIAS' },
  { canonicalName: 'UI/UX Design', alias: 'UX/UI Design', similarityScore: 1.0, relationshipType: 'ALIAS' },

  // Python
  { canonicalName: 'Python', alias: 'Python3', similarityScore: 1.0, relationshipType: 'ALIAS' },
  { canonicalName: 'Python', alias: 'Python Programming', similarityScore: 0.95, relationshipType: 'ALIAS' },

  // SEO
  { canonicalName: 'SEO', alias: 'Search Engine Optimization', similarityScore: 1.0, relationshipType: 'ALIAS' },

  // Digital Marketing
  { canonicalName: 'Digital Marketing', alias: 'Online Marketing', similarityScore: 0.95, relationshipType: 'ALIAS' },
  { canonicalName: 'Digital Marketing', alias: 'Internet Marketing', similarityScore: 0.9, relationshipType: 'ALIAS' },
];

export async function seedSkillAliases() {
  logger.info('Starting Skill Aliases seeding...');
  let added = 0;
  let skipped = 0;

  for (const item of SKILL_ALIASES_SEED) {
    const canonical = await db.orm.public.Skill.where({ name: item.canonicalName }).first();
    if (!canonical) {
      continue;
    }

    const existing = await db.orm.public.SkillAlias.where({ alias: item.alias }).first();
    if (existing) {
      skipped++;
      continue;
    }

    await db.orm.public.SkillAlias.create({
      alias: item.alias,
      canonicalSkillId: canonical.id,
      similarityScore: item.similarityScore,
      relationshipType: item.relationshipType,
      isApproved: true,
    });
    added++;
  }

  logger.info({ added, skipped }, 'Skill Aliases seeding completed successfully.');
}

if (process.argv[1]?.endsWith('seedSkillAliases.ts')) {
  seedSkillAliases()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Skill Aliases seeding failed');
      process.exit(1);
    });
}
