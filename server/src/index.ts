import type { Server } from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { db } from './prisma/db.js';
import { initSocketServer, closeSocketServer } from './socket/index.js';

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  logger.info(`SkillSwap API running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
});

// Initialize Socket.IO real-time messaging server
initSocketServer(server);

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    await closeSocketServer();
    logger.info('Socket.IO connections closed cleanly.');
  } catch (err: any) {
    logger.warn(`Error closing Socket.IO: ${err.message}`);
  }

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await db.close();
      logger.info('Database connections closed cleanly.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during database teardown:');
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if hanging
  setTimeout(() => {
    logger.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection:');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception:');
  process.exit(1);
});
