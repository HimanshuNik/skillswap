import type { Request, Response, NextFunction } from 'express';
import { skillService } from '../services/skill.service.js';

export class SkillController {
  async getSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const skills = await skillService.getAllSkills(category);
      res.status(200).json({
        success: true,
        data: {
          skills,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const skillController = new SkillController();

