import { db } from '../prisma/db.js';

export interface DatabaseHealthStatus {
  connected: boolean;
  latencyMs: number;
  error?: string;
}

export class HealthRepository {
  async checkDatabase(): Promise<DatabaseHealthStatus> {
    const start = Date.now();
    try {
      // Execute a lightweight query to verify active connectivity
      await db.orm.public.User.select('id').limit(1).all();
      const latencyMs = Date.now() - start;

      return {
        connected: true,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Unknown database error';

      return {
        connected: false,
        latencyMs,
        error: message,
      };
    }
  }
}

export const healthRepository = new HealthRepository();

