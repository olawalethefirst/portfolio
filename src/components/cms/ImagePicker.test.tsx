import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ImagePicker } from "./ImagePicker";

const decode = vi.fn();
beforeEach(() => {
  decode.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: decode });
});
afterEach(() => { Reflect.deleteProperty(HTMLImageElement.prototype, "decode"); });

function Example() {
  const [value, setValue] = useState("/publication-cover.svg");
  return <ImagePicker value={value} alt="Current cover" onChange={setValue} />;
}
function choose(name = "cover.png", type = "image/png") {
  fireEvent.change(screen.getByLabelText("Replace image"), {
    target: { files: [new File([name], name, { type })] },
  });
}

it("preserves the previous image on invalid format or decode failure, and permits retry", async () => {
  render(<Example />);
  choose("document.txt", "text/plain");
  expect(screen.getByRole("alert").textContent).toContain("JPEG, PNG or WebP");
  expect(screen.getByAltText("Current cover").getAttribute("src")).toBe("/publication-cover.svg");
  decode.mockRejectedValueOnce(new Error("Invalid image"));
  choose();
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("could not be read"));
  expect(screen.getByAltText("Current cover").getAttribute("src")).toBe("/publication-cover.svg");
  choose();
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("cover.png selected"));
  expect(screen.getByAltText("Current cover").getAttribute("src")).toMatch(/^data:image\/png/);
});

it("ignores an older decode finishing after a newer selection", async () => {
  let finishFirst!: () => void;
  decode.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
  render(<Example />);
  choose("first.png");
  await waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
  choose("second.png");
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("second.png selected"));
  const selected = screen.getByAltText("Current cover").getAttribute("src");
  await act(async () => finishFirst());
  expect(screen.getByAltText("Current cover").getAttribute("src")).toBe(selected);
  expect(screen.getByRole("status").textContent).toContain("second.png selected");
});

it("rejects oversized files before reading them", () => {
  render(<Example />);
  const file = new File(["image"], "large.png", { type: "image/png" });
  Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 + 1 });
  fireEvent.change(screen.getByLabelText("Replace image"), { target: { files: [file] } });
  expect(screen.getByRole("alert").textContent).toContain("10 MiB");
  expect(decode).not.toHaveBeenCalled();
  expect(screen.getByAltText("Current cover").getAttribute("src")).toBe("/publication-cover.svg");
});
