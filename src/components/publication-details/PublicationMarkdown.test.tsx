import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PublicationMarkdown } from "./PublicationMarkdown";

it("previews article formatting and raster images while rejecting executable destinations", () => {
  const { container } = render(<PublicationMarkdown>{'## Section\n\n1. Item\n\n```ts\nconst a = 1;\n```\n\n![Chart](data:image/png;base64,cGl4ZWxz)\n\n[Bad](javascript:alert%281%29)\n\n![Unsafe](data:image/svg+xml;base64,cGl4ZWxz)\n\n<script>alert(1)</script>'}</PublicationMarkdown>);
  expect(screen.getByRole("heading", { name: "Section", level: 2 })).toBeTruthy();
  expect(screen.getByRole("listitem").textContent).toBe("Item");
  expect(screen.getByText("const a = 1;").closest("pre")).toBeTruthy();
  expect(screen.getByRole("img", { name: "Chart" }).getAttribute("src")).toBe("data:image/png;base64,cGl4ZWxz");
  expect(screen.getByText("Bad").getAttribute("href")).toBeNull();
  expect(screen.getByAltText("Unsafe").getAttribute("src")).toBeNull();
  expect(container.querySelector("script")).toBeNull();
});
