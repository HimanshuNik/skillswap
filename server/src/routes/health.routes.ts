import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';

export const healthRouter = Router();

// Full system health & telemetry
healthRouter.get('/health', (req, res, next) => healthController.checkHealth(req, res, next));

// Process liveness probe (Docker / K8s / Render)
healthRouter.get('/health/live', (req, res) => healthController.checkLiveness(req, res));

// Dependency readiness probe (PostgreSQL connectivity check)
healthRouter.get('/health/ready', (req, res, next) => healthController.checkReadiness(req, res, next));
