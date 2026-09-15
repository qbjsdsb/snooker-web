export const vec = (x = 0, z = 0) => ({ x, z });
export const length = (v) => Math.hypot(v.x, v.z);
export const dot = (a, b) => a.x * b.x + a.z * b.z;
export const normalize = (v) => {
  const m = length(v) || 1;
  return { x: v.x / m, z: v.z / m };
};
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
