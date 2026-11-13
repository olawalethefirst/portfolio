import { z } from "zod";
import { apiErrorCodes, type ApiError } from "./errors";

const errorSchema = z.object({ error: z.object({
  code: z.enum(apiErrorCodes),
  message: z.string(), issues: z.array(z.object({ pointer: z.string(), message: z.string() })).optional(),
}) });

export class ApiRequestError extends Error {
  constructor(
    readonly kind: "server" | "network" | "response",
    readonly status: number | null,
    readonly error?: ApiError,
  ) {
    super(error?.message ?? (kind === "network"
      ? "Couldn’t reach the server."
      : "The server returned an unexpected response."));
    this.name = "ApiRequestError";
  }
}

/** Transport only: no navigation, field mapping, draft writes or automatic retries. */
export async function requestJson<T>(
  url: string,
  schema: z.ZodType<T>,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET", signal: options.signal,
      credentials: "same-origin", cache: "no-store",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (failure) {
    if (options.signal?.aborted) throw failure;
    throw new ApiRequestError("network", null);
  }
  let body: unknown;
  try { body = response.status === 204 ? undefined : await response.json(); }
  catch { throw new ApiRequestError("response", response.status); }
  if (!response.ok) {
    const result = errorSchema.safeParse(body);
    if (result.success) throw new ApiRequestError("server", response.status, result.data.error);
    throw new ApiRequestError("response", response.status);
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new ApiRequestError("response", response.status);
  return result.data;
}
