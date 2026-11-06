import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';
import type { Server } from 'http';

interface MetricResult {
  endpoint: string;
  totalRequests: number;
  successful: number;
  failed: number;
  errorRatePct: number;
  minMs: number;
  avgMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  throughputRps: number;
}

function extractCookieAndCsrf(res: Response) {
  const rawHeaders: string[] = typeof (res.headers as any).getSetCookie === 'function'
    ? (res.headers as any).getSetCookie()
    : [res.headers.get('set-cookie') || ''];

  let auth = '';
  let csrf = '';

  for (const h of rawHeaders) {
    const parts = h.split(',').map((c) => c.trim().split(';')[0]);
    for (const p of parts) {
      if (p.startsWith(`${AUTH_COOKIE_NAME}=`)) {
        auth = p;
      }
      if (p.startsWith(`${CSRF_COOKIE_NAME}=`)) {
        csrf = p.replace(`${CSRF_COOKIE_NAME}=`, '');
      }
    }
  }

  return {
    auth,
    csrf,
    cookie: `${auth}; ${CSRF_COOKIE_NAME}=${csrf}`,
  };
}

async function runEndpointBenchmark(
  name: string,
  url: string,
  headers: Record<string, string>,
  totalRequests = 100,
  concurrency = 10
): Promise<MetricResult> {
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;

  const startTotal = Date.now();
  let completed = 0;

  async function worker() {
    while (completed < totalRequests) {
      completed++;
      const reqStart = performance.now();
      try {
        const res = await fetch(url, { headers });
        const reqEnd = performance.now();
        latencies.push(reqEnd - reqStart);
        if (res.status >= 200 && res.status < 400) {
          successful++;
        } else {
          failed++;
        }
      } catch {
        const reqEnd = performance.now();
        latencies.push(reqEnd - reqStart);
        failed++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  const totalDurationSec = (Date.now() - startTotal) / 1000;

  latencies.sort((a, b) => a - b);
  const minMs = latencies[0] || 0;
  const avgMs = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const medianMs = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95Ms = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99Ms = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const throughputRps = totalRequests / (totalDurationSec || 1);

  return {
    endpoint: name,
    totalRequests,
    successful,
    failed,
    errorRatePct: (failed / totalRequests) * 100,
    minMs: Math.round(minMs * 100) / 100,
    avgMs: Math.round(avgMs * 100) / 100,
    medianMs: Math.round(medianMs * 100) / 100,
    p95Ms: Math.round(p95Ms * 100) / 100,
    p99Ms: Math.round(p99Ms * 100) / 100,
    throughputRps: Math.round(throughputRps * 10) / 10,
  };
}

async function run() {
  console.log('⚡ [SkillSwap Benchmark] Initializing test harness...');
  const app = createApp();
  let server: Server;
  let baseUrl = '';

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 5099;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  const timestamp = Date.now();
  const testUser = {
    name: 'Benchmarker',
    username: `bench_${timestamp}`,
    email: `bench_${timestamp}@skillswap.local`,
    password: 'Password123!',
  };

  // Register test user
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const regJson = (await regRes.json()) as any;
  const userId = regJson.data.user.id;
  const authData = extractCookieAndCsrf(regRes);

  const authHeaders = {
    Cookie: authData.cookie,
    'x-csrf-token': authData.csrf,
  };

  console.log(`✅ [SkillSwap Benchmark] Test user established (ID: ${userId})`);
  console.log('🚀 [SkillSwap Benchmark] Running concurrent workload benchmarks (100 reqs, concurrency 10)...\n');

  const results: MetricResult[] = [];

  // 1. Health check
  results.push(
    await runEndpointBenchmark('Health Check (GET /api/health)', `${baseUrl}/api/health`, {})
  );

  // 2. User Discovery
  results.push(
    await runEndpointBenchmark('User Discovery (GET /api/users)', `${baseUrl}/api/users?limit=12`, authHeaders)
  );

  // 3. Reciprocal Matches
  results.push(
    await runEndpointBenchmark('Reciprocal Matching (GET /api/matches)', `${baseUrl}/api/matches?limit=10`, authHeaders)
  );

  // 4. Current User Session
  results.push(
    await runEndpointBenchmark('User Profile/Me (GET /api/users/me)', `${baseUrl}/api/users/me`, authHeaders)
  );

  // 5. Conversations List
  results.push(
    await runEndpointBenchmark('Conversations List (GET /api/conversations)', `${baseUrl}/api/conversations`, authHeaders)
  );

  // 6. Sessions List
  results.push(
    await runEndpointBenchmark('Sessions List (GET /api/sessions)', `${baseUrl}/api/sessions`, authHeaders)
  );

  // 7. Community Posts
  results.push(
    await runEndpointBenchmark('Community Posts (GET /api/community/posts)', `${baseUrl}/api/community/posts?limit=10`, authHeaders)
  );

  // 8. Community Analytics (Cached)
  results.push(
    await runEndpointBenchmark('Community Analytics (GET /api/community/analytics)', `${baseUrl}/api/community/analytics`, authHeaders)
  );

  console.log('\n========================================================================================');
  console.log('🏁 SKILLSWAP BENCHMARK RESULTS (AUTHENTIC MEASUREMENTS)');
  console.log('========================================================================================\n');
  console.table(
    results.map((r) => ({
      Endpoint: r.endpoint,
      'Avg (ms)': r.avgMs,
      'p50 (ms)': r.medianMs,
      'p95 (ms)': r.p95Ms,
      'p99 (ms)': r.p99Ms,
      'Throughput (RPS)': r.throughputRps,
      'Error Rate': `${r.errorRatePct}%`,
    }))
  );

  // Cleanup test user
  await db.orm.public.UserNotificationPreference.where({ userId }).delete().catch(() => {});
  await db.orm.public.User.where({ id: userId }).delete().catch(() => {});

  // Close server
  if (typeof (server as any).closeAllConnections === 'function') {
    (server as any).closeAllConnections();
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.close();

  console.log('\n✅ [SkillSwap Benchmark] Cleanup complete.');
}

run().catch((err) => {
  console.error('Benchmark execution failed:', err);
  process.exit(1);
});

