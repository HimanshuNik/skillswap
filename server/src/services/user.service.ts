import { userRepository, type SafeUser } from '../repositories/user.repository.js';
import { skillRepository } from '../repositories/skill.repository.js';
import {
  userSkillRepository,
  type UserTeachingSkillWithSkill,
  type UserLearningSkillWithSkill,
} from '../repositories/userSkill.repository.js';
import { userAvailabilityRepository, type DaySchedule } from '../repositories/userAvailability.repository.js';
import {
  type UpdateProfileInput,
  type AddTeachingSkillInput,
  type AddLearningSkillInput,
  type UpdateAvailabilityInput,
} from '../validators/user.validator.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import type { FullUserProfile } from './onboarding.service.js';

export interface PublicUserProfile {
  id: number;
  name: string;
  username: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  averageRating: number;
  totalReviews: number;
  completedSessions: number;
  createdAt: string;
  teachingSkills: UserTeachingSkillWithSkill[];
  learningSkills: UserLearningSkillWithSkill[];
}

export class UserService {
  async getFullProfile(userId: number): Promise<FullUserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const safeUser = userRepository.toSafeUser(user);
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

  async updateProfile(userId: number, input: UpdateProfileInput): Promise<SafeUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await userRepository.updateProfile(userId, input);
    return userRepository.toSafeUser(updated!);
  }

  async getPublicProfile(username: string): Promise<PublicUserProfile> {
    const user = await userRepository.findByUsername(username);
    if (!user || user.isActive === false) {
      throw new NotFoundError(`User with username '${username}' not found`);
    }

    const teachingSkills = await userSkillRepository.findTeachingSkillsByUser(user.id);
    const learningSkills = await userSkillRepository.findLearningSkillsByUser(user.id);

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      location: user.location,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      averageRating: user.averageRating,
      totalReviews: user.totalReviews,
      completedSessions: user.completedSessions,
      createdAt: user.createdAt,
      teachingSkills,
      learningSkills,
    };
  }

  async addTeachingSkill(userId: number, input: AddTeachingSkillInput): Promise<UserTeachingSkillWithSkill> {
    let skillId = input.skillId;
    if (!skillId && input.skillName) {
      const skill = await skillRepository.findOrCreate(input.skillName);
      skillId = skill.id;
    }

    if (!skillId) {
      throw new NotFoundError('Skill not found');
    }

    const skill = await skillRepository.findById(skillId);
    if (!skill) {
      throw new NotFoundError('Skill not found in catalog');
    }

    const existing = await userSkillRepository.findTeachingSkill(userId, skillId);
    if (existing) {
      throw new ConflictError('You already have this skill in your teaching list');
    }

    const created = await userSkillRepository.addTeachingSkill(userId, skillId, input.proficiencyLevel);

    return {
      id: created.id,
      userId,
      skillId,
      proficiencyLevel: input.proficiencyLevel,
      skill,
    };
  }

  async removeTeachingSkill(userId: number, skillId: number): Promise<void> {
    const removed = await userSkillRepository.removeTeachingSkill(userId, skillId);
    if (!removed) {
      throw new NotFoundError('Teaching skill not found');
    }
  }

  async addLearningSkill(userId: number, input: AddLearningSkillInput): Promise<UserLearningSkillWithSkill> {
    let skillId = input.skillId;
    if (!skillId && input.skillName) {
      const skill = await skillRepository.findOrCreate(input.skillName);
      skillId = skill.id;
    }

    if (!skillId) {
      throw new NotFoundError('Skill not found');
    }

    const skill = await skillRepository.findById(skillId);
    if (!skill) {
      throw new NotFoundError('Skill not found in catalog');
    }

    const existing = await userSkillRepository.findLearningSkill(userId, skillId);
    if (existing) {
      throw new ConflictError('You already have this skill in your learning list');
    }

    const created = await userSkillRepository.addLearningSkill(userId, skillId, input.targetLevel);

    return {
      id: created.id,
      userId,
      skillId,
      targetLevel: input.targetLevel,
      skill,
    };
  }

  async removeLearningSkill(userId: number, skillId: number): Promise<void> {
    const removed = await userSkillRepository.removeLearningSkill(userId, skillId);
    if (!removed) {
      throw new NotFoundError('Learning skill not found');
    }
  }

  async updateAvailability(userId: number, input: UpdateAvailabilityInput): Promise<DaySchedule[]> {
    if (input.timezone) {
      await userRepository.updateProfile(userId, { timezone: input.timezone });
    }
    return userAvailabilityRepository.saveSchedule(userId, input.schedule);
  }
}

export const userService = new UserService();

