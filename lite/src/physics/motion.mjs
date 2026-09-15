import { BallState } from './Ball.mjs'
import {
  BALL_RADIUS,
  G,
  ROLLING_MU,
  SLIDING_MU,
  SPIN_DECAY,
} from './constants.mjs'
import { Vec3 } from './math.mjs'

const SLIDE_TO_ROLL_THRESHOLD = 0.025
const STOP_SPEED = 0.006
const STOP_SPIN = 0.18

function surfaceVelocity(ball) {
  // Velocity of the cloth-contact point: v + (up × omega) R.
  return new Vec3(
    ball.vel.x - ball.omega.y * BALL_RADIUS,
    ball.vel.y + ball.omega.x * BALL_RADIUS,
    0
  )
}

function forcePureRoll(ball) {
  // For rolling without slip: omega = up × v / R.
  ball.omega.x = -ball.vel.y / BALL_RADIUS
  ball.omega.y = ball.vel.x / BALL_RADIUS
}

function decayVerticalSpin(ball, dt) {
  const factor = Math.exp(-SPIN_DECAY * dt)
  ball.omega.z *= factor
}

function evolveSliding(ball, dt) {
  const slip = surfaceVelocity(ball)
  const slipSpeed = slip.length()

  if (slipSpeed < SLIDE_TO_ROLL_THRESHOLD) {
    ball.state = BallState.ROLLING
    forcePureRoll(ball)
    decayVerticalSpin(ball, dt)
    return
  }

  const dirX = slip.x / slipSpeed
  const dirY = slip.y / slipSpeed
  const a = SLIDING_MU * G

  ball.vel.x -= dirX * a * dt
  ball.vel.y -= dirY * a * dt

  // Solid-sphere friction torque at the cloth contact point.
  const angularA = ((5 / 2) * a) / BALL_RADIUS
  ball.omega.x += -dirY * angularA * dt
  ball.omega.y += dirX * angularA * dt

  decayVerticalSpin(ball, dt)
}

function evolveRolling(ball, dt) {
  const speed = Math.hypot(ball.vel.x, ball.vel.y)
  if (speed <= STOP_SPEED) {
    ball.vel.set(0, 0, 0)
    if (Math.abs(ball.omega.z) <= STOP_SPIN) {
      ball.stop()
      return
    }
  } else {
    const nextSpeed = Math.max(0, speed - ROLLING_MU * G * dt)
    const scale = speed > 0 ? nextSpeed / speed : 0
    ball.vel.x *= scale
    ball.vel.y *= scale
    forcePureRoll(ball)
  }

  decayVerticalSpin(ball, dt)

  if (
    Math.hypot(ball.vel.x, ball.vel.y) <= STOP_SPEED &&
    Math.abs(ball.omega.z) <= STOP_SPIN
  ) {
    ball.stop()
  }
}

export function advanceBall(ball, dt) {
  if (!ball.inMotion()) return

  const beforeX = ball.vel.x
  const beforeY = ball.vel.y

  if (ball.state === BallState.SLIDING) evolveSliding(ball, dt)
  else if (ball.state === BallState.ROLLING) evolveRolling(ball, dt)

  // Trapezoid integration is stable and deterministic at the fixed timestep.
  ball.pos.x += ((beforeX + ball.vel.x) * 0.5) * dt
  ball.pos.y += ((beforeY + ball.vel.y) * 0.5) * dt
}

export function contactSlipSpeed(ball) {
  return surfaceVelocity(ball).length()
}
