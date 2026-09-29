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
  canAutoplay: boolean;
  isAutoplayRunning: boolean;
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
      className="-translate-y-0.5"
    />
  );
}

export function HeroControlPanel({
  activeSegment,
  autoplayProgress,
  canAutoplay,
  isAutoplayRunning,
  onSegmentSelect,
  onAutoplayToggle,
  onRecentre,
  className,
}: HeroControlPanelProps) {
  const autoplayVerb = isAutoplayRunning ? "Pause" : "Play";
  const autoplayLabel = `${autoplayVerb} autoplay`;
  const AutoplayIcon = isAutoplayRunning ? Pause : Play;

  return (
    <Surface
      aria-label="Hero controls"
      className={cn(
        "flex w-full max-w-xs flex-col gap-1 rounded-3xl p-3 sm:max-w-sm",
        className,
      )}
      data-testid="hero-controls"
      material="glass"
    >
      <div className="grid grid-cols-2 gap-1">
        <Button
          aria-label={autoplayLabel}
          fullWidth
          isDisabled={!canAutoplay}
          onPress={onAutoplayToggle}
          size="sm"
          startContent={<AutoplayIcon aria-hidden="true" className="size-4" />}
          variant="outline"
        >
          {autoplayVerb}
        </Button>
        <Button
          aria-label="Recentre view"
          fullWidth
          onPress={onRecentre}
          size="sm"
          startContent={
            <SquareCenterlineDashedHorizontal
              aria-hidden="true"
              className="size-4"
            />
          }
          variant="outline"
        >
          Recenter
        </Button>
      </div>

      <div>
        <MotionProgress
          autoplayProgress={autoplayProgress}
          isAutoplayRunning={isAutoplayRunning}
        />
      </div>

      <div>
        <Tabs
          onSelectionChange={(key) => {
            const nextSegment = String(key);
            if (isPrismState(nextSegment)) onSegmentSelect(nextSegment);
          }}
          selectedKey={activeSegment}
          variant="primary"
      >
          <Tabs.ListContainer className="w-full">
            <Tabs.List aria-label="Hero phase" className="w-full">
              {PRISM_STATES.map((segment, index) => (
                <Tabs.Tab className="capitalize" id={segment} key={segment}>
                  {index > 0 ? <Tabs.Separator /> : null}
                  <Tabs.Indicator />
                  {segment}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>
    </Surface>
  );
}
