import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { healthService } from '../../src/services/health.service.js';
import { healthRepository } from '../../src/repositories/health.repository.js';
import { db } from '../../src/prisma/db.js';

describe('Health Service & Database Integration', () => {
  after(async () => {
    await db.close();
  });

  test('healthRepository reports connected database', async () => {
    const status = await healthRepository.checkDatabase();
    assert.equal(status.connected, true);
    assert.equal(typeof status.latencyMs, 'number');
    assert.ok(status.latencyMs >= 0);
  });

  test('healthService returns healthy telemetry payload', async () => {
    const health = await healthService.getHealthStatus();
    assert.equal(health.status, 'healthy');
    assert.equal(health.database.connected, true);
    assert.ok(health.uptimeSeconds >= 0);
    assert.ok(typeof health.timestamp, 'string');
  });
});

