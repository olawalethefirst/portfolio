"use client";

import { Pause, Play, SquareCenterlineDashedHorizontal } from "lucide-react";
import { useMotionValueEvent, type MotionValue } from "motion/react";
import { useState } from "react";

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
  onRealign: () => void;
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
  const [progress, setProgress] = useState(() => autoplayProgress.get());
  useMotionValueEvent(autoplayProgress, "change", setProgress);

  return (
    <Progress
      aria-label="Autoplay progress"
      maxValue={100}
      minValue={0}
      size="xs"
      value={isAutoplayRunning ? progress : 0}
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
  onRealign,
  className,
}: HeroControlPanelProps) {
  const autoplayVerb = isAutoplayRunning ? "Pause" : "Play";
  const autoplayLabel = `${autoplayVerb} autoplay`;
  const AutoplayIcon = isAutoplayRunning ? Pause : Play;

  return (
    <Surface
      aria-label="Hero controls"
      className={cn(
        "flex w-full max-w-[300px] flex-col gap-1 rounded-3xl p-3 ",
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
          startContent={<AutoplayIcon aria-hidden="true" className="size-3.5" />}
          variant="outline"
        >
          {autoplayVerb}
        </Button>
        <Button
          aria-label="Realign view"
          fullWidth
          onPress={onRealign}
          size="sm"
          startContent={
            <SquareCenterlineDashedHorizontal
              aria-hidden="true"
              className="size-3.5"
            />
          }
          variant="outline"
        >
          Realign
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
            <Tabs.List aria-label="Hero phase" className="w-full p-0.5">
              {PRISM_STATES.map((segment, index) => (
                <Tabs.Tab className="h-7 px-3 text-xs capitalize" id={segment} key={segment}>
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
