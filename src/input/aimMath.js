const BASE_RADIANS_PER_PIXEL = 0.0019;

export function clampSensitivity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.35, Math.min(1.8, n));
}

export function aimDeltaFromPixels(deltaX, sensitivity = 1, fine = false) {
  const pixels = Number.isFinite(deltaX) ? deltaX : 0;
  const scale = clampSensitivity(sensitivity) * (fine ? 0.14 : 1);
  return pixels * BASE_RADIANS_PER_PIXEL * scale;
}

export function normalizeAngle(angle) {
  let a = Number.isFinite(angle) ? angle : 0;
  while (a <= -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}
