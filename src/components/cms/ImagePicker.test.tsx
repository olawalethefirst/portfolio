import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useImageUpload } from "@/src/media/use-image-upload";
const { uploadImage } = vi.hoisted(() => ({ uploadImage: vi.fn() }));
vi.mock("@/src/media/upload-client", () => ({ uploadImage }));
import { ImagePicker } from "./ImagePicker";

const decode = vi.fn();
beforeEach(() => {
  decode.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(HTMLImageElement.prototype, "decode", {
    configurable: true,
    value: decode,
  });
});
afterEach(() => {
  Reflect.deleteProperty(HTMLImageElement.prototype, "decode");
});

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
  expect(screen.getByAltText("Current cover").getAttribute("src")).toBe(
    "/publication-cover.svg",
  );
  decode.mockRejectedValueOnce(new Error("Invalid image"));
  choose();
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "could not be read",
    ),
  );
  expect(screen.getByAltText("Current cover").getAttribute("src")).toBe(
    "/publication-cover.svg",
  );
  choose();
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain(
      "cover.png selected",
    ),
  );
  expect(screen.getByAltText("Current cover").getAttribute("src")).toMatch(
    /^data:image\/png/,
  );
});

it("ignores an older decode finishing after a newer selection", async () => {
  let finishFirst!: () => void;
  decode.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishFirst = resolve;
      }),
  );
  render(<Example />);
  choose("first.png");
  await waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
  choose("second.png");
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain(
      "second.png selected",
    ),
  );
  const selected = screen.getByAltText("Current cover").getAttribute("src");
  await act(async () => finishFirst());
  expect(screen.getByAltText("Current cover").getAttribute("src")).toBe(
    selected,
  );
  expect(screen.getByRole("status").textContent).toContain(
    "second.png selected",
  );
});

it("rejects oversized files before reading them", () => {
  render(<Example />);
  const file = new File(["image"], "large.png", { type: "image/png" });
  Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 + 1 });
  fireEvent.change(screen.getByLabelText("Replace image"), {
    target: { files: [file] },
  });
  expect(screen.getByRole("alert").textContent).toContain("10 MiB");
  expect(decode).not.toHaveBeenCalled();
  expect(screen.getByAltText("Current cover").getAttribute("src")).toBe(
    "/publication-cover.svg",
  );
});

function UploadExample() {
  const [value, setValue] = useState("/publication-cover.svg");
  const upload = useImageUpload({
    url: "https://example.supabase.co",
    publishableKey: "public",
  });
  const select = (file: File) =>
    upload.mutate(file, { onSuccess: (image) => setValue(image.source) });
  return (
    <ImagePicker
      value={value}
      alt="Current cover"
      onChange={setValue}
      onFileSelect={select}
      isPending={upload.isPending}
      error={upload.error?.message}
      onRetry={
        upload.isError && upload.variables
          ? () => select(upload.variables!)
          : undefined
      }
    />
  );
}
it("pairs existing fields with mutation state, preserves failures and retries explicitly", async () => {
  let finish!: (value: { source: string }) => void;
  uploadImage
    .mockReset()
    .mockRejectedValueOnce(new Error("Upload failed."))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UploadExample />
    </QueryClientProvider>,
  );
  choose();
  await screen.findByRole("button", { name: "Retry upload" });
  expect(screen.getByAltText("Current cover").getAttribute("src")).toBe(
    "/publication-cover.svg",
  );
  expect(uploadImage).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Retry upload" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Replace image").matches(":disabled")).toBe(
      true,
    ),
  );
  expect(
    screen.getByRole("button", { name: "Remove image" }).matches(":disabled"),
  ).toBe(true);
  await act(async () =>
    finish({ source: "https://example.supabase.co/confirmed.png" }),
  );
  await waitFor(() =>
    expect(screen.getByAltText("Current cover").getAttribute("src")).toBe(
      "https://example.supabase.co/confirmed.png",
    ),
  );
  expect(uploadImage).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText("Replace image").matches(":disabled")).toBe(
    false,
  );
});

const stored =
  "https://abc.supabase.co/storage/v1/object/public/media/cover.png";
function stubClipboard(writeText: ReturnType<typeof vi.fn> | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

it("copies the stored image URL and reports success", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  stubClipboard(writeText);
  render(<ImagePicker value={stored} alt="Cover" onChange={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("URL copied."),
  );
  expect(writeText).toHaveBeenCalledExactlyOnceWith(stored);
});

it("reports a failed copy, including when the clipboard is unavailable", async () => {
  stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
  render(<ImagePicker value={stored} alt="Cover" onChange={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "could not be copied",
    ),
  );
  stubClipboard(undefined);
  fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "could not be copied",
    ),
  );
});

it("hides Copy URL without an image or in insertion mode, and disables it while uploading", () => {
  const { rerender } = render(
    <ImagePicker value="" alt="Cover" onChange={() => {}} />,
  );
  expect(screen.queryByRole("button", { name: "Copy URL" })).toBeNull();
  rerender(
    <ImagePicker value={stored} alt="Cover" onChange={() => {}} isPending />,
  );
  expect(
    (screen.getByRole("button", { name: "Copy URL" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  rerender(
    <ImagePicker
      value={stored}
      alt="Cover"
      presentation="insertion"
      onChange={() => {}}
    />,
  );
  expect(screen.queryByRole("button", { name: "Copy URL" })).toBeNull();
});

it("is keyboard operable", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  stubClipboard(writeText);
  render(<ImagePicker value={stored} alt="Cover" onChange={() => {}} />);
  const button = screen.getByRole("button", { name: "Copy URL" });
  button.focus();
  expect(document.activeElement).toBe(button);
  fireEvent.keyDown(button, { key: "Enter" });
  fireEvent.keyUp(button, { key: "Enter" });
  fireEvent.click(button);
  await waitFor(() => expect(writeText).toHaveBeenCalled());
});
