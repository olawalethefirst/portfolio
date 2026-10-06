const DISCOVERY_DISTANCE_RATIO = 0.5;

export function calculatePrismDiscoveryOffsetX(homeOffset: number, progress: number) {
  const normalizedProgress = normalizePrismDiscoveryProgress(progress);
  return homeOffset * (1 - normalizedProgress);
}

export function normalizePrismDiscoveryProgress(progress: number) {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(Math.max(progress, 0), 1);
}

export function calculatePrismDiscoveryDistance(
  homeDistance: number,
  progress: number,
) {
  const normalizedProgress = normalizePrismDiscoveryProgress(progress);
  const discoveryDistance = homeDistance * DISCOVERY_DISTANCE_RATIO;

  return (
    homeDistance + (discoveryDistance - homeDistance) * normalizedProgress
  );
}
