export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function createNotFoundError(message = "Resource not found") {
  return new AppError(message, 404);
}

export function createBadRequestError(message = "Bad request") {
  return new AppError(message, 400);
}

export function createUnauthorizedError(message = "Unauthorized") {
  return new AppError(message, 401);
}

export function createForbiddenError(message = "Forbidden") {
  return new AppError(message, 403);
}
