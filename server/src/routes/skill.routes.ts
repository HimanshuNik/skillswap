import { Router } from 'express';
import { skillController } from '../controllers/skill.controller.js';

export const skillRouter = Router();

// GET /api/skills - Public skill catalog
skillRouter.get('/', (req, res, next) => skillController.getSkills(req, res, next));

