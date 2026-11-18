import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("./globals.css", () => ({}));

import ErrorBoundary from "./error";
import GlobalError from "./global-error";
import NotFound from "./not-found";
import PublicationNotFound from "./publications/[id]/not-found";

afterEach(() => vi.restoreAllMocks());

it("explains a missing page and links home", () => {
  render(<NotFound />);
  expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/");
});

it("gives a missing publication its own message", () => {
  render(<PublicationNotFound />);
  expect(screen.getByRole("heading", { level: 1, name: "Publication not found" })).toBeTruthy();
  expect(screen.getByText(/unpublished/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/");
});

it("shows the segment error page and logs the error", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const error = Object.assign(new Error("boom"), { digest: "abc" });
  render(<ErrorBoundary error={error} />);
  expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/");
  expect(log).toHaveBeenCalledWith(error);
});

it("renders its own document with the dark default and the home link", () => {
  const html = renderToStaticMarkup(<GlobalError error={new Error("root failed")} />);
  expect(html).toContain('<html lang="en" data-theme="chartreuse" data-mode="dark"');
  expect(html).toContain("<title>Something went wrong</title>");
  expect(html).toContain("The site hit a problem");
  expect(html).toContain('href="/"');
});
