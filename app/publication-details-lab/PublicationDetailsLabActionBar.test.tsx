import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicationDetailsLabActionBar } from "./PublicationDetailsLabActionBar";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
}));

describe("PublicationDetailsLabActionBar", () => {
  beforeEach(() => {
    navigation.push.mockClear();
  });

  it("returns to the component lab", () => {
    render(<PublicationDetailsLabActionBar />);

    fireEvent.click(
      screen.getByRole("button", { name: "Back to component lab" }),
    );

    expect(navigation.push).toHaveBeenCalledWith("/");
  });
});
