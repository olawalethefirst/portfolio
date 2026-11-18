import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ErrorPage } from "./ErrorPage";

it("shows the message under a level-one heading with a decorative icon", () => {
  const { container } = render(<ErrorPage title="Page not found" message="It may have moved." />);
  expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
  expect(screen.getByText("It may have moved.")).toBeTruthy();
  const icon = container.querySelector("svg");
  expect(icon?.getAttribute("aria-hidden")).toBe("true");
});

it("links back to the home page by default", () => {
  render(<ErrorPage title="T" message="M" />);
  expect(screen.getByRole("link", { name: "Back to home" }).getAttribute("href")).toBe("/");
});

it("accepts a different label and destination", () => {
  render(<ErrorPage title="T" message="M" actionLabel="Browse publications" href="/#publications" />);
  const link = screen.getByRole("link", { name: "Browse publications" });
  expect(link.getAttribute("href")).toBe("/#publications");
});
