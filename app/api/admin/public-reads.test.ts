import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { initialHero } from "@/src/cms/hero";
import { initialAbout } from "@/src/cms/about";
import { initialSocial } from "@/src/cms/social";

const { hero, about, social, list, item, client } = vi.hoisted(() => ({ hero: vi.fn(), about: vi.fn(), social: vi.fn(), list: vi.fn(), item: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/src/db/hero", () => ({ readHero: hero, updateHero: vi.fn() }));
vi.mock("@/src/db/about", () => ({ readAbout: about, updateAbout: vi.fn() }));
vi.mock("@/src/db/social", () => ({ readSocial: social, updateSocial: vi.fn() }));
vi.mock("@/src/db/seo", () => ({ listSeo: list, readSeo: item, insertSeo: vi.fn(), updateSeo: vi.fn(), deleteSeoOverride: vi.fn() }));
vi.mock("@/src/auth/server", () => ({ createSupabaseServerClient: client }));
import { GET as getHero } from "./hero/route";
import { GET as getAbout } from "./about/route";
import { GET as getSocial } from "./social/route";
import { GET as getSeo } from "./seo/route";
import { GET as getSeoItem } from "./seo/[id]/route";

const seo = { id: "00000000-0000-4000-8000-000000000001", path: "/", title: "Saved", description: "Saved description" };
const cases = [
  { name: "Hero", call: () => getHero(new NextRequest("https://portfolio.test/api/admin/hero")), read: hero, content: initialHero },
  { name: "About", call: () => getAbout(new NextRequest("https://portfolio.test/api/admin/about")), read: about, content: initialAbout },
  { name: "Social", call: () => getSocial(new NextRequest("https://portfolio.test/api/admin/social")), read: social, content: initialSocial },
  { name: "SEO collection", call: () => getSeo(new NextRequest("https://portfolio.test/api/admin/seo")), read: list, content: [seo] },
  { name: "SEO item", call: () => getSeoItem(new NextRequest(`https://portfolio.test/api/admin/seo/${seo.id}`), { params: Promise.resolve({ id: seo.id }) }), read: item, content: seo },
];
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_USER_ID", ""); vi.stubEnv("SUPABASE_URL", ""); vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
  client.mockImplementation(() => { throw new Error("Auth should not be called"); });
  hero.mockResolvedValue(initialHero); about.mockResolvedValue(initialAbout); social.mockResolvedValue(initialSocial); list.mockResolvedValue([seo]); item.mockResolvedValue(seo);
});
afterEach(() => vi.unstubAllEnvs());

it.each(cases)("exposes $name anonymously without auth configuration, cookies or session writes", async ({ call, content }) => {
  const response = await call();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(content);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(client).not.toHaveBeenCalled();
});
it.each(cases)("returns safe public errors for $name without auth checks", async ({ call, read }) => {
  read.mockRejectedValue(new Error("private DB detail"));
  const response = await call();
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: { code: "INTERNAL_ERROR", message: "Unable to complete this request. Try again later." } });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(client).not.toHaveBeenCalled();
});
