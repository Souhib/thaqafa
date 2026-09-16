// Wraps a non-2xx response from the backend so callers can switch on the
// machine-readable `errorCode` instead of pattern-matching English text.
//
// The backend's global exception handler (thaqafa/app.py) shapes every
// non-validation error into the same envelope:
//   { error, error_key, message, error_params, details, timestamp }
// so this class is a plain mirror of that shape on the FE.

export interface ApiErrorBody {
  error?: string;
  error_key?: string;
  message?: string;
  error_params?: Record<string, unknown> | null;
  details?: unknown;
}

export class ApiError extends Error {
  /** Machine code, e.g. "InvalidCredentialsError". */
  readonly errorCode: string;
  /** i18n key, e.g. "errors.api.invalidCredentials". */
  readonly errorKey: string;
  /** HTTP status, useful for fall-back classification (5xx vs 4xx). */
  readonly status: number;
  /** Raw envelope — useful when a route wants to surface field-level details. */
  readonly body: ApiErrorBody;

  constructor(body: ApiErrorBody | undefined, status: number) {
    const safe: ApiErrorBody = body ?? {};
    const code = safe.error ?? `Http${status}`;
    super(safe.message ?? code);
    this.name = "ApiError";
    this.errorCode = code;
    this.errorKey = safe.error_key ?? "errors.api.unknown";
    this.status = status;
    this.body = safe;
  }
}

/**
 * Convert a hey-api `{ data, error, response }` result into either the
 * unwrapped data, or throw an ``ApiError`` when the call failed.
 */
export function unwrap<T>(result: {
  data?: T;
  error?: unknown;
  response?: { status?: number };
}): T {
  if (result.error !== undefined) {
    const status = result.response?.status ?? 0;
    throw new ApiError(result.error as ApiErrorBody, status);
  }
  if (result.data === undefined) {
    throw new ApiError(
      { error: "EmptyResponse", message: "empty response body" },
      result.response?.status ?? 0,
    );
  }
  return result.data;
}
