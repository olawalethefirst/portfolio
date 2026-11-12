import { expect, it } from "vitest";
import { checkSameOrigin, hasContentType } from "./request";

function request(origin?: string) {
  return new Request("https://portfolio.test/api/example", {
    method: "POST", headers: origin ? { origin } : {},
  });
}

it("accepts the matching origin", () => {
  expect(checkSameOrigin(request("https://portfolio.test"))).toBeNull();
});

it.each([undefined, "null", "https://evil.test", "http://portfolio.test", "https://portfolio.test:444"])("rejects missing, opaque or mismatched origin: %s", async (origin) => {
  const response = checkSameOrigin(request(origin));
  expect(response?.status).toBe(403);
  expect(response?.headers.get("cache-control")).toContain("no-store");
  expect(await response?.json()).toMatchObject({ error: { code: "FORBIDDEN" } });
});

it.each([
  ["application/x-www-form-urlencoded", true],
  ["application/x-www-form-urlencoded; charset=UTF-8", true],
  ["application/json", false], ["text/plain", false],
])("checks the declared content type independently of route fields: %s", (contentType, expected) => {
  const input = new Request("https://portfolio.test", { headers: { "content-type": contentType } });
  expect(hasContentType(input, "application/x-www-form-urlencoded")).toBe(expected);
});

it("does not accept an absent content type", () => {
  expect(hasContentType(request(), "application/json")).toBe(false);
});
