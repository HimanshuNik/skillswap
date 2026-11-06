import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AppError, NotFoundError, ValidationError, HttpStatusCode, ErrorCode } from '../../src/utils/errors.js';

describe('AppError & Error Utilities', () => {
  test('AppError creates instance with default status code and code', () => {
    const err = new AppError('Something went wrong');
    assert.equal(err.message, 'Something went wrong');
    assert.equal(err.statusCode, HttpStatusCode.INTERNAL_SERVER_ERROR);
    assert.equal(err.code, ErrorCode.INTERNAL_SERVER_ERROR);
    assert.equal(err.isOperational, true);
  });

  test('NotFoundError creates 404 instance', () => {
    const err = new NotFoundError('User not found');
    assert.equal(err.message, 'User not found');
    assert.equal(err.statusCode, HttpStatusCode.NOT_FOUND);
    assert.equal(err.code, ErrorCode.NOT_FOUND);
  });

  test('ValidationError creates 400 instance with details', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const err = new ValidationError('Validation failed', details);
    assert.equal(err.message, 'Validation failed');
    assert.equal(err.statusCode, HttpStatusCode.BAD_REQUEST);
    assert.equal(err.code, ErrorCode.VALIDATION_ERROR);
    assert.deepEqual(err.details, details);
  });
});

