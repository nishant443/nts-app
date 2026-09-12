import "server-only";

import { z } from "zod";

import { getSessionUser, type SessionUser } from "@/lib/dal";
import {
  ForbiddenError,
  UnauthorizedError,
  isAppError,
  toUserMessage,
} from "@/lib/errors";
import { formError, formSuccess, type FormState } from "@/lib/form-state";
import { enforceRateLimit, RateLimits } from "@/lib/rate-limit";

/**
 * Server Action plumbing.
 *
 * Server Actions are public endpoints — anybody can invoke one by replaying the
 * request — so they get the same treatment as Route Handlers: role check, rate
 * limit, Zod validation. `formAction` returns a `FormState` designed to be fed
 * straight into `useActionState`.
 *
 * `FormState` and its constructors live in `lib/form-state.ts` so Client
 * Components can import them without dragging the server chain into the
 * browser bundle. They are re-exported here for server-side convenience.
 */

export { formError, formSuccess, type FormState };

type Access = "user" | "admin";

/**
 * Wraps a `useActionState` handler: validates `FormData` against `schema`,
 * enforces the role, and converts thrown errors into a displayable state.
 *
 * The wrapped function never throws for expected failures, so the form stays
 * mounted and shows the message inline. `redirect()` inside `handler` still
 * works — Next signals redirects with a special error which is re-thrown.
 */
export function formAction<TSchema extends z.ZodType>(
  options: {
    access: Access;
    schema: TSchema;
    rateLimit?: { limit: number; windowSeconds: number };
    /**
     * Reshapes the raw form object before validation. Forms that submit
     * repeating rows use this to zip parallel arrays back into objects — see
     * `withLineItems` in `lib/line-items.ts`.
     */
    transform?: (raw: Record<string, unknown>) => Record<string, unknown>;
  },
  handler: (args: {
    input: z.infer<TSchema>;
    user: SessionUser;
  }) => Promise<FormState | void>,
) {
  return async (
    _prevState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    try {
      const user = await getSessionUser();
      if (!user) throw new UnauthorizedError();
      if (options.access === "admin" && user.role !== "ADMIN") {
        throw new ForbiddenError(
          "This action is restricted to administrators.",
        );
      }

      const budget = options.rateLimit ?? RateLimits.write;
      enforceRateLimit(`action:${user.id}`, budget.limit, budget.windowSeconds);

      const raw = formDataToObject(formData);
      const parsed = options.schema.safeParse(
        options.transform ? options.transform(raw) : raw,
      );
      if (!parsed.success) {
        return formError(
          "Please correct the highlighted fields.",
          z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
        );
      }

      const result = await handler({ input: parsed.data, user });
      return result ?? formSuccess();
    } catch (error) {
      // `redirect()` and `notFound()` communicate via thrown control-flow
      // errors — let those through untouched.
      if (isNextControlFlow(error)) throw error;

      if (!isAppError(error)) {
        console.error("[action] unhandled error", error);
      }

      return formError(
        toUserMessage(error),
        isAppError(error) ? error.fieldErrors : undefined,
      );
    }
  };
}

/**
 * Same guards, but for actions invoked imperatively (`onClick`) rather than by
 * a form — approve, reject, mark-as-read and friends.
 */
export function action<TInput, TResult = void>(
  options: { access: Access; rateLimit?: { limit: number; windowSeconds: number } },
  handler: (args: { input: TInput; user: SessionUser }) => Promise<TResult>,
) {
  return async (
    input: TInput,
  ): Promise<
    { ok: true; data: TResult } | { ok: false; error: string }
  > => {
    try {
      const user = await getSessionUser();
      if (!user) throw new UnauthorizedError();
      if (options.access === "admin" && user.role !== "ADMIN") {
        throw new ForbiddenError(
          "This action is restricted to administrators.",
        );
      }

      const budget = options.rateLimit ?? RateLimits.write;
      enforceRateLimit(`action:${user.id}`, budget.limit, budget.windowSeconds);

      return { ok: true, data: await handler({ input, user }) };
    } catch (error) {
      if (isNextControlFlow(error)) throw error;
      if (!isAppError(error)) console.error("[action] unhandled error", error);
      return { ok: false, error: toUserMessage(error) };
    }
  };
}

/**
 * `FormData` -> plain object. Repeated keys collapse into arrays so multi-select
 * inputs and repeating line-item rows survive.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    // File inputs are handled separately by the upload endpoint.
    if (typeof value !== "string") continue;

    if (key in result) {
      const existing = result[key];
      if (Array.isArray(existing)) existing.push(value);
      else result[key] = [existing, value];
    } else {
      result[key] = value;
    }
  }

  return result;
}

function isNextControlFlow(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}
