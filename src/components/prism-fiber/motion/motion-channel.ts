export interface MotionChannel<TTarget> {
  snap(target: TTarget): void;
  beginTransition(target: TTarget): void;
  update(timelineProgress: number): void;
}
