// Deprecated: use './error-handling' instead
//
// Re-exports the original errorUtils API surface from the consolidated module.
// The sync `parseApiError` was renamed to `parseToAppError` in the merged file;
// it is re-exported here under the original name for backward compatibility.

export type { AppError } from './error-handling';

export {
  createAppError,
  ErrorTypes,
  parseToAppError as parseApiError,
  withErrorHandling,
  retryWithBackoff,
  errorBoundaryTests,
  reportError,
} from './error-handling';
