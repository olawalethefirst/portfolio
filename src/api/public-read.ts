import { apiErrorResponse } from "./errors";
import type { RequestHandler } from "./request";

/** Public content reads do not depend on identity, sessions or auth configuration. */
export function withPublicRead<TRequest extends Request, TContext extends unknown[]>(
  operation: RequestHandler<TRequest, TContext>,
) {
  return async (request: TRequest, ...context: TContext): Promise<Response> => {
    let response: Response;
    try {
      response = await operation(request, ...context);
    } catch {
      response = apiErrorResponse({
        code: "INTERNAL_ERROR",
        message: "Unable to complete this request. Try again later.",
      });
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
}
