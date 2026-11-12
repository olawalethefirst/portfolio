import { expect, it } from "vitest";
import { apiErrorResponse, type ApiError } from "./errors";

it.each([
  ["INVALID_REQUEST", 400], ["UNAUTHENTICATED", 401], ["FORBIDDEN", 403],
  ["NOT_FOUND", 404], ["CONFLICT", 409], ["VALIDATION_ERROR", 422],
  ["INTERNAL_ERROR", 500], ["SERVICE_UNAVAILABLE", 503],
] as const)("serializes %s with its approved status and no cache", async (code, status) => {
  const response = apiErrorResponse({ code, message: "Safe feedback." });
  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toEqual({ error: { code, message: "Safe feedback." } });
});

it("preserves request-pointer issues without UI mapping", async () => {
  const error: ApiError = { code: "VALIDATION_ERROR", message: "Invalid content.", issues: [
    { pointer: "/draft/bodyMarkdown", message: "Write your article." },
  ] };
  expect(await apiErrorResponse(error).json()).toEqual({ error });
});
