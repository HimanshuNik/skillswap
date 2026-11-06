import { db } from './db.js';
import { logger } from '../config/logger.js';

export const INITIAL_SKILLS = [
  // Development
  { name: 'JavaScript', category: 'Development' },
  { name: 'TypeScript', category: 'Development' },
  { name: 'React', category: 'Development' },
  { name: 'Node.js', category: 'Development' },
  { name: 'Python', category: 'Development' },
  { name: 'Java', category: 'Development' },
  { name: 'Full Stack Web Development', category: 'Development' },
  { name: 'Mobile App Development', category: 'Development' },

  // Design
  { name: 'UI/UX Design', category: 'Design' },
  { name: 'Graphic Design', category: 'Design' },
  { name: 'Product Design', category: 'Design' },
  { name: 'Figma', category: 'Design' },
  { name: 'Motion Graphics', category: 'Design' },

  // Creative
  { name: 'Video Editing', category: 'Creative' },
  { name: 'Photography', category: 'Creative' },
  { name: 'Guitar', category: 'Creative' },
  { name: 'Music Production', category: 'Creative' },
  { name: 'Creative Writing', category: 'Creative' },

  // Business
  { name: 'Digital Marketing', category: 'Business' },
  { name: 'Public Speaking', category: 'Business' },
  { name: 'Project Management', category: 'Business' },
  { name: 'Data Analysis', category: 'Business' },
  { name: 'Excel', category: 'Business' },
  { name: 'SEO', category: 'Business' },

  // Languages
  { name: 'English', category: 'Languages' },
  { name: 'Spanish', category: 'Languages' },
  { name: 'French', category: 'Languages' },
  { name: 'German', category: 'Languages' },
  { name: 'Mandarin', category: 'Languages' },
  { name: 'Japanese', category: 'Languages' },
  { name: 'Hindi', category: 'Languages' },
];

export async function seedSkills() {
  logger.info('Starting safe skill catalog seeding...');
  let addedCount = 0;
  let existingCount = 0;

  for (const skill of INITIAL_SKILLS) {
    const existing = await db.orm.public.Skill.where({ name: skill.name }).select('id').first();
    if (!existing) {
      await db.orm.public.Skill.create({
        name: skill.name,
        category: skill.category,
      });
      addedCount++;
    } else {
      existingCount++;
    }
  }

  logger.info(`Skill seeding completed. Added: ${addedCount}, Already existing: ${existingCount}`);
  return { addedCount, existingCount, total: INITIAL_SKILLS.length };
}

// If executed directly
if (process.argv[1]?.includes('seed')) {
  seedSkills()
    .then(async () => {
      await db.close();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error({ err }, 'Failed to seed skills');
      await db.close();
      process.exit(1);
    });
}
