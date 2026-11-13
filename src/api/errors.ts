export const apiErrorCodes = [
  "INVALID_REQUEST", "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND",
  "CONFLICT", "VALIDATION_ERROR", "INTERNAL_ERROR", "SERVICE_UNAVAILABLE",
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

const errorStatuses: Record<ApiErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export interface ApiIssue { pointer: string; message: string }
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  issues?: ApiIssue[];
}
export interface ApiErrorEnvelope { error: ApiError }

/** Serialize safe application errors; never pass raw provider/database errors. */
export function apiErrorResponse(error: ApiError): Response {
  const body: ApiErrorEnvelope = { error };
  return Response.json(body, {
    status: errorStatuses[error.code],
    headers: { "Cache-Control": "private, no-store" },
  });
}
