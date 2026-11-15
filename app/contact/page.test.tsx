import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/src/db/social", () => ({ readSocial: vi.fn() }));
vi.mock("../LabThemeShell", () => ({ LabThemeShell: ({ children }: { children: ReactNode }) => children }));

import { readSocial } from "@/src/db/social";
import ContactPage from "./page";

const saved = { github: "https://github.com/saved", linkedin: "https://linkedin.com/in/saved", x: "https://x.com/saved" };
beforeEach(() => { vi.mocked(readSocial).mockReset(); });

it("renders current saved profile links on each full server request", async () => {
  vi.mocked(readSocial).mockResolvedValueOnce(saved).mockResolvedValueOnce({ ...saved, github: "https://github.com/updated" });
  const page = render(await ContactPage());
  for (const [label, id] of [["GitHub", "github"], ["LinkedIn", "linkedin"], ["X", "x"]] as const) {
    const link = screen.getByRole("link", { name: `Visit ${label} profile (opens in a new tab)` });
    expect(link.getAttribute("href")).toBe(saved[id]);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  }
  page.unmount();
  render(await ContactPage());
  expect(screen.getByRole("link", { name: /Visit GitHub/ }).getAttribute("href")).toBe("https://github.com/updated");
});

it("reports missing content without rendering default profiles", async () => {
  vi.mocked(readSocial).mockResolvedValue(null);
  await expect(ContactPage()).rejects.toThrow("Social content was not found.");
});

it("propagates database failure without rendering default profiles", async () => {
  const failure = new Error("Read failed");
  vi.mocked(readSocial).mockRejectedValue(failure);
  await expect(ContactPage()).rejects.toBe(failure);
});
