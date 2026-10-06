"use client";

import { X } from "lucide-react";
import { motion, useTransform } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
} from "react";

import { Button } from "../Button";
import { Surface } from "../Surface";
import { AnimatedScaleSwap } from "./AnimatedScaleSwap";
import { NavPill } from "./NavPill";
import {
  NavigationPanelContent,
  type NavigationPanelLink,
  type NavigationPanelThemeOption,
  type ThemeMode,
} from "./NavigationPanelContent";
import {
  initialNavigationPanelState,
  navigationPanelReducer,
} from "./state";
import type { NavigationPanelView } from "./state";
import {
  type DismissReason,
  useDismissibleRegion,
} from "./useDismissibleRegion";
import { useNavigationPanelMotion } from "./useNavigationPanelMotion";

export interface NavigationPanelProps {
  navigationItems: readonly NavigationPanelLink[];
  themeOptions: readonly NavigationPanelThemeOption[];
  selectedThemeColor?: string;
  onThemeColorChange: (color: string) => void;
  selectedMode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
}

export function NavigationPanel({
  navigationItems,
  themeOptions,
  selectedThemeColor,
  onThemeColorChange,
  selectedMode,
  onModeChange,
  fontScale,
  onFontScaleChange,
}: NavigationPanelProps) {
  const panelId = useId();
  const [panelState, dispatch] = useReducer(
    navigationPanelReducer,
    initialNavigationPanelState,
  );
  const regionRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const openedFromRef = useRef<NavigationPanelView>("navigation");
  const restoreLauncherFocusRef = useRef(false);
  const isOpen = panelState.isOpen;
  const { panelProgress, progress } = useNavigationPanelMotion(isOpen);
  /**
   * Clip from the top while the wrapper remains pinned above the launcher. The
   * card stays fully laid out, so its text and controls keep their natural size
   * throughout the reveal.
   */
  const clipPath = useTransform(
    panelProgress,
    (value) => `inset(${(1 - value) * 100}% 0 0 0 round 1rem)`,
  );
  const activeControl = isOpen ? "secondary" : "primary";

  const openPanel = useCallback((view: NavigationPanelView) => {
    openedFromRef.current = view;
    restoreLauncherFocusRef.current = false;
    dispatch({ type: "open", view });
  }, []);

  const closePanel = useCallback((restoreLauncherFocus: boolean) => {
    restoreLauncherFocusRef.current = restoreLauncherFocus;
    dispatch({ type: "close" });
  }, []);

  const dismissPanel = useCallback(
    (reason: DismissReason) => closePanel(reason === "escape"),
    [closePanel],
  );

  /**
   * `NavigationPanelContent` is memoised, so every prop it receives has to keep
   * its identity so opening and closing the same view can skip the panel body.
   */
  const navigate = useCallback(() => closePanel(false), [closePanel]);

  const openNavigation = useCallback(() => openPanel("navigation"), [openPanel]);

  const openSettings = useCallback(() => openPanel("settings"), [openPanel]);

  const closeWithLauncherFocus = useCallback(() => closePanel(true), [closePanel]);

  const selectView = useCallback((view: NavigationPanelView) => {
    dispatch({ type: "select", view });
  }, []);

  useDismissibleRegion({
    isEnabled: isOpen,
    onDismiss: dismissPanel,
    ref: regionRef,
  });

  // Focus follows logical state after inert attributes update, independently
  // of the decorative animation. Outside presses keep their own focus target.
  useEffect(() => {
    if (isOpen) {
      panelRef.current
        ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus({ preventScroll: true });
      return;
    }

    if (!restoreLauncherFocusRef.current) return;
    restoreLauncherFocusRef.current = false;
    const launcher = openedFromRef.current === "navigation"
      ? menuButtonRef.current
      : settingsButtonRef.current;
    launcher?.focus({ preventScroll: true });
  }, [isOpen]);

  /**
   * The two swapped controls are built here rather than inline in the props
   * below, so React can skip their subtrees by element identity on the renders
   * that do not concern them. `AnimatedScaleSwap` is memoised for the same
   * reason, so unrelated settings changes can skip the control swap.
   *
   * The launcher still rebuilds whenever the panel opens or closes, because
   * `aria-expanded` is bound to that; it sits out tab and settings changes.
   * The close control depends on nothing that
   * changes, so it is built once.
   */
  const launcher = useMemo(
    () => (
      <NavPill
        className="pointer-events-auto"
        isExpanded={isOpen}
        menuButtonRef={menuButtonRef}
        onMenuPress={openNavigation}
        onSettingsPress={openSettings}
        panelId={panelId}
        settingsButtonRef={settingsButtonRef}
      />
    ),
    [isOpen, openNavigation, openSettings, panelId],
  );

  const closeControl = useMemo(
    () => (
      <Surface
        className="pointer-events-auto rounded-full p-2"
        material="solid"
      >
        <Button
          aria-label="Close navigation and settings"
          className="border-muted/50"
          isIconOnly
          onPress={closeWithLauncherFocus}
          size="sm"
          variant="outline"
        >
          <X aria-hidden="true" />
        </Button>
      </Surface>
    ),
    [closeWithLauncherFocus],
  );

  return (
    <div
      ref={regionRef}
      className="pointer-events-none fixed inset-x-0 bottom-2 z-20 flex justify-center px-5"
    >
      <div
        ref={panelRef}
        aria-hidden={!isOpen || undefined}
        aria-label={
          isOpen ? "Site navigation and display settings" : undefined
        }
        className={
          "absolute bottom-[calc(100%+0.75rem)] w-[calc(100%-2.5rem)] max-w-md " +
          (isOpen ? "pointer-events-auto" : "pointer-events-none")
        }
        id={panelId}
        inert={!isOpen || undefined}
        role={isOpen ? "dialog" : undefined}
      >
        <motion.div style={{ clipPath }}>
          <NavigationPanelContent
            fontScale={fontScale}
            navigationItems={navigationItems}
            onFontScaleChange={onFontScaleChange}
            onModeChange={onModeChange}
            onNavigate={navigate}
            onThemeColorChange={onThemeColorChange}
            onViewChange={selectView}
            selectedMode={selectedMode}
            selectedThemeColor={selectedThemeColor}
            themeOptions={themeOptions}
            view={panelState.view}
          />
        </motion.div>
      </div>

      <AnimatedScaleSwap
        active={activeControl}
        primary={launcher}
        progress={progress}
        secondary={closeControl}
      />
    </div>
  );
}
