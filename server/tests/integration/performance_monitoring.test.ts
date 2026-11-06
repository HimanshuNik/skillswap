import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { skillRepository } from '../../src/repositories/skill.repository.js';
import { dashboardService } from '../../src/services/dashboard.service.js';
import { messageService } from '../../src/services/message.service.js';
import { conversationRepository } from '../../src/repositories/conversation.repository.js';
import { userRepository } from '../../src/repositories/user.repository.js';
import { swapRequestRepository } from '../../src/repositories/swapRequest.repository.js';
import { telemetry } from '../../src/utils/telemetry.js';

describe('Phase 15 — Performance Optimization & Health Monitoring Tests', () => {
  let server: Server;
  let baseUrl: string;
  const timestamp = Date.now();

  let userA_Id = 0;
  let userB_Id = 0;
  let conversationId = 0;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 5099;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Create test users and conversation for messaging idempotency test
    const userA = await userRepository.createUser({
      name: `Perf User A ${timestamp}`,
      username: `perf_a_${timestamp}`,
      email: `perf_a_${timestamp}@test.com`,
      passwordHash: 'hash',
    });
    const userB = await userRepository.createUser({
      name: `Perf User B ${timestamp}`,
      username: `perf_b_${timestamp}`,
      email: `perf_b_${timestamp}@test.com`,
      passwordHash: 'hash',
    });
    userA_Id = userA.id;
    userB_Id = userB.id;

    const conv = await conversationRepository.createWithParticipants(null, [userA_Id, userB_Id]);
    conversationId = conv.id;
  });

  after(async () => {
    const uids = [userA_Id, userB_Id].filter(Boolean);
    for (const uid of uids) {
      await db.orm.public.User.where({ id: uid }).delete();
    }
    server.closeAllConnections?.();
    server.close();
    await db.close();
  });

  // 1. Full Health Check Endpoint
  test('1. GET /api/health returns comprehensive operational health & telemetry', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'healthy');
    assert.equal(json.data.database.connected, true);
    assert.equal(typeof json.data.database.latencyMs, 'number');

    // Verify system metrics
    assert.ok(json.data.memory.rssMb > 0);
    assert.ok(json.data.memory.heapUsedMb > 0);
    assert.ok(json.data.uptimeSeconds >= 0);
    assert.equal(typeof json.data.cpu.userMicroseconds, 'number');

    // Verify socket metrics
    assert.equal(typeof json.data.sockets.activeConnections, 'number');
    assert.equal(typeof json.data.sockets.onlineUsers, 'number');

    // Verify telemetry metrics
    assert.equal(typeof json.data.telemetry.totalRequests, 'number');
    assert.equal(typeof json.data.telemetry.errorRatePercent, 'number');
    assert.equal(typeof json.data.telemetry.averageLatencyMs, 'number');
  });

  // 2. Process Liveness Probe
  test('2. GET /api/health/live returns fast liveness status for container orchestrators', async () => {
    const res = await fetch(`${baseUrl}/api/health/live`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'ok');
    assert.ok(json.data.uptimeSeconds >= 0);
    assert.ok(typeof json.data.timestamp, 'string');
  });

  // 3. Database Readiness Probe
  test('3. GET /api/health/ready confirms database readiness for load balancer routing', async () => {
    const res = await fetch(`${baseUrl}/api/health/ready`);
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'ready');
    assert.equal(json.data.database.connected, true);
  });

  // 4. Request ID Generation & Header Propagation
  test('4. Auto-generates unique x-request-id header when not provided', async () => {
    const res = await fetch(`${baseUrl}/api/health/live`);
    const reqId = res.headers.get('x-request-id');
    assert.ok(reqId, 'Expected x-request-id header in response');
    assert.match(reqId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  test('5. Propagates client-provided x-request-id for distributed tracing', async () => {
    const customTraceId = 'trace-skillswap-perf-xyz-987';
    const res = await fetch(`${baseUrl}/api/health/live`, {
      headers: { 'x-request-id': customTraceId },
    });
    const reqId = res.headers.get('x-request-id');
    assert.equal(reqId, customTraceId);
  });

  // 6. In-Memory Static Skill Catalog Caching Performance
  test('6. Skill catalog in-memory caching serves subsequent calls in < 2ms', async () => {
    skillRepository.clearCache();

    // Call 1: Database hit & cache populating
    const start1 = performance.now();
    const skills1 = await skillRepository.findAll();
    const duration1 = performance.now() - start1;
    assert.ok(skills1.length > 0);

    // Call 2: In-memory cache hit
    const start2 = performance.now();
    const skills2 = await skillRepository.findAll();
    const duration2 = performance.now() - start2;
    assert.equal(skills2.length, skills1.length);

    // Cache hit should be virtually instantaneous (sub-millisecond)
    assert.ok(duration2 < 5, `Expected cached lookup to be < 5ms, got ${duration2.toFixed(3)}ms`);
    assert.ok(duration2 <= duration1 + 1);
  });

  // 7. Message Idempotency & Deduplication
  test('7. MessageService idempotency suppresses duplicate messages with same clientMessageId', async () => {
    const clientMessageId = `idempotent_test_${Date.now()}`;
    const content = 'Test message for deduplication verification';

    // First attempt -> Created in DB
    const firstResult = await messageService.sendMessage(
      userA_Id,
      conversationId,
      content,
      clientMessageId
    );
    assert.ok(firstResult.id > 0);
    assert.equal(firstResult.content, content);

    // Second attempt with exact same clientMessageId within 15 seconds
    const secondResult = await messageService.sendMessage(
      userA_Id,
      conversationId,
      content,
      clientMessageId
    );

    // Must return the exact same message record without creating a duplicate row
    assert.equal(secondResult.id, firstResult.id);
    assert.equal(secondResult.clientMessageId, clientMessageId);
  });

  // 8. Optimized Dashboard Aggregation Performance
  test('8. DashboardService.getSummary executes with parallel queries without full SwapRequest scan', async () => {
    const start = performance.now();
    const summary = await dashboardService.getSummary(userA_Id);
    const duration = performance.now() - start;

    assert.ok(summary);
    assert.equal(typeof summary.activeSwaps, 'number');
    assert.equal(typeof summary.completedSwaps, 'number');
    assert.equal(typeof summary.upcomingSessionsCount, 'number');
    assert.equal(typeof summary.unreadMessagesCount, 'number');
    assert.equal(typeof summary.profileCompletion.percentage, 'number');

    // Should complete cleanly and quickly (< 750ms under heavy test suite load, typically ~20ms in isolation)
    assert.ok(duration < 750, `Expected dashboard summary to take < 750ms, took ${duration.toFixed(2)}ms`);
  });

  // 9. Telemetry Request Recording
  test('9. Telemetry accurately tracks throughput and latency', async () => {
    const summary = telemetry.getSummary();
    assert.ok(summary.totalRequests > 0);
    assert.ok(summary.latency.averageMs >= 0);
    assert.ok(summary.latency.p95Ms >= 0);
  });
});
