"use client";

import { Pause, Play, SquareCenterlineDashedHorizontal } from "lucide-react";
import type { MotionValue } from "motion/react";
import { useCallback, useSyncExternalStore } from "react";

import {
  PRISM_STATES,
  type PrismState,
} from "../../prism-fiber/state/prism-state";
import { Button } from "../Button";
import { Progress } from "../Progress";
import { Surface } from "../Surface";
import { Tabs } from "../Tabs";
import { cn } from "../utils";

export interface HeroControlPanelProps {
  activeSegment: PrismState;
  autoplayProgress: MotionValue<number>;
  isAutoplayRunning: boolean;
  hasEnteredZoom: boolean;
  hasRotationDrifted: boolean;
  isVisible: boolean;
  onSegmentSelect: (segment: PrismState) => void;
  onAutoplayToggle: () => void;
  onRecentre: () => void;
  className?: string;
}

interface MotionProgressProps {
  autoplayProgress: MotionValue<number>;
  isAutoplayRunning: boolean;
}

function isPrismState(value: string): value is PrismState {
  return PRISM_STATES.some((state) => state === value);
}

function MotionProgress({
  autoplayProgress,
  isAutoplayRunning,
}: MotionProgressProps) {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      isAutoplayRunning
        ? autoplayProgress.on("change", onStoreChange)
        : () => undefined,
    [autoplayProgress, isAutoplayRunning],
  );
  const getSnapshot = useCallback(
    () => isAutoplayRunning ? autoplayProgress.get() : 0,
    [autoplayProgress, isAutoplayRunning],
  );
  const progress = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <Progress
      aria-label="Autoplay progress"
      maxValue={100}
      minValue={0}
      size="xs"
      value={progress}
    />
  );
}

export function HeroControlPanel({
  activeSegment,
  autoplayProgress,
  isAutoplayRunning,
  hasEnteredZoom,
  hasRotationDrifted,
  isVisible,
  onSegmentSelect,
  onAutoplayToggle,
  onRecentre,
  className,
}: HeroControlPanelProps) {
  if (!isVisible) return null;

  const centerLabel = hasEnteredZoom
    ? "Recentre view"
    : `${isAutoplayRunning ? "Pause" : "Play"} autoplay`;
  const centerAction = hasEnteredZoom ? onRecentre : onAutoplayToggle;
  const CenterIcon = hasEnteredZoom
    ? SquareCenterlineDashedHorizontal
    : isAutoplayRunning
      ? Pause
      : Play;

  return (
    <Surface
      aria-label="Hero controls"
      className={cn(
        "flex w-full max-w-sm flex-col gap-1 rounded-3xl p-4 sm:p-5",
        className,
      )}
      material="glass"
    >
      <Tabs
        onSelectionChange={(key) => {
          const nextSegment = String(key);
          if (isPrismState(nextSegment)) onSegmentSelect(nextSegment);
        }}
        selectedKey={activeSegment}
        variant="secondary"
      >
        <Tabs.List
          aria-label="Hero phase"
          className="w-full rounded-3xl bg-default"
        >
          {PRISM_STATES.map((segment, index) => (
            <Tabs.Tab className="group capitalize" id={segment} key={segment}>
              {index > 0 ? <Tabs.Separator /> : null}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-3xl bg-segment opacity-0 transition-opacity duration-150 group-data-[selected=true]:opacity-100 motion-reduce:transition-none"
              />
              <span className="relative">{segment}</span>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <div className="relative flex min-h-10 items-center">
        <MotionProgress
          autoplayProgress={autoplayProgress}
          isAutoplayRunning={isAutoplayRunning}
        />
        <Button
          aria-label={centerLabel}
          className="absolute left-1/2 -translate-x-1/2 border-muted/50 bg-surface"
          isDisabled={hasEnteredZoom && !hasRotationDrifted}
          isIconOnly
          onPress={centerAction}
          size="sm"
          variant="outline"
        >
          <CenterIcon aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button size="sm" fullWidth>Explore</Button>
        <Button size="sm" fullWidth variant="secondary">
          Hire
        </Button>
      </div>
    </Surface>
  );
}
