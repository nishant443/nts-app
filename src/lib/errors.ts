export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    } = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.status = options.status ?? 400;
    this.code = options.code ?? "bad_request";
    this.fieldErrors = options.fieldErrors;
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Please correct the highlighted fields.",
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message, { status: 422, code: "validation_error", fieldErrors });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You need to sign in to continue.") {
    super(message, { status: 401, code: "unauthorized" });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have access to this resource.") {
    super(message, { status: 403, code: "forbidden" });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "That record no longer exists.") {
    super(message, { status: 404, code: "not_found" });
  }
}

export class ConflictError extends AppError {
  constructor(message = "That change conflicts with existing data.") {
    super(message, { status: 409, code: "conflict" });
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests. Please slow down and try again shortly.", {
      status: 429,
      code: "rate_limited",
    });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toUserMessage(error: unknown): string {
  if (isAppError(error)) return error.message;
  return "Something went wrong. Please try again.";
}
