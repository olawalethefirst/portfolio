import type { ModelEntryRotation, ProjectPlatform } from "./ProjectDeviceStage";

/** Used when a project does not author its own entry rotation. */
export const defaultModelEntryRotations: Record<ProjectPlatform, ModelEntryRotation> = {
  mobile: { initial: [0, Math.PI / 2, 0], visible: [0, 0, 0] },
  web: { initial: [0, 0, 0], visible: [0, -Math.PI / 2, 0] },
};

interface RotationSafeFraming {
  radius: number;
  distance: number;
  fov: number;
  aspect: number;
  preferredScale: number;
}

export function getRotationSafeScale({
  radius,
  distance,
  fov,
  aspect,
  preferredScale,
}: RotationSafeFraming) {
  if (radius <= 0 || aspect <= 0 || distance <= 0) return 0;

  const verticalHalfAngle = fov * Math.PI / 360;
  const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * aspect);
  // A centered sphere bounds every rotation, including perspective depth.
  // Leave 10% of the available radius as clearance from the canvas edges.
  const availableRadius = distance * Math.sin(Math.min(verticalHalfAngle, horizontalHalfAngle)) * 0.9;
  return Math.min(preferredScale, availableRadius / radius);
}
