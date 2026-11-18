import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const { cookieValues } = vi.hoisted(() => ({
  cookieValues: {} as Record<string, string>,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name in cookieValues ? { name, value: cookieValues[name] } : undefined,
  }),
}));
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "geist-sans" }),
  Geist_Mono: () => ({ variable: "geist-mono" }),
}));
vi.mock("@/src/components/ui/ToastProvider", () => ({ ToastProvider: () => null }));

import RootLayout from "./layout";

const render = async () =>
  renderToStaticMarkup(await RootLayout({ children: <p>content</p> } as never));

beforeEach(() => {
  for (const key of Object.keys(cookieValues)) delete cookieValues[key];
});

it("renders the default theme when the visitor has not chosen", async () => {
  expect(await render()).toContain('data-theme="chartreuse" data-mode="light"');
});

it("renders the visitor's saved choices on the server", async () => {
  cookieValues["portfolio-theme"] = "copper";
  cookieValues["portfolio-mode"] = "dark";
  expect(await render()).toContain('data-theme="copper" data-mode="dark"');
});

it("resolves each dimension independently and ignores unknown values", async () => {
  cookieValues["portfolio-theme"] = "plum";
  cookieValues["portfolio-mode"] = "sepia";
  expect(await render()).toContain('data-theme="plum" data-mode="light"');
});

it("still renders the page content", async () => {
  expect(await render()).toContain("<p>content</p>");
});
