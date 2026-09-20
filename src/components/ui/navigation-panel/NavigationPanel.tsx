"use client";

import { X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useId, useReducer, useRef } from "react";

import { Button } from "../Button";
import { Surface } from "../Surface";
import { AnimatedAutoHeight } from "./AnimatedAutoHeight";
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
    shouldReduceMotion,
    visualPhase,
  } = useNavigationPanelMotion(isOpen);
  const isPanelInteractive = isOpen && visualPhase === "open";
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
        <AnimatedAutoHeight progress={panelProgress}>
          <motion.div
            layout={shouldReduceMotion ? false : "size"}
            style={{ transformOrigin: "bottom center" }}
            transition={{
              layout: {
                duration: 0.24,
                ease: [0.22, 1, 0.36, 1],
              },
            }}
          >
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
        </AnimatedAutoHeight>
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
