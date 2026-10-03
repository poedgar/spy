import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, NetworkError, ValidationError } from '@/api/errors';

export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (error instanceof ValidationError) {
    let formMessage: string | null = null;
    for (const [key, messages] of Object.entries(error.fieldErrors)) {
      if ((fields as readonly string[]).includes(key)) {
        setError(key as Path<T>, { type: 'server', message: messages[0] });
      } else {
        formMessage = messages[0] ?? error.message;
      }
    }
    return formMessage;
  }

  if (error instanceof NetworkError || error instanceof ApiError) return error.message;

  return 'Something went wrong. Please try again.';
}
