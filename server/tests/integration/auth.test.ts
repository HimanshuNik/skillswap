import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'http';
import { createApp } from '../../src/app.js';
import { db } from '../../src/prisma/db.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../../src/middleware/auth.middleware.js';
import { generateResetToken, hashResetToken } from '../../src/utils/tokens.js';
import { userRepository } from '../../src/repositories/user.repository.js';

describe('Authentication & Authorization Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  const port = 5055;
  const timestamp = Date.now();
  const testUser = {
    name: 'Auth Tester',
    username: `authtest_${timestamp}`,
    email: `authtest_${timestamp}@example.com`,
    password: 'Password123!',
  };
  let authCookie = '';
  let csrfCookie = '';

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const assignedPort = typeof addr === 'object' && addr ? addr.port : 5055;
        baseUrl = `http://127.0.0.1:${assignedPort}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up test user
    const existing = await userRepository.findByEmail(testUser.email);
    if (existing) {
      await db.orm.public.User.where({ id: existing.id }).delete();
    }
    server.closeAllConnections?.();
    server.close();
  });

  test('1. Successful user registration in PostgreSQL with HTTP-only cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.user.email, testUser.email);
    assert.equal(json.data.user.username, testUser.username);
    assert.equal(json.data.user.passwordHash, undefined); // Sensitive field must never be exposed

    // Check Set-Cookie headers
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie);
    assert.ok(setCookie.includes(AUTH_COOKIE_NAME));

    // Extract cookies for subsequent authenticated requests
    const cookies = setCookie.split(',').map((c) => c.trim().split(';')[0]);
    for (const c of cookies) {
      if (c.startsWith(`${AUTH_COOKIE_NAME}=`)) authCookie = c;
      if (c.startsWith(`${CSRF_COOKIE_NAME}=`)) csrfCookie = c;
    }
  });

  test('2. Registration rejects duplicate email with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...testUser,
        username: `unique_${Date.now()}`,
      }),
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'CONFLICT');
  });

  test('3. Registration rejects duplicate username with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...testUser,
        email: `unique_${Date.now()}@example.com`,
      }),
    });

    assert.equal(res.status, 409);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'CONFLICT');
  });

  test('4. Successful login returns cookie and user profile', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.user.email, testUser.email);
    assert.equal(json.data.user.passwordHash, undefined);
  });

  test('5. Login with invalid password returns 401 with generic message', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'WrongPassword!',
      }),
    });

    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.message, 'Invalid email or password');
  });

  test('6. GET /api/auth/me returns current user when authenticated with cookie', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `${authCookie}; ${csrfCookie}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.user.email, testUser.email);
  });

  test('7. GET /api/auth/me rejects unauthenticated request with 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
  });

  test('8. CSRF Protection enforces x-csrf-token for authenticated state-changing requests', async () => {
    // Missing x-csrf-token header should be rejected
    const blockedRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: `${authCookie}; ${csrfCookie}`,
      },
    });

    assert.equal(blockedRes.status, 403);
    const blockedJson = await blockedRes.json();
    assert.equal(blockedJson.error.code, 'CSRF_ERROR');

    // Valid x-csrf-token header matching csrf cookie succeeds
    const csrfValue = csrfCookie.replace(`${CSRF_COOKIE_NAME}=`, '');
    const allowedRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: `${authCookie}; ${csrfCookie}`,
        'x-csrf-token': csrfValue,
      },
    });

    assert.equal(allowedRes.status, 200);
  });

  test('9. Password reset token flow: zero token exposure in response and one-time use', async () => {
    // Request password reset
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email }),
    });

    assert.equal(forgotRes.status, 200);
    const forgotJson = await forgotRes.json();
    assert.equal(forgotJson.success, true);
    // Crucial security verification: reset token must NEVER appear in response payload
    assert.equal((forgotJson as any).token, undefined);
    assert.equal((forgotJson as any).rawToken, undefined);
    assert.equal((forgotJson as any).resetUrl, undefined);

    // Retrieve generated token from DB to test reset
    const userInDb = await userRepository.findByEmail(testUser.email);
    assert.ok(userInDb?.passwordResetHash);
    assert.ok(userInDb?.passwordResetExpiresAt);

    // Generate a valid token test pair for verification
    const { rawToken, tokenHash, expiresAt } = generateResetToken();
    await userRepository.saveResetToken(userInDb.id, tokenHash, expiresAt);

    // Execute password reset
    const newPassword = 'NewSecretPassword456!';
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: rawToken,
        password: newPassword,
      }),
    });

    assert.equal(resetRes.status, 200);

    // Verify token was cleared from DB (one-time use)
    const afterReset = await userRepository.findById(userInDb.id);
    assert.equal(afterReset?.passwordResetHash, null);
    assert.equal(afterReset?.passwordResetExpiresAt, null);

    // Second attempt with same token must fail
    const reusedRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: rawToken,
        password: 'AnotherPassword789!',
      }),
    });

    assert.equal(reusedRes.status, 400);

    // Can log in with the new password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: newPassword,
      }),
    });
    assert.equal(loginRes.status, 200);
  });
});

