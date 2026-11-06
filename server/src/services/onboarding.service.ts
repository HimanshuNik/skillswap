import { db } from '../prisma/db.js';
import { userRepository, type SafeUser } from '../repositories/user.repository.js';
import { skillRepository } from '../repositories/skill.repository.js';
import { userSkillRepository, type UserTeachingSkillWithSkill, type UserLearningSkillWithSkill } from '../repositories/userSkill.repository.js';
import { userAvailabilityRepository, type DaySchedule } from '../repositories/userAvailability.repository.js';
import { type OnboardingInput } from '../validators/onboarding.validator.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../config/logger.js';

export interface FullUserProfile {
  user: SafeUser;
  teachingSkills: UserTeachingSkillWithSkill[];
  learningSkills: UserLearningSkillWithSkill[];
  availability: DaySchedule[];
}

export class OnboardingService {
  async completeOnboarding(userId: number, input: OnboardingInput): Promise<FullUserProfile> {
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    logger.info(`Starting atomic onboarding for user ${userId} (${existingUser.email})`);

    // Execute everything inside an atomic database transaction
    await db.transaction(async (tx) => {
      // 1. Update User Profile & set isOnboarded = true
      await tx.orm.public.User.where({ id: userId }).update({
        name: input.profile.displayName,
        bio: input.profile.bio || null,
        location: input.profile.location || null,
        timezone: input.availability.timezone || 'UTC',
        isOnboarded: true,
      });

      // 2. Persist Teaching Skills
      // Remove any prior teaching skills for idempotency
      await userSkillRepository.clearTeachingSkills(userId, tx);
      for (const item of input.teachingSkills) {
        const skill = await skillRepository.findOrCreate(item.name, 'General', tx);
        await userSkillRepository.addTeachingSkill(userId, skill.id, item.level, tx);
      }

      // 3. Persist Learning Skills
      // Remove any prior learning skills for idempotency
      await userSkillRepository.clearLearningSkills(userId, tx);
      for (const item of input.learningSkills) {
        const skill = await skillRepository.findOrCreate(item.name, 'General', tx);
        await userSkillRepository.addLearningSkill(userId, skill.id, item.targetLevel, tx);
      }

      // 4. Persist Availability Schedule
      await userAvailabilityRepository.saveSchedule(userId, input.availability.schedule, tx);
    });

    logger.info(`Atomic onboarding completed successfully for user ${userId}`);

    // Fetch the updated full profile state
    const updatedUser = await userRepository.findById(userId);
    const safeUser = userRepository.toSafeUser(updatedUser!);
    const teachingSkills = await userSkillRepository.findTeachingSkillsByUser(userId);
    const learningSkills = await userSkillRepository.findLearningSkillsByUser(userId);
    const availability = await userAvailabilityRepository.findByUser(userId);

    return {
      user: safeUser,
      teachingSkills,
      learningSkills,
      availability,
    };
  }
}

export const onboardingService = new OnboardingService();

