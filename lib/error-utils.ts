/**
 * Type guard to check if a value is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Safely extract error stack from unknown error
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}
