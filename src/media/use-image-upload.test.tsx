import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("./upload-client", () => ({ uploadImage: upload }));
import { useImageUpload } from "./use-image-upload";
const config = { url: "https://example.supabase.co", publishableKey: "public" };
const image = { source: "https://example.supabase.co/image.png", descriptor: { assetId: "id", bucket: "media", path: "id.png" } };
const file = new File(["image"], "image.png", { type: "image/png" });
function mount() {
  const client = new QueryClient();
  return renderHook(() => useImageUpload(config), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
}
beforeEach(() => vi.resetAllMocks());
it("exposes mutation pending/error/variables and retries only when explicitly requested", async () => {
  upload.mockRejectedValueOnce(new Error("Upload failed.")).mockResolvedValue(image);
  const { result } = mount();
  act(() => result.current.mutate(file));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error?.message).toBe("Upload failed.");
  expect(result.current.variables).toBe(file);
  expect(upload).toHaveBeenCalledTimes(1);
  act(() => result.current.mutate(result.current.variables!));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(image);
  expect(result.current.error).toBeNull();
  expect(upload).toHaveBeenCalledTimes(2);
});
it("does not call field success callbacks after unmount", async () => {
  let finish!: (value: typeof image) => void;
  upload.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const changed = vi.fn();
  const view = mount();
  act(() => view.result.current.mutate(file, { onSuccess: changed }));
  await waitFor(() => expect(view.result.current.isPending).toBe(true));
  view.unmount();
  await act(async () => finish(image));
  expect(changed).not.toHaveBeenCalled();
});
