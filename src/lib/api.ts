import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, type SessionUser } from "@/lib/dal";
import { isProduction } from "@/lib/env";
import {
  AppError,
  ForbiddenError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { clientKey, enforceRateLimit, RateLimits } from "@/lib/rate-limit";

export type RouteAccess = "public" | "user" | "admin";

interface RouteOptions {
  access: RouteAccess;
  rateLimit?: { limit: number; windowSeconds: number };
}

type RouteHandler<TContext> = (args: {
  request: Request;
  user: SessionUser;
  context: TContext;
}) => Promise<Response> | Response;

type PublicRouteHandler<TContext> = (args: {
  request: Request;
  user: SessionUser | null;
  context: TContext;
}) => Promise<Response> | Response;

export function withRoute<TContext = unknown>(
  options: { access: "public"; rateLimit?: RouteOptions["rateLimit"] },
  handler: PublicRouteHandler<TContext>,
): (request: Request, context: TContext) => Promise<Response>;
export function withRoute<TContext = unknown>(
  options: { access: "user" | "admin"; rateLimit?: RouteOptions["rateLimit"] },
  handler: RouteHandler<TContext>,
): (request: Request, context: TContext) => Promise<Response>;
export function withRoute<TContext = unknown>(
  options: RouteOptions,
  handler: RouteHandler<TContext> | PublicRouteHandler<TContext>,
) {
  const run = handler as PublicRouteHandler<TContext>;

  return async (request: Request, context: TContext): Promise<Response> => {
    try {
      const budget =
        options.rateLimit ??
        (request.method === "GET" ? RateLimits.read : RateLimits.write);

      const user = await getSessionUser();

      const identity = user
        ? `${new URL(request.url).pathname}:${user.id}`
        : clientKey(request, new URL(request.url).pathname);

      enforceRateLimit(identity, budget.limit, budget.windowSeconds);

      if (options.access !== "public" && !user) {
        throw new UnauthorizedError();
      }

      if (options.access === "admin" && user?.role !== "ADMIN") {
        throw new ForbiddenError(
          "This endpoint is restricted to administrators.",
        );
      }

      return await run({ request, user, context });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      {
        status: error.status,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
      { status: error.status },
    );
  }

  console.error("[api] unhandled error", error);

  return NextResponse.json(
    {
      error: "Something went wrong. Please try again.",
      code: "internal_error",
      ...(isProduction
        ? {}
        : { detail: error instanceof Error ? error.message : String(error) }),
    },
    { status: 500 },
  );
}

export async function parseJson<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      "Please correct the highlighted fields.",
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  return parsed.data;
}

export function parseQuery<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): z.infer<TSchema> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw new ValidationError(
      "Invalid query parameters.",
      z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    );
  }
  return parsed.data;
}

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 }) as NextResponse;
}
