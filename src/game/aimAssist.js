const EPS = 1e-9;

export function normalize2(v) {
  const len = Math.hypot(v.x, v.z);
  if (len < EPS) return { x: 1, z: 0 };
  return { x: v.x / len, z: v.z / len };
}

export function firstBallHit(cueBall, balls, direction) {
  if (!cueBall) return null;
  const d = normalize2(direction);
  let best = null;

  for (const ball of balls) {
    if (!ball || ball.id === cueBall.id || ball.pocketed) continue;
    const rx = ball.position.x - cueBall.position.x;
    const rz = ball.position.z - cueBall.position.z;
    const along = rx * d.x + rz * d.z;
    if (along <= 0) continue;

    const combined = cueBall.radius + ball.radius;
    const perpSq = rx * rx + rz * rz - along * along;
    const combinedSq = combined * combined;
    if (perpSq > combinedSq) continue;

    const offset = Math.sqrt(Math.max(0, combinedSq - perpSq));
    const t = along - offset;
    if (t < 0 || (best && t >= best.distance)) continue;

    const ghost = {
      x: cueBall.position.x + d.x * t,
      z: cueBall.position.z + d.z * t,
    };
    const nx = ball.position.x - ghost.x;
    const nz = ball.position.z - ghost.z;
    const n = normalize2({ x: nx, z: nz });
    const tangent = {
      x: d.x - n.x * (d.x * n.x + d.z * n.z),
      z: d.z - n.z * (d.x * n.x + d.z * n.z),
    };
    const tangentLen = Math.hypot(tangent.x, tangent.z);

    best = {
      ballId: ball.id,
      ball,
      distance: t,
      ghost,
      objectDirection: n,
      cueDirection: tangentLen > 0.03 ? normalize2(tangent) : null,
    };
  }

  return best;
}

export function angleFromPoint(cueBall, point, fallback = 0) {
  if (!cueBall || !point) return fallback;
  const dx = point.x - cueBall.position.x;
  const dz = point.z - cueBall.position.z;
  if (Math.hypot(dx, dz) < 1e-5) return fallback;
  return Math.atan2(dz, dx);
}

export function nudgeAngle(angle, deltaDegrees) {
  const delta = Number(deltaDegrees) * Math.PI / 180;
  let next = angle + (Number.isFinite(delta) ? delta : 0);
  while (next <= -Math.PI) next += Math.PI * 2;
  while (next > Math.PI) next -= Math.PI * 2;
  return next;
}
