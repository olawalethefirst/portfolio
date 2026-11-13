import { apiErrorResponse } from "./errors";

export type RequestHandler<TRequest extends Request, TContext extends unknown[]> =
  (request: TRequest, ...context: TContext) => Response | Promise<Response>;

/** Opt in for browser mutation routes, not cross-origin OAuth callbacks. */
function checkSameOrigin(request: Request): Response | null {
  if (request.headers.get("origin") === new URL(request.url).origin) return null;
  return apiErrorResponse({
    code: "FORBIDDEN",
    message: "Submit this request from the same site.",
  });
}

function hasContentType(request: Request, expected: string): boolean {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim();
  return type?.toLowerCase() === expected.toLowerCase();
}

export function withSameOrigin<TRequest extends Request, TContext extends unknown[]>(
  handler: RequestHandler<TRequest, TContext>,
) {
  return async (request: TRequest, ...context: TContext): Promise<Response> =>
    checkSameOrigin(request) ?? handler(request, ...context);
}

export function withContentType<TRequest extends Request, TContext extends unknown[]>(
  expected: string,
  handler: RequestHandler<TRequest, TContext>,
  message = "Unsupported content type.",
) {
  return async (request: TRequest, ...context: TContext): Promise<Response> => {
    if (!hasContentType(request, expected)) {
      return apiErrorResponse({ code: "INVALID_REQUEST", message });
    }
    return handler(request, ...context);
  };
}
