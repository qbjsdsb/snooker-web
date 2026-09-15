import {
  BALL_RADIUS,
  MAX_CUE_SPEED,
  MAX_SPIN_OFFSET,
} from './constants.mjs'
import { Vec3, clamp } from './math.mjs'

export function cueStrike({ angle, power, spinX = 0, spinY = 0 }) {
  const p = clamp(power, 0, 1)
  const sx = clamp(spinX, -MAX_SPIN_OFFSET, MAX_SPIN_OFFSET)
  const sy = clamp(spinY, -MAX_SPIN_OFFSET, MAX_SPIN_OFFSET)
  const offsetSq = sx * sx + sy * sy
  const speed = MAX_CUE_SPEED * Math.pow(p, 1.22) * (1 - 0.25 * offsetSq)

  const dir = new Vec3(Math.cos(angle), Math.sin(angle), 0)
  const right = new Vec3(-Math.sin(angle), Math.cos(angle), 0)
  const vel = dir.clone().scale(speed)

  // Solid-sphere cue impulse approximation. Positive spinY is top spin;
  // positive spinX is right-hand side from the player's view.
  const omega = right
    .clone()
    .scale(((5 / 2) * speed * sy) / BALL_RADIUS)
  omega.z += -((5 / 2) * speed * sx) / BALL_RADIUS

  return { vel, omega }
}
