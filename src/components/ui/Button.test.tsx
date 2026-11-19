import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Button } from "./Button";

it("squares a text link but leaves an icon-only link to its own shape", () => {
  render(
    <>
      <Button href="/a">Text link</Button>
      <Button href="/b" isIconOnly aria-label="Icon link">
        <span aria-hidden="true">+</span>
      </Button>
    </>,
  );
  expect(screen.getByRole("link", { name: "Text link" }).className).toContain("rounded-none");
  const icon = screen.getByRole("link", { name: "Icon link" });
  expect(icon.className).not.toContain("rounded-none");
  expect(icon.getAttribute("href")).toBe("/b");
});
