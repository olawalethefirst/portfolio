"use client";

import { X } from "lucide-react";
import { motion, useTransform } from "motion/react";
import { useCallback, useEffect, useId, useReducer, useRef } from "react";

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
  const {
    beginTransition,
    panelProgress,
    progress,
    visualPhase,
  } = useNavigationPanelMotion(isOpen);
  const isPanelInteractive = isOpen && visualPhase === "open";
  /**
   * The panel is hinged at its bottom edge, which the wrapper below pins with
   * `bottom-[calc(100%+0.75rem)]`. The reveal must not fight that pin.
   *
   * A size animation — `height`, or the `0fr -> 1fr` grid trick — cannot express
   * the hinge, because it pins nothing on its own: whichever edge stays put is
   * whatever layout already fixed, and normal flow fixes the *top* of the
   * content. That leaves the box growing upward while the card inside it slides
   * upward too, which reads as expanding from the centre. Clipping instead
   * leaves the card fully laid out and motionless and moves only the visible
   * cut, so every edge is pinned for free.
   *
   * The radius matches `rounded-2xl` on the Surface in NavigationPanelContent
   * so the revealed strip keeps the card's corners rather than showing a square
   * cut. Keep the two in sync.
   */
  const clipPath = useTransform(
    panelProgress,
    (value) => `inset(${(1 - value) * 100}% 0 0 0 round 1rem)`,
  );
  const activeControl =
    visualPhase === "closed"
      ? "primary"
      : visualPhase === "open"
        ? "secondary"
        : "none";

  const openPanel = useCallback((view: NavigationPanelView) => {
    openedFromRef.current = view;
    restoreLauncherFocusRef.current = false;
    beginTransition();
    dispatch({ type: "open", view });
  }, [beginTransition]);

  const closePanel = useCallback((restoreLauncherFocus: boolean) => {
    restoreLauncherFocusRef.current = restoreLauncherFocus;
    beginTransition();
    dispatch({ type: "close" });
  }, [beginTransition]);

  const dismissPanel = useCallback(
    (reason: DismissReason) => closePanel(reason === "escape"),
    [closePanel],
  );

  useDismissibleRegion({
    isEnabled: isOpen,
    onDismiss: dismissPanel,
    ref: regionRef,
  });

  useEffect(() => {
    if (visualPhase === "open") {
      panelRef.current
        ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus();

      return;
    }

    if (visualPhase !== "closed" || !restoreLauncherFocusRef.current) return;

    restoreLauncherFocusRef.current = false;
    const launcher =
      openedFromRef.current === "navigation"
        ? menuButtonRef.current
        : settingsButtonRef.current;

    launcher?.focus();
  }, [visualPhase]);

  return (
    <div
      ref={regionRef}
      className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-5"
    >
      <div
        ref={panelRef}
        aria-hidden={!isPanelInteractive || undefined}
        aria-label={
          isOpen ? "Site navigation and display settings" : undefined
        }
        className={
          "absolute bottom-[calc(100%+0.75rem)] w-[calc(100%-2.5rem)] max-w-md " +
          (isPanelInteractive ? "pointer-events-auto" : "pointer-events-none")
        }
        id={panelId}
        inert={!isPanelInteractive || undefined}
        role={isOpen ? "dialog" : undefined}
      >
        <motion.div style={{ clipPath }}>
          <NavigationPanelContent
            fontScale={fontScale}
            navigationItems={navigationItems}
            onFontScaleChange={onFontScaleChange}
            onModeChange={onModeChange}
            onNavigate={() => closePanel(false)}
            onThemeColorChange={onThemeColorChange}
            onViewChange={(view) => dispatch({ type: "select", view })}
            selectedMode={selectedMode}
            selectedThemeColor={selectedThemeColor}
            themeOptions={themeOptions}
            view={panelState.view}
          />
        </motion.div>
      </div>

      <AnimatedScaleSwap
        active={activeControl}
        primary={
          <NavPill
            className="pointer-events-auto"
            isExpanded={isOpen}
            menuButtonRef={menuButtonRef}
            onMenuPress={() => openPanel("navigation")}
            onSettingsPress={() => openPanel("settings")}
            panelId={panelId}
            settingsButtonRef={settingsButtonRef}
          />
        }
        progress={progress}
        secondary={
          <Surface
            className="pointer-events-auto rounded-full p-2"
            material="solid"
          >
            <Button
              aria-label="Close navigation and settings"
              className="border-muted/50"
              isIconOnly
              onPress={() => closePanel(true)}
              size="lg"
              variant="outline"
            >
              <X aria-hidden="true" />
            </Button>
          </Surface>
        }
      />
    </div>
  );
}
