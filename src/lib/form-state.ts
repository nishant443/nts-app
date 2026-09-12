/**
 * Form state shared between Server Actions and the Client Components that
 * render them.
 *
 * This module must stay free of server-only imports. A Client Component that
 * needs `FormState` imports it from here; if it imported from `lib/action.ts`
 * instead, the whole server chain (DAL → Prisma → pg) would be pulled into the
 * browser bundle and the build would fail.
 */

export interface FormState {
  /** Present when the whole submission failed. */
  error?: string;
  /** Per-field messages keyed by input `name`. */
  fieldErrors?: Record<string, string[]>;
  /** Present after a successful submission. */
  success?: string;
  /** Bumped on every response so effects can react to repeat submissions. */
  ts?: number;
}

export const emptyFormState: FormState = {};

export function formError(
  error: string,
  fieldErrors?: Record<string, string[]>,
): FormState {
  return { error, fieldErrors, ts: Date.now() };
}

export function formSuccess(success?: string): FormState {
  return { success, ts: Date.now() };
}

/** First message for a field, or undefined — what `<Field error>` expects. */
export function fieldError(
  state: FormState,
  name: string,
): string | undefined {
  return state.fieldErrors?.[name]?.[0];
}
