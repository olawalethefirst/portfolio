import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AdminLogin } from "./AdminLogin";

it("keeps disconnected sign-in unavailable and the portfolio link usable", () => {
  render(<AdminLogin />);
  const signIn = screen.getByRole("button", { name: "Continue with Google" });
  expect(signIn.hasAttribute("disabled")).toBe(true);
  expect(screen.queryByRole("status")).toBeNull();
  expect(signIn.hasAttribute("aria-describedby")).toBe(false);
  expect(screen.getByRole("link", { name: "Back to portfolio" }).getAttribute("href")).toBe("/");
});

it("prevents repeated sign-in while pending and keeps Back available", async () => {
  let finish!: () => void;
  const signIn = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  render(<AdminLogin onSignIn={signIn} />);
  const button = screen.getByRole("button", { name: "Continue with Google" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(signIn).toHaveBeenCalledTimes(1);
  expect(button.hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("status").textContent).toBe("Signing in…");
  expect(screen.getByRole("link", { name: "Back to portfolio" }).getAttribute("href")).toBe("/");
  await act(async () => finish());
  expect(button.hasAttribute("disabled")).toBe(false);
  expect(screen.queryByRole("status")).toBeNull();
});

it("announces sign-in failure and allows retry without exposing provider errors", async () => {
  const signIn = vi.fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error("Internal provider detail"))
    .mockResolvedValueOnce();
  render(<AdminLogin onSignIn={signIn} />);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t sign in. Please try again.");
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("alert")).toBeNull();
});

it("presents access denial with the same sign-in action available for another account", () => {
  const signIn = vi.fn<() => Promise<void>>().mockResolvedValue();
  render(<AdminLogin onSignIn={signIn} accessDenied />);
  expect(screen.getByRole("alert").textContent).toBe("This account doesn’t have admin access.");
  expect(screen.getByRole("button", { name: "Continue with Google" }).hasAttribute("disabled")).toBe(false);
});
