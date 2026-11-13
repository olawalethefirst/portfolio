import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AdminLogin } from "./AdminLogin";

it("submits the enabled GitHub login form with the requested return destination", () => {
  render(<AdminLogin returnTo="/admin/projects?platform=web" />);
  const form = screen.getByRole<HTMLFormElement>("form", { name: "GitHub sign-in" });
  expect(form.getAttribute("action")).toBe("/api/auth/github");
  expect(form.getAttribute("method")).toBe("post");
  expect(new FormData(form).get("returnTo")).toBe("/admin/projects?platform=web");
  expect(screen.getByRole("button", { name: "Continue with GitHub" }).hasAttribute("disabled")).toBe(false);
});

it("prevents duplicate submission and restores login when returning from the provider", () => {
  render(<AdminLogin />);
  const form = screen.getByRole("form", { name: "GitHub sign-in" });
  const first = new Event("submit", { bubbles: true, cancelable: true });
  fireEvent(form, first);
  expect(first.defaultPrevented).toBe(false);
  const duplicate = new Event("submit", { bubbles: true, cancelable: true });
  fireEvent(form, duplicate);
  expect(duplicate.defaultPrevented).toBe(true);
  expect(screen.getByRole("button", { name: "Continue with GitHub" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("status").textContent).toBe("Signing in…");
  expect(screen.getByRole("link", { name: "Back to portfolio" }).getAttribute("href")).toBe("/");
  fireEvent(window, new Event("pageshow"));
  expect(screen.getByRole("button", { name: "Continue with GitHub" }).hasAttribute("disabled")).toBe(false);
  expect(screen.queryByRole("status")).toBeNull();
});

it("keeps GitHub sign-in available after access denial", () => {
  render(<AdminLogin accessDenied />);
  expect(screen.getByRole("alert").textContent).toBe("This account doesn’t have admin access.");
  expect(screen.getByRole("button", { name: "Continue with GitHub" }).hasAttribute("disabled")).toBe(false);
});
