export type ApiErrorCode = "HTTP" | "VALIDATION" | "NETWORK";

/**
 * Typed error thrown by every `lib/api/*` call. `status` mirrors the HTTP
 * status for a backend-reported error (docs/api.md envelope), is `0` for a
 * response envelope that failed Zod validation, and `-1` for a network-level
 * failure (fetch threw before a response existed).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown[];

  constructor(message: string, opts: { status: number; code: ApiErrorCode; details?: unknown[] }) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
