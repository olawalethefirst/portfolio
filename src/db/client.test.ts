import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { connect, wrap, database } = vi.hoisted(() => {
  const database = { execute: vi.fn() };
  return { connect: vi.fn(() => ({})), wrap: vi.fn(() => database), database };
});

vi.mock("server-only", () => ({}));
vi.mock("postgres", () => ({ default: connect }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: wrap }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  Reflect.deleteProperty(globalThis, "portfolioDatabase");
});

afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(globalThis, "portfolioDatabase");
});

it("can load server modules without database credentials or opening a connection", async () => {
  vi.stubEnv("DATABASE_URL", undefined);
  await import("./client");
  expect(connect).not.toHaveBeenCalled();
});

it.each([undefined, "", "   "])("reports missing database configuration before creating a client: %s", async (value) => {
  vi.stubEnv("DATABASE_URL", value);
  const { getDb } = await import("./client");
  expect(() => getDb()).toThrow("DATABASE_URL is not configured.");
  expect(connect).not.toHaveBeenCalled();
});

it("reuses its database client across calls and module reloads without executing queries", async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://example:unused@localhost:5432/portfolio");
  const first = await import("./client");
  const initialDatabase = first.getDb();
  expect(first.getDb()).toBe(initialDatabase);
  vi.resetModules();
  const reloaded = await import("./client");
  expect(reloaded.getDb()).toBe(initialDatabase);
  expect(connect).toHaveBeenCalledTimes(1);
  expect(database.execute).not.toHaveBeenCalled();
});
