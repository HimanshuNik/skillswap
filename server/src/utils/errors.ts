export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  PAYLOAD_TOO_LARGE = 413,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  CSRF_ERROR = 'CSRF_ERROR',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
}

export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly code: ErrorCode | string;
  public readonly details?: Array<{ field?: string; message: string }>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
    code: ErrorCode | string = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: Array<{ field?: string; message: string }>,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST') {
    super(message, HttpStatusCode.BAD_REQUEST, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = ErrorCode.NOT_FOUND) {
    super(message, HttpStatusCode.NOT_FOUND, code);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    details?: Array<{ field?: string; message: string }>
  ) {
    super(message, HttpStatusCode.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = ErrorCode.UNAUTHORIZED) {
    super(message, HttpStatusCode.UNAUTHORIZED, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code = ErrorCode.FORBIDDEN) {
    super(message, HttpStatusCode.FORBIDDEN, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = ErrorCode.CONFLICT) {
    super(message, HttpStatusCode.CONFLICT, code);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details?: Array<{ field?: string; message: string }>) {
    super(message, HttpStatusCode.SERVICE_UNAVAILABLE, ErrorCode.DATABASE_ERROR, details);
  }
}
