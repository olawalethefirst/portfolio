import { CmsShell } from "./CmsShell";
import type { ReactNode } from "react";
import { mockHeroApi } from "@/src/cms/test-support/mockHeroApi";
import { CmsQueryProvider } from "@/src/cms/CmsQueryProvider";
import {
  act,
  fireEvent,
  render as renderPage,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HeroEditor } from "./HeroEditor";

async function render(ui: ReactNode) {
  const page = renderPage(ui, { wrapper: CmsShell });
  await screen.findByRole("textbox", { name: "Headline" });
  return page;
}

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin/publications",
}));
// Keep the real public layout and CTA links; replace only the WebGL scene.
vi.mock("@/src/components/prism-fiber/Prism", () => ({ Prism: () => null }));

// Exercise the real preview without depending on dynamic-import scheduling.
vi.mock("next/dynamic", async () => {
  const { HeroPreview } = await import("./HeroPreview");
  return { default: () => HeroPreview };
});

beforeEach(() => {
  mockHeroApi();
  push.mockReset();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("scrollY", 360);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("opens only the edited Hero on demand and restores its unsaved values, focus and scroll", async () => {
  await render(
    <CmsQueryProvider accountId="test-owner">
      <HeroEditor />
    </CmsQueryProvider>,
  );
  const headline = screen.getByRole("textbox", { name: "Headline" });
  fireEvent.change(headline, { target: { value: "My unsaved hero" } });
  expect(screen.queryByRole("heading", { name: "My unsaved hero" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(
    await screen.findByRole("heading", { name: "My unsaved hero" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("navigation", { name: "Content navigation" }),
  ).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Exit preview" }),
  );
  fireEvent.keyDown(window, { key: "Escape" });
  expect(
    (screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement)
      .value,
  ).toBe("My unsaved hero");
  expect(
    screen.getByRole("status", { name: "Hero save status" }).textContent,
  ).toContain("Unsaved changes");
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Preview" }),
  );
  expect(window.scrollTo).toHaveBeenLastCalledWith({
    top: 360,
    behavior: "instant",
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  await screen.findByRole("heading", { name: "My unsaved hero" });
  fireEvent.click(screen.getByRole("button", { name: "Exit preview" }));
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Preview" }),
  );
});

it("discards Hero edits to the last saved values and disables discard during saving", async () => {
  let finish!: () => void;
  const request = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  mockHeroApi(request);
  await render(
    <CmsQueryProvider accountId="test-owner">
      <HeroEditor />
    </CmsQueryProvider>,
  );
  const headline = screen.getByRole("textbox", {
    name: "Headline",
  }) as HTMLInputElement;
  const discard = screen.getByRole("button", { name: "Discard changes" });
  expect(discard.hasAttribute("disabled")).toBe(true);
  fireEvent.change(headline, { target: { value: "Saved hero headline" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  expect(discard.hasAttribute("disabled")).toBe(true);
  await act(async () => finish());
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: "Hero save status" }).textContent,
    ).toBe("No unsaved changes"),
  );
  fireEvent.change(headline, { target: { value: "Unsaved replacement" } });
  fireEvent.click(discard);
  expect(headline.value).toBe("Saved hero headline");
  expect(discard.hasAttribute("disabled")).toBe(true);
  expect(
    screen.getByRole("status", { name: "Hero save status" }).textContent,
  ).toBe("No unsaved changes");
});

it("preserves edits after a failed save and retries", async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error("Save failed"))
    .mockResolvedValue(undefined);
  mockHeroApi(request);
  await render(
    <CmsQueryProvider accountId="test-owner">
      <HeroEditor />
    </CmsQueryProvider>,
  );
  const headline = screen.getByRole("textbox", {
    name: "Headline",
  }) as HTMLInputElement;
  fireEvent.change(headline, { target: { value: "Keep failed save" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(headline.value).toBe("Keep failed save");
  expect(
    screen.getByRole("status", { name: "Hero save status" }).textContent,
  ).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(
      screen.getByRole("status", { name: "Hero save status" }).textContent,
    ).toBe("No unsaved changes"),
  );
  expect(screen.queryByRole("alert")).toBeNull();
  expect(headline.value).toBe("Keep failed save");
});

it("blocks incomplete Hero saves, focuses the first error and clears errors on discard", async () => {
  await render(
    <CmsQueryProvider accountId="test-owner">
      <HeroEditor />
    </CmsQueryProvider>,
  );
  const eyebrow = screen.getByRole("textbox", {
    name: "Eyebrow",
  }) as HTMLInputElement;
  const headline = screen.getByRole("textbox", {
    name: "Headline",
  }) as HTMLInputElement;
  const savedHeadline = headline.value;
  fireEvent.change(eyebrow, { target: { value: "   " } });
  fireEvent.change(headline, { target: { value: "" } });
  const ideaDescription = within(
    screen.getByRole("region", { name: "Idea" }),
  ).getByRole("textbox", { name: "Description" });
  fireEvent.change(ideaDescription, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(document.activeElement).toBe(eyebrow));
  expect(eyebrow.getAttribute("aria-invalid")).toBe("true");
  expect(headline.getAttribute("aria-invalid")).toBe("true");
  expect(ideaDescription.getAttribute("aria-invalid")).toBe("true");
  expect(eyebrow.value).toBe("   ");
  expect(
    screen.getByRole("status", { name: "Hero save status" }).textContent,
  ).toContain("Unsaved changes");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(headline.value).toBe(savedHeadline);
  expect(eyebrow.getAttribute("aria-invalid")).not.toBe("true");
  expect(screen.queryByRole("alert")).toBeNull();
});

it.each([
  ["Work", "/#work"],
  ["Hire", "/contact"],
])(
  "uses the public %s destination without losing Hero edits",
  async (label, path) => {
    await render(
      <CmsQueryProvider accountId="test-owner">
        <HeroEditor />
      </CmsQueryProvider>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Headline" }), {
      target: { value: "Keep while opening links" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const link = await screen.findByRole("link", { name: label });
    expect(link.getAttribute("href")).toBe(path);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Exit preview" }));
    expect(
      (screen.getByRole("textbox", { name: "Headline" }) as HTMLInputElement)
        .value,
    ).toBe("Keep while opening links");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Preview" }),
    );
  },
);

it("shows nested length errors on blur, corrects them live and retains over-limit drafts in preview", async () => {
  const request = vi.fn();
  mockHeroApi(request);
  await render(
    <CmsQueryProvider accountId="test-owner">
      <HeroEditor />
    </CmsQueryProvider>,
  );
  const idea = () => within(screen.getByRole("region", { name: "Idea" }));
  const tagline = idea().getByRole("textbox", { name: "Tagline" });
  fireEvent.change(tagline, { target: { value: "x".repeat(27) } });
  expect(tagline.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.focus(tagline);
  fireEvent.blur(tagline);
  expect(tagline.getAttribute("aria-invalid")).toBe("true");
  expect(idea().getByText("Use 26 characters or fewer.")).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  fireEvent.click(await screen.findByRole("button", { name: "Exit preview" }));
  expect(
    (idea().getByRole("textbox", { name: "Tagline" }) as HTMLInputElement)
      .value,
  ).toBe("x".repeat(27));
  fireEvent.change(idea().getByRole("textbox", { name: "Tagline" }), {
    target: { value: "Corrected" },
  });
  expect(
    idea()
      .getByRole("textbox", { name: "Tagline" })
      .getAttribute("aria-invalid"),
  ).not.toBe("true");
});

it("locks fields and actions during Save and restores editing after failure", async () => {
  let fail!: (reason: Error) => void;
  const request = vi.fn(
    () =>
      new Promise<void>((_, reject) => {
        fail = reject;
      }),
  );
  mockHeroApi(request);
  await render(
    <CmsQueryProvider accountId="test-owner">
      <HeroEditor />
    </CmsQueryProvider>,
  );
  const headline = screen.getByRole("textbox", {
    name: "Headline",
  }) as HTMLInputElement;
  fireEvent.change(headline, { target: { value: "Submitted" } });
  fireEvent.submit(headline.closest("form")!);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  for (const field of screen.getAllByRole("textbox"))
    expect(field.matches(":disabled")).toBe(true);
  for (const name of ["Save changes", "Discard changes", "Preview"])
    expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(
      true,
    );
  expect(headline.closest("fieldset")?.getAttribute("aria-busy")).toBe("true");
  await act(async () => fail(new Error("Save failed")));
  await screen.findByRole("alert");
  expect(headline.matches(":disabled")).toBe(false);
  fireEvent.change(headline, { target: { value: "Corrected" } });
  expect(headline.value).toBe("Corrected");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("focuses the earliest invalid nested field and resets feedback on discard", async () => {
  const request = vi.fn();
  mockHeroApi(request);
  await render(
    <CmsQueryProvider accountId="test-owner">
      <HeroEditor />
    </CmsQueryProvider>,
  );
  const idea = within(screen.getByRole("region", { name: "Idea" })).getByRole(
    "textbox",
    { name: "Description" },
  );
  const iterate = within(
    screen.getByRole("region", { name: "Iterate" }),
  ).getByRole("textbox", { name: "Tagline" });
  fireEvent.change(iterate, { target: { value: "" } });
  fireEvent.change(idea, { target: { value: "x".repeat(57) } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(document.activeElement).toBe(idea));
  const ids = idea.getAttribute("aria-describedby")?.split(" ") ?? [];
  expect(
    ids.some(
      (id) =>
        document.getElementById(id)?.textContent ===
        "Use 56 characters or fewer.",
    ),
  ).toBe(true);
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(idea, { target: { value: "Corrected" } });
  expect(idea.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(iterate.getAttribute("aria-invalid")).not.toBe("true");
  fireEvent.change(iterate, { target: { value: "" } });
  expect(iterate.getAttribute("aria-invalid")).not.toBe("true");
});
