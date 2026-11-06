import { skillRepository, type SkillRecord } from '../repositories/skill.repository.js';

export class SkillService {
  async getAllSkills(category?: string): Promise<SkillRecord[]> {
    return skillRepository.findAll(category);
  }
}

export const skillService = new SkillService();

