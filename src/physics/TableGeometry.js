import { HALF_L, HALF_W, TABLE } from '../config/table.js';

export function createPockets() {
  const edge = 0.018;
  return [
    { id: 'tl', x: -HALF_L - edge, z: -HALF_W - edge, radius: TABLE.cornerPocketRadius },
    { id: 'tm', x: 0, z: -HALF_W - 0.015, radius: TABLE.middlePocketRadius },
    { id: 'tr', x: HALF_L + edge, z: -HALF_W - edge, radius: TABLE.cornerPocketRadius },
    { id: 'bl', x: -HALF_L - edge, z: HALF_W + edge, radius: TABLE.cornerPocketRadius },
    { id: 'bm', x: 0, z: HALF_W + 0.015, radius: TABLE.middlePocketRadius },
    { id: 'br', x: HALF_L + edge, z: HALF_W + edge, radius: TABLE.cornerPocketRadius },
  ];
}

export function createCushionSegments() {
  const cg = TABLE.cornerGap;
  const mg = TABLE.middleGap;
  return [
    { axis: 'z', value: -HALF_W, min: -HALF_L + cg, max: -mg, inward: 1 },
    { axis: 'z', value: -HALF_W, min: mg, max: HALF_L - cg, inward: 1 },
    { axis: 'z', value: HALF_W, min: -HALF_L + cg, max: -mg, inward: -1 },
    { axis: 'z', value: HALF_W, min: mg, max: HALF_L - cg, inward: -1 },
    { axis: 'x', value: -HALF_L, min: -HALF_W + cg, max: HALF_W - cg, inward: 1 },
    { axis: 'x', value: HALF_L, min: -HALF_W + cg, max: HALF_W - cg, inward: -1 },
  ];
}

export function createJaws() {
  const cg = TABLE.cornerGap;
  const mg = TABLE.middleGap;
  const r = TABLE.jawRadius;
  const points = [
    [-HALF_L + cg, -HALF_W], [-mg, -HALF_W], [mg, -HALF_W], [HALF_L - cg, -HALF_W],
    [-HALF_L + cg, HALF_W], [-mg, HALF_W], [mg, HALF_W], [HALF_L - cg, HALF_W],
    [-HALF_L, -HALF_W + cg], [-HALF_L, HALF_W - cg],
    [HALF_L, -HALF_W + cg], [HALF_L, HALF_W - cg],
  ];
  return points.map(([x,z], i) => ({ id: `jaw-${i}`, x, z, radius: r }));
}
