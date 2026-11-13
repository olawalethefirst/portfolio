import { expect, it } from "vitest";
import { NextResponse } from "next/server";
import { applySessionResponse } from "./session-response";

it("transfers session cookies, removals and cache headers while preserving a redirect", () => {
  const session = new NextResponse(null, {
    headers: { "Cache-Control": "no-store", Pragma: "no-cache", Expires: "0" },
  });
  session.cookies.set("session.0", "refreshed", {
    path: "/", httpOnly: true, secure: true, sameSite: "lax",
  });
  session.cookies.set("session.1", "", { path: "/", maxAge: 0 });
  const response = NextResponse.redirect("https://portfolio.test/admin", 303);
  applySessionResponse(session, response);

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://portfolio.test/admin");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
  expect(response.headers.get("expires")).toBe("0");
  expect(response.headers.get("set-cookie")).toContain("session.0=refreshed");
  expect(response.headers.get("set-cookie")).toContain("Secure; HttpOnly; SameSite=lax");
  expect(response.headers.get("set-cookie")).toContain("session.1=; Path=/; Max-Age=0");
});

it("merges session updates into a JSON response without dropping its own cookies, headers or body", async () => {
  const session = new NextResponse(null, { headers: { Pragma: "no-cache" } });
  session.cookies.set("session", "new", { path: "/" });
  const response = NextResponse.json({ error: "Sign in." }, { status: 401 });
  response.cookies.set("theme", "dark", { path: "/" });
  applySessionResponse(session, response);

  expect(response.status).toBe(401);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(await response.json()).toEqual({ error: "Sign in." });
  expect(response.headers.get("set-cookie")).toContain("theme=dark");
  expect(response.headers.get("set-cookie")).toContain("session=new");
  expect(response.headers.get("pragma")).toBe("no-cache");
});
