const CAMERA_FOV_DEGREES = 50;
const PRISM_BOUNDING_WIDTH = 1.2;
const PRISM_BOUNDING_HEIGHT = 1.2;
const MIN_FRAME_SIZE = 0.001;

export interface PrismHomeFrame {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface PrismHomeView {
  readonly distance: number;
  readonly frame: PrismHomeFrame;
  readonly viewOffsetX: number;
  readonly viewOffsetY: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function clampFrame(frame: PrismHomeFrame): PrismHomeFrame {
  const left = clamp(frame.left, 0, 1 - MIN_FRAME_SIZE);
  const top = clamp(frame.top, 0, 1 - MIN_FRAME_SIZE);
  const right = clamp(frame.left + frame.width, left + MIN_FRAME_SIZE, 1);
  const bottom = clamp(frame.top + frame.height, top + MIN_FRAME_SIZE, 1);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

export function calculatePrismHomeView(
  requestedFrame: PrismHomeFrame,
  canvasAspect: number,
): PrismHomeView {
  const frame = clampFrame(requestedFrame);
  const safeAspect = Math.max(canvasAspect, MIN_FRAME_SIZE);
  const halfVerticalFovTangent = Math.tan(
    (CAMERA_FOV_DEGREES * Math.PI) / 360,
  );
  const widthDistance =
    PRISM_BOUNDING_WIDTH /
    (2 * halfVerticalFovTangent * safeAspect * frame.width);
  const heightDistance =
    PRISM_BOUNDING_HEIGHT /
    (2 * halfVerticalFovTangent * frame.height);
  const centerX = frame.left + frame.width / 2;
  const centerY = frame.top + frame.height / 2;

  return {
    distance: Math.max(widthDistance, heightDistance),
    frame,
    viewOffsetX: -(centerX * 2 - 1) / 2,
    viewOffsetY: (1 - centerY * 2) / 2,
  };
}
