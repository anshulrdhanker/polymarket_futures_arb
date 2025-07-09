/**
 * Custom error class for non-retriable errors
 * These errors will cause the job to be marked as failed without retrying
 */
export class NonRetriableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetriableError';
    // This ensures the error is properly logged with stack traces
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NonRetriableError);
    }
  }
}
