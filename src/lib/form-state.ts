export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
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

export function fieldError(
  state: FormState,
  name: string,
): string | undefined {
  return state.fieldErrors?.[name]?.[0];
}
