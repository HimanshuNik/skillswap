import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

describe('Environment Schema Validation', () => {
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    CLIENT_URL: z.string().default('http://localhost:5173'),
  });

  test('validates correct environment variables', () => {
    const validEnv = {
      NODE_ENV: 'test',
      PORT: '5001',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/skillswap',
      CLIENT_URL: 'http://localhost:5173',
    };

    const result = envSchema.safeParse(validEnv);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.PORT, 5001);
      assert.equal(result.data.NODE_ENV, 'test');
    }
  });

  test('rejects missing DATABASE_URL', () => {
    const invalidEnv = {
      NODE_ENV: 'development',
      PORT: '5000',
    };

    const result = envSchema.safeParse(invalidEnv);
    assert.equal(result.success, false);
  });
});

