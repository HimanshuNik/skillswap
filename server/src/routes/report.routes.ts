import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/', (req, res, next) => reportController.createReport(req, res, next));

export default router;

