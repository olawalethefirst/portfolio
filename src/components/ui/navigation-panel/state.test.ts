import { expect, test } from "vitest";

import { initialNavigationPanelState, navigationPanelReducer } from "./state";

test("the launcher opens the requested panel view", () => {
  expect(
    navigationPanelReducer(initialNavigationPanelState, {
      type: "open",
      view: "navigation",
    }),
  ).toEqual({ isOpen: true, view: "navigation" });
  expect(
    navigationPanelReducer(initialNavigationPanelState, {
      type: "open",
      view: "settings",
    }),
  ).toEqual({ isOpen: true, view: "settings" });
});

test("the segment control switches an open panel view", () => {
  expect(
    navigationPanelReducer(
      { isOpen: true, view: "navigation" },
      {
        type: "select",
        view: "settings",
      },
    ),
  ).toEqual({ isOpen: true, view: "settings" });
});

test("segment selection cannot open a closed panel", () => {
  expect(
    navigationPanelReducer(initialNavigationPanelState, {
      type: "select",
      view: "settings",
    }),
  ).toEqual(initialNavigationPanelState);
});

test("dismissal closes the panel while retaining its rendered view", () => {
  expect(
    navigationPanelReducer(
      { isOpen: true, view: "navigation" },
      { type: "close" },
    ),
  ).toEqual({ isOpen: false, view: "navigation" });
  expect(
    navigationPanelReducer(
      { isOpen: true, view: "settings" },
      { type: "close" },
    ),
  ).toEqual({ isOpen: false, view: "settings" });
});
