export type NavigationPanelView = "navigation" | "settings";

export interface NavigationPanelState {
  isOpen: boolean;
  view: NavigationPanelView;
}

export const initialNavigationPanelState: NavigationPanelState = {
  isOpen: false,
  view: "navigation",
};

export type NavigationPanelAction =
  | { type: "open" | "select"; view: NavigationPanelView }
  | { type: "close" };

export function navigationPanelReducer(
  state: NavigationPanelState,
  action: NavigationPanelAction,
): NavigationPanelState {
  if (action.type === "close") {
    return state.isOpen ? { ...state, isOpen: false } : state;
  }
  if (action.type === "select" && !state.isOpen) return state;
  if (state.isOpen && state.view === action.view) return state;

  return { isOpen: true, view: action.view };
}
