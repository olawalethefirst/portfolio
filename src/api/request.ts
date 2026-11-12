import { apiErrorResponse } from "./errors";

/** Opt in for browser mutation routes, not cross-origin OAuth callbacks. */
export function checkSameOrigin(request: Request): Response | null {
  if (request.headers.get("origin") === new URL(request.url).origin) return null;
  return apiErrorResponse({
    code: "FORBIDDEN",
    message: "Submit this request from the same site.",
  });
}

export function hasContentType(request: Request, expected: string): boolean {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim();
  return type?.toLowerCase() === expected.toLowerCase();
}
